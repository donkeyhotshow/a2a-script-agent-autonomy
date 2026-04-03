import fs from 'fs';
import path from 'path';

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
    let successCount = 0;
    let failureCount = 0;
    let skipCount = 0;

    // Process each task that hasn't been completed
    let encounteredServerUnavailable = false;
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

      // Save state between tasks
      this.saveState();
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

    // Print diagnostic summary if there were errors
    if (this.errorLog.length > 0) {
      this.printDiagnosticSummary();
    }

    if (encounteredServerUnavailable) {
      this.state.status = 'server-unavailable';
    } else if (taskFiles.length === 0 || successCount === 0 && failureCount === 0) {
      this.state.status = 'idle';
    } else {
      this.state.status = failureCount > 0 ? 'error' : 'completed';
    }
    this.state.currentTask = null;
    this.state.sessionId = null;
    this.saveState();
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
    // Start monitoring loop
    while (true) {
      try {
        cycleCount++;
        if (cycleCount % 30 === 0) {
          // Log status every 30 seconds (30 cycles of 1 second each)
          const activeCount = this.activeTasks.size;
          const completedCount = this.state.processedTasks.filter(t => t.status === 'completed').length;
          const failedCount = this.state.processedTasks.filter(t => t.status === 'failed').length;
          console.log(`\n[daemon status] Active: ${activeCount} | Completed: ${completedCount} | Failed: ${failedCount}`);
          if (typeof this.scanApplicationLogs === 'function' && typeof this.reportLogScanHits === 'function') {
            const logScan = this.scanApplicationLogs();
            if (logScan.hitCount > 0) this.reportLogScanHits(logScan.hits);
          }
        }

        await this.processNewTasks();
        await this.monitorActiveTasks();
        await this.cleanupCompletedTasks();
      } catch (error) {
        // Enhanced error logging for daemon cycle
        const classification = this.logError('daemon-cycle', error, 'daemon', {
          phase: 'monitoring-cycle',
          activeTasks: this.activeTasks.size
        });

        // Create hook document for daemon errors with classification info
        await this.createHookDocument(
          null,
          'daemon-cycle',
          'failed',
          `${classification.type}:${classification.subtype} - ${error.message}`,
          { stage: 'daemon-cycle', detail: classification.hint }
        );

        // If critical error, print diagnostic summary
        if (classification.severity === 'critical') {
          this.printDiagnosticSummary();
        }

        // Continue running despite errors
      }

      // Brief pause before next cycle
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async gracefulShutdown() {
    console.log('Saving state and waiting for active tasks...');
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    let lastCheck = 0;

    while (this.activeTasks.size > 0 && Date.now() - startTime < maxWaitTime) {
      const elapsed = Date.now() - startTime;
      if (elapsed - lastCheck > 5000) {
        // Log every 5 seconds
        console.log(`  Waiting... ${this.activeTasks.size} tasks still active (${Math.floor(elapsed / 1000)}s elapsed)`);
        lastCheck = elapsed;
      }

      await this.monitorActiveTasks();
      await this.cleanupCompletedTasks();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (this.activeTasks.size > 0) {
      console.warn(`\n  Force shutdown with ${this.activeTasks.size} tasks still active`);
    }

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