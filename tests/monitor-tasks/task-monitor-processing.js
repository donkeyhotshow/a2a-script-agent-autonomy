import fs from 'fs';
import path from 'path';
import axios from 'axios';

class TaskMonitorProcessing {
  async getTaskFiles() {
    try {
      const files = fs.readdirSync(this.tasksDir);
      return files
        .filter(file => file.endsWith('.md'))
        .map(file => ({
          name: file,
          path: path.join(this.tasksDir, file),
          content: fs.readFileSync(path.join(this.tasksDir, file), 'utf8')
        }));
    } catch (error) {
      this.logError('getTaskFiles', error);
      return [];
    }
  }

  async processTask(taskFile) {
    console.log(`Processing task: ${taskFile.name}`);

    // Extract the task description from the file
    const taskDescription = this.extractTaskDescription(taskFile.content);
    if (!taskDescription) {
      console.warn(`Could not extract task description from ${taskFile.name}`);
      this.recordProcessedTask(taskFile.name, 'failed', 'Could not extract task description');
      return false;
    }

    let success = false;
    let failureReason = null;
    let session = null;
    let nextResult = null;
    let abortDueToServer = false;
    let lastAsyncResult = null;

    try {
      session = await this.createSession(taskDescription);
      if (!session) {
        console.error(`Failed to create session for task ${taskFile.name}`);
        failureReason = 'Session creation failed';
        return false;
      }

      this.state.sessionId = session.id;
      this.state.currentTask = taskFile.name;
      this.state.status = 'processing';
      this.saveState();
      this.logHardBit({ phase: 'session-start', detail: 'session created with task' });
      await this.logAgentExecution(session.id, 'after-session-create');

      // Session was created with task in context
      // Server may need explicit routing input; try with task field first
      nextResult = await this.sendNext(session.id, { task: taskDescription });
      if (!nextResult || nextResult.error) {
        // Fallback: send as message in result payload
        console.log('Initial task send failed, retrying with result.message');
        nextResult = await this.sendNext(session.id, { result: { message: taskDescription } });
      }
      if (!nextResult) {
        console.error(`Failed to send initial next for task ${taskFile.name}`);
        failureReason = 'Initial next failed';
        return false;
      }
      this.logHardBit({
        phase: 'initial-next',
        detail: `sent task input (message/task)`,
        serverBusy: true
      });
      await this.logAgentExecution(session.id, 'after-initial-next');

      // Poll for completion using configurable settings
      const maxAttempts = this.maxPollAttempts;
      const pollInterval = this.pollIntervalMs;
      const startTime = Date.now();
      let attempts = 0;

      while (attempts < maxAttempts) {
        // Check overall timeout
        if (Date.now() - startTime > this.pollTimeoutMs) {
          console.error(`Poll timeout exceeded (${this.pollTimeoutMs}ms)`);
          break;
        }

        const asyncResult = await this.pollAsync(session.id);
        lastAsyncResult = asyncResult;
        if (!asyncResult) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
        // Check asyncPending to determine if still waiting for LLM
        const isAsyncPending = asyncResult.asyncPending === true || asyncResult.status === 'processing';
        const isCompleted = asyncResult.completed === true || asyncResult.status === 'completed';
        const hasPromiseId = asyncResult.result?.promiseId || asyncResult.execute?.promiseId;
        await this.describeAsyncResult(asyncResult, isAsyncPending);

        // If still processing (asyncPending is true), wait more
        if (isAsyncPending) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }

        // If we have an active promise but task not yet completed, continue polling
        if (hasPromiseId && !isCompleted) {
          console.log(`Waiting on promise ${hasPromiseId} to complete...`);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }

        // If completed, get the session state to check for any form/choices
        if (isCompleted) {
          const sessionData = await this.getSession(session.id);
          const validation = this.validateSessionResponse(sessionData);
          if (!validation.valid) {
            console.warn(`Session response validation failed: ${validation.error}`);
            // Continue processing, but log
          }

          // Check if there's a form with choices that needs user input
          const form = sessionData?.context?.execution?.form || sessionData?.execute?.form;
          if (form && form.choices && form.choices.length > 0) {
            const choiceId = form.choices[0].id;
            nextResult = await this.sendNext(session.id, { result: { choice: choiceId } });
            if (!nextResult) {
              console.error(`Failed to send choice for task ${taskFile.name}`);
              failureReason = 'Router choice failed';
              return false;
            }
            this.logHardBit({
              phase: 'router-choice',
              detail: `auto-picked ${choiceId}`,
              serverBusy: true
            });
            await this.logAgentExecution(session.id, 'after-router-choice');
            // Poll again after sending choice
            continue;
          }

          // Check if we have a result
          const result = sessionData?.context?.result || sessionData?.result;
          if (result) {
            console.log(`Task ${taskFile.name} completed with result:`, result);

            await this.markTaskAsCompleted(taskFile.name);
            success = true;
            return true;
          }
        }

        // Unknown state, wait a bit
        attempts++;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      let timeoutStageInfo = null;
      if (session) {
        timeoutStageInfo = await this.describeTaskStage(session.id, lastAsyncResult);
      }
      const stageSummary = timeoutStageInfo ? ` stage=${timeoutStageInfo.stage}` : '';
      const detailSummary = timeoutStageInfo ? ` detail=${timeoutStageInfo.detail}` : '';
      const timeoutSeconds = Math.round((Date.now() - startTime) / 1000);
      console.error(
        `Task ${taskFile.name} timed out after ${timeoutSeconds}s${stageSummary}${detailSummary}`
      );
      failureReason = `Timed out after ${timeoutSeconds}s${timeoutStageInfo ? ` (${timeoutStageInfo.stage})` : ''}`;
      return false;
    } catch (error) {
      if (error instanceof ServerUnavailableError) {
        abortDueToServer = true;
        this.state.status = 'server-unavailable';
        this.saveState();
        throw error;
      }

      // Enhanced error logging with session context
      const extraContext = {
        sessionId: session?.id,
        phase: 'task-processing',
        attempts: attempts,
        lastAsyncResult: lastAsyncResult ? {
          status: lastAsyncResult.status,
          asyncPending: lastAsyncResult.asyncPending,
          hasPromiseId: !!(lastAsyncResult.result?.promiseId || lastAsyncResult.execute?.promiseId)
        } : null
      };
      const classification = this.logError('processTask', error, taskFile.name, extraContext);

      // If we have a session, run deep inspection for better diagnostics
      if (session?.id && classification.severity === 'high' || classification.severity === 'critical') {
        console.log(`\n🔍 Running deep session inspection for failed task...`);
        const inspection = await this.inspectSessionForErrors(session.id);
        this.printSessionInspection(inspection);

        // Add inspection summary to failure reason
        if (inspection.issues && inspection.issues.length > 0) {
          failureReason = `${classification.type}:${classification.subtype} - ` +
            `Session issues: ${inspection.issues.map(i => i.type).join(', ')}`;
        } else {
          failureReason = `${classification.type}:${classification.subtype} - ${error.message || 'Unexpected error'}`;
        }
      } else {
        failureReason = `${classification.type}:${classification.subtype} - ${error.message || 'Unexpected error'}`;
      }

      return false;
    } finally {
      if (!abortDueToServer) {
        this.recordProcessedTask(taskFile.name, success ? 'completed' : 'failed', success ? null : failureReason);
        this.state.status = 'idle';
      }
      this.state.sessionId = null;
      this.state.currentTask = null;
      this.saveState();
    }
  }

  async processNewTasks() {
    const taskFiles = await this.getTaskFiles();
    if (taskFiles.length === 0) {
      return;
    }

    // Only start new tasks if no active tasks are running
    if (this.activeTasks.size > 0) {
      return;
    }

    // Start only the first available task to avoid flooding
    for (const taskFile of taskFiles) {
      // Skip if already active or completed
      if (this.activeTasks.has(taskFile.name) ||
          taskFile.content.includes('[X] Completed') ||
          taskFile.content.includes('## Completion') && taskFile.content.includes('Completed')) {
        continue;
      }

      try {
        // Start processing this task
        const taskDescription = this.extractTaskDescription(taskFile.content);
        if (!taskDescription) {
          console.warn(`Could not extract task description from ${taskFile.name}`);
          continue;
        }

        const session = await this.createSession(taskDescription);
        if (!session) {
          console.error(`Failed to create session for task ${taskFile.name}`);
          await this.createHookDocument(null, taskFile.name, 'failed', 'Session creation failed');
          continue;
        }

        // Add to active tasks
        this.activeTasks.set(taskFile.name, {
          sessionId: session.id,
          taskName: taskFile.name,
          startedAt: new Date().toISOString(),
          lastPolled: new Date().toISOString(),
          status: 'processing'
        });

        this.state.currentTask = taskFile.name;
        this.state.sessionId = session.id;
        this.state.status = 'processing';
        this.saveState();

        console.log(`Started monitoring task: ${taskFile.name} (session: ${session.id})`);

        // Stop after starting one task to avoid flooding
        return;

      } catch (error) {
        // Enhanced error logging for task start failures
        const classification = this.logError('processNewTasks', error, taskFile.name, {
          phase: 'task-start'
        });

        await this.createHookDocument(
          null,
          taskFile.name,
          'failed',
          `${classification.type}:${classification.subtype} - ${error.message}`,
          { stage: 'task-start', detail: classification.hint }
        );
      }
    }
  }

  async monitorActiveTasks() {
    const activeSessions = Array.from(this.activeTasks.keys());

    for (const taskName of activeSessions) {
      try {
        const taskMeta = this.activeTasks.get(taskName);
        const sessionId = taskMeta.sessionId;

        const asyncResult = await this.pollAsync(sessionId);
        if (!asyncResult) continue;

        taskMeta.lastPolled = new Date().toISOString();
        const isCompleted = this.checkTaskCompletion(asyncResult);
        const isTimeout = this.isTaskTimeout(taskMeta);

        if (isCompleted) {
          await this.handleTaskCompletion(taskName, taskMeta, asyncResult);
        } else if (isTimeout) {
          await this.handleTaskTimeout(taskName, taskMeta, asyncResult);
        }
      } catch (error) {
        // Enhanced error logging for task monitoring
        this.logError('monitorActiveTasks', error, taskName, {
          sessionId: taskMeta?.sessionId,
          taskStatus: taskMeta?.status
        });
      }
    }
  }

  checkTaskCompletion(asyncResult) {
    const isAsyncPending = asyncResult.asyncPending === true || asyncResult.status === 'processing';
    const isCompleted = asyncResult.completed === true || asyncResult.status === 'completed';
    const hasPromiseId = asyncResult.result?.promiseId || asyncResult.execute?.promiseId;

    // Task is completed if not pending and not waiting on promise
    return !isAsyncPending && (!hasPromiseId || isCompleted);
  }

  isTaskTimeout(taskMeta) {
    const now = new Date();
    const startedAt = new Date(taskMeta.startedAt);
    const elapsedMinutes = (now - startedAt) / (1000 * 60);
    return elapsedMinutes > 5; // 5 minute timeout
  }

  async handleTaskCompletion(taskName, taskMeta, asyncResult) {
    const stageInfo = await this.describeTaskStage(taskMeta.sessionId, asyncResult);
    console.log(`Task ${taskName} completed (stage=${stageInfo.stage})`);

    // Get final session state to check for results
    const sessionData = await this.getSession(taskMeta.sessionId);
    const result = sessionData?.context?.result || sessionData?.result;

    if (result) {
      console.log(`Task ${taskName} completed with result:`, result);

      await this.markTaskAsCompleted(taskName);
      await this.createCompletionReport(taskMeta.sessionId, taskName, result);
    } else {
      console.warn(
        `Task ${taskName} completed but no result found (stage=${stageInfo.stage} detail=${stageInfo.detail})`
      );
      await this.createHookDocument(
        taskMeta.sessionId,
        taskName,
        'failed',
        'No result in completed session',
        stageInfo
      );
    }

    // Remove from active tasks
    this.activeTasks.delete(taskName);
    this.saveState();
  }

  async handleTaskTimeout(taskName, taskMeta, asyncResult) {
    const stageInfo = await this.describeTaskStage(taskMeta.sessionId, asyncResult);
    console.error(
      `Task ${taskName} timed out after 5 minutes (stage=${stageInfo.stage} detail=${stageInfo.detail})`
    );

    await this.createHookDocument(
      taskMeta.sessionId,
      taskName,
      'timeout',
      'Task timed out after 5 minutes',
      stageInfo
    );

    // Remove from active tasks
    this.activeTasks.delete(taskName);
    this.saveState();
  }

  async cleanupCompletedTasks() {
    // Clean up any stale tasks (optional - activeTasks should be managed properly)
    const now = new Date();
    for (const [taskName, taskMeta] of this.activeTasks.entries()) {
      const lastPolled = new Date(taskMeta.lastPolled);
      const minutesSincePoll = (now - lastPolled) / (1000 * 60);

      // Remove tasks that haven't been polled in 10 minutes (indicates an error)
      if (minutesSincePoll > 10) {
        console.warn(`Removing stale task ${taskName} from active monitoring`);
        this.activeTasks.delete(taskName);
      }
    }
  }

  async markTaskAsCompleted(taskName) {
    const taskFilePath = path.join(this.tasksDir, taskName);
    try {
      let content = fs.readFileSync(taskFilePath, 'utf8');

      // Add completion marker if not already present
      if (!content.includes('## Completion')) {
        content += '\n\n## Completion\n\n[X] Completed\n';
        fs.writeFileSync(taskFilePath, content);
        console.log(`Marked task ${taskName} as completed`);
      } else {
        // Update existing completion marker
        content = content.replace(/## Completion[\s\S]*?(?=##|$)/, '## Completion\n\n[X] Completed\n');
        fs.writeFileSync(taskFilePath, content);
        console.log(`Updated completion status for task ${taskName}`);
      }
    } catch (error) {
      console.error(`Error marking task ${taskName} as completed:`, error.message);
    }
  }
}

export { TaskMonitorProcessing };