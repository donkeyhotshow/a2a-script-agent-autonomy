import fs from 'fs';
import path from 'path';
import { ServerUnavailableError } from './errors.js';

class TaskMonitorDaemon {
  async run() {
    console.log('Starting task monitor in sequential mode...');

    this.resetStateForFreshRun();

    // Run initial health check
    const initialHealth = await this.healthCheck();
    if (!initialHealth.allOk) {
      console.error('Initial health check failed:', initialHealth.details);
      this.state.status = 'health-check-failed';
      this.saveState();
      this.writeRunArtifact({
        mode: 'once',
        finalStage: this.state.status,
        sessionId: this.state.sessionId || null,
        rootCauseClass: 'health-check',
        nextAction: 'fix service health and rerun monitor:once',
      });
      return;
    }
    console.log('Initial health check passed');

    await this.promptPromiseManualGateIfNeeded();

    // Verify we can connect to the system
    const projects = await this.getProjects();
    if (projects.length === 0) {
      console.error('Could not connect to a2a system. Make sure it\'s running.');
      return;
    }

    console.log(`Connected to projects: ${projects.map(p => p.name).join(', ')}`);

    // Get task files
    const taskFiles = await this.getTaskFiles();
    if (taskFiles.length === 0) {
      console.error('No task files found in prompts-to-agent-mode directory.');
      console.error(
        [
          '',
          'Self-upgrade protocol reminder:',
          '  - Engineering specs live in tasks/*.md and tasks/pending/.',
          '  - Stack-queue prompts live in prompts-to-agent-mode/ (this monitor reads them).',
          '  - When the engineering queue is empty, the next step is NOT to stop,',
          '    but to drive the stack via the Client API or this monitor, then write',
          '    concrete follow-up work back into tasks/ and DEV_STATE.',
          '',
          'See tasks/README.md → "Self-Upgrade order (policy)" for the full loop,',
          'and docs/OPERATOR-CURL.md for direct Client API examples.'
        ].join('\n')
      );
      this.state.status = 'idle';
      this.saveState();
      return;
    }

    console.log(`Found ${taskFiles.length} task files`);
    if (this.maxTasksPerRun > 0) {
      console.log(
        `TASK_MONITOR_MAX_TASKS_PER_RUN=${this.maxTasksPerRun} — will stop after that many non-skipped task(s) this run.`
      );
    }
    let successCount = 0;
    let failureCount = 0;
    let skipCount = 0;

    // Process each task that hasn't been completed
    let encounteredServerUnavailable = false;
    let tasksExecutedThisRun = 0;
    for (const taskFile of taskFiles) {
      // Check if task is already marked as completed
      if (taskFile.content.includes('[X] Completed') ||
          taskFile.content.includes('## Completion') &&
          taskFile.content.includes('Completed')) {
        console.log(`Skipping already completed task: ${taskFile.name}`);
        skipCount++;
        continue;
      }

      // Process the task
      let success = false;
      try {
        success = await this.processTask(taskFile);
      } catch (error) {
        if (error instanceof ServerUnavailableError) {
          console.error('A2A server unavailable; pausing task processing.');
          encounteredServerUnavailable = true;
          break;
        }
        console.log(`Failed to process task: ${taskFile.name}`);
        failureCount++;
        tasksExecutedThisRun++;
        this.saveState();
        if (this.maxTasksPerRun > 0 && tasksExecutedThisRun >= this.maxTasksPerRun) {
          console.log(
            `Stopping after ${tasksExecutedThisRun} executed task(s) (TASK_MONITOR_MAX_TASKS_PER_RUN=${this.maxTasksPerRun}). Re-run for the next prompt.`
          );
          break;
        }
        continue;
      }
      if (success) {
        console.log(`Successfully processed task: ${taskFile.name}`);
        successCount++;
      } else {
        console.log(`Failed to process task: ${taskFile.name}`);
        failureCount++;
        // Continue with other tasks even if one fails
      }
      tasksExecutedThisRun++;

      // Save state between tasks
      this.saveState();
      if (this.maxTasksPerRun > 0 && tasksExecutedThisRun >= this.maxTasksPerRun) {
        console.log(
          `Stopping after ${tasksExecutedThisRun} executed task(s) (TASK_MONITOR_MAX_TASKS_PER_RUN=${this.maxTasksPerRun}). Re-run for the next prompt.`
        );
        break;
      }
    }

    // Run final health check
    const finalHealth = await this.healthCheck();
    if (!finalHealth.allOk) {
      console.error('Final health check failed:', finalHealth.details);
      this.state.status = 'final-health-check-failed';
    } else {
      console.log('Final health check passed');
    }

    // Validate final report state
    const reportValidation = this.validateReportState();
    if (!reportValidation.hasData) {
      console.warn('Report file has no data after processing');
      this.state.status = 'no-report-data';
    } else {
      console.log('Report file validation passed');
    }

    console.log(`Task processing complete (${successCount} succeeded, ${failureCount} failed, ${skipCount} skipped).`);

    this.logCompletedSessionsSummary();

    // Print diagnostic summary if there were errors
    if (this.errorLog.length > 0) {
      this.printDiagnosticSummary();
    }

    if (encounteredServerUnavailable) {
      this.state.status = 'server-unavailable';
    } else if (taskFiles.length === 0 || (successCount === 0 && failureCount === 0)) {
      this.state.status = 'idle';
    } else if (failureCount > 0) {
      this.state.status = this.state.sessionId ? 'processing' : 'error';
    } else {
      this.state.status = 'completed';
    }
    // sessionId / currentTask: leave as set by processTask (kept on failure for resume via state file)
    this.saveState();
    const failed = (this.state.processedTasks || []).find((t) => t.status === 'failed');
    const rootCauseClass =
      this.errorLog[0]?.type ||
      (failed?.detail ? String(failed.detail).split(':')[0].slice(0, 80) : null) ||
      (this.state.status === 'completed' ? 'none' : 'monitor-failure');
    const nextAction =
      this.state.status === 'completed'
        ? 'none'
        : this.state.status === 'server-unavailable'
          ? 'restore server availability and rerun with resume'
          : 'inspect monitor artifact and retry task with deterministic resume policy';
    this.writeRunArtifact({
      mode: 'once',
      finalStage: this.state.status,
      sessionId: this.state.sessionId || null,
      rootCauseClass,
      nextAction,
    });
  }

  async runDaemon() {
    console.log('Starting daemon monitoring mode...');

    // Check for existing hook documents
    this.checkExistingHooks();

    this.resetStateForFreshRun();

    // Run initial health check
    const initialHealth = await this.healthCheck();
    if (!initialHealth.allOk) {
      console.error('Initial health check failed:', initialHealth.details);
      this.state.status = 'health-check-failed';
      this.saveState();
      return;
    }
    console.log('Initial health check passed');

    await this.promptPromiseManualGateIfNeeded();

    // Verify we can connect to the system
    const projects = await this.getProjects();
    if (projects.length === 0) {
      console.error('Could not connect to a2a system. Make sure it\'s running.');
      return;
    }

    console.log(`Connected to projects: ${projects.map(p => p.name).join(', ')}`);
    console.log('Daemon monitor is running. Press Ctrl+C to stop.\n');

    // Setup graceful shutdown
    const shutdownHandler = async () => {
      console.log('\n\nShutting down daemon monitor gracefully...');
      await this.gracefulShutdown();
      process.exit(0);
    };
    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);

    let cycleCount = 0;
    // INVARIANT: one incomplete prompt per iteration — await processTask until it returns; no second prompt in parallel.
    // Inside processTask: one Client API session for that file until terminal completion (async-only /next + /async).
    while (true) {
      try {
        cycleCount++;
        if (cycleCount % 30 === 0) {
          const completedCount = this.state.processedTasks.filter(t => t.status === 'completed').length;
          const failedCount = this.state.processedTasks.filter(t => t.status === 'failed').length;
          console.log(
            `\n[daemon status] sequential-async (one session) | Completed: ${completedCount} | Failed: ${failedCount}`
          );
          if (typeof this.scanApplicationLogs === 'function' && typeof this.reportLogScanHits === 'function') {
            const logScan = this.scanApplicationLogs();
            if (logScan.hitCount > 0) this.reportLogScanHits(logScan.hits);
          }
          if (process.env.TASK_MONITOR_HUB_PROBE_DAEMON_STATUS === '1') {
            await this.logHubPromiseQueueSnapshot();
          }
        }

        const taskFiles = await this.getTaskFiles();
        let nextTask = null;
        for (const tf of taskFiles) {
          const done =
            tf.content.includes('[X] Completed') ||
            (tf.content.includes('## Completion') && tf.content.includes('Completed'));
          if (!done) {
            nextTask = tf;
            break;
          }
        }

        if (!nextTask) {
          this.state.status = 'idle';
          this.state.currentTask = null;
          this.state.sessionId = null;
          this.saveState();
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        try {
          await this.processTask(nextTask);
        } catch (error) {
          if (error instanceof ServerUnavailableError) {
            console.error('A2A server unavailable; backing off before retry...');
            this.state.status = 'server-unavailable';
            this.saveState();
            await new Promise((r) => setTimeout(r, 15000));
            continue;
          }
          const classification = this.logError('daemon-sequential-task', error, nextTask.name, {
            phase: 'processTask',
          });
          await this.createHookDocument(
            null,
            nextTask.name,
            'failed',
            `${classification.type}:${classification.subtype} - ${error.message}`,
            { stage: 'daemon-sequential-task', detail: classification.hint }
          );
          if (classification.severity === 'critical') {
            this.printDiagnosticSummary();
          }
        }
      } catch (error) {
        const classification = this.logError('daemon-cycle', error, 'daemon', {
          phase: 'monitoring-cycle',
        });
        await this.createHookDocument(
          null,
          'daemon-cycle',
          'failed',
          `${classification.type}:${classification.subtype} - ${error.message}`,
          { stage: 'daemon-cycle', detail: classification.hint }
        );
        if (classification.severity === 'critical') {
          this.printDiagnosticSummary();
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  async gracefulShutdown() {
    console.log('Saving daemon state (sequential mode — no parallel session drain)...');
    this.activeTasks.clear();
    this.state.activeTasks = {};

    // Final state save
    this.state.status = 'daemon-shutdown';
    this.state.lastChecked = new Date().toISOString();
    this.saveState();

    // Print final summary
    const completedCount = this.state.processedTasks.filter(t => t.status === 'completed').length;
    const failedCount = this.state.processedTasks.filter(t => t.status === 'failed').length;
    const totalCount = this.state.processedTasks.length;
    console.log('\nDaemon monitor shutdown complete');
    console.log(`Final stats: ${totalCount} tasks processed (${completedCount} completed, ${failedCount} failed)`);
  }

  checkExistingHooks() {
    const hookPath = path.join(this.hooksDir, 'task_monitor_issue.json');
    try {
      if (fs.existsSync(hookPath)) {
        const data = fs.readFileSync(hookPath, 'utf8');
        const hookDoc = JSON.parse(data);
        if (hookDoc.errors && hookDoc.errors.length > 0) {
          console.log(`\nFound existing hook document with ${hookDoc.errors.length} error(s):`);
          hookDoc.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.taskName}: ${error.status} - ${error.error || 'No error message'}`);
          });
          console.log(`  Last updated: ${hookDoc.lastUpdated}\n`);
        }
      }
    } catch (error) {
      console.warn(`Could not check existing hooks: ${error.message}`);
    }
  }
}

export { TaskMonitorDaemon };