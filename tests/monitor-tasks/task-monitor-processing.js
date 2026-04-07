import fs from 'fs';
import path from 'path';

class TaskMonitorProcessing {
  /**
   * Submit router choice or re-send task text when the UI shows a text "task" form (idle beat).
   * Router forms with `form.choices` never auto-advance — operator must POST /next with result.choice.
   * @param {string} sessionId - Session identifier
   * @param {string} taskDescription - Task description for analysis
   * @param {Object} preloadedSession - Optional preloaded session data
   * @returns {boolean} true if a /next was sent, false otherwise
   */
  async tryAdvanceMonitorGate(sessionId, taskDescription, preloadedSession = null, _options = {}) {
    const sessionData =
      preloadedSession || (await this.getSession(sessionId, { includeContext: true }));
    if (!sessionData) return false;

    const form =
      sessionData?.context?.execution?.form ||
      sessionData?.execute?.form ||
      null;
    if (!form) return false;

    const choices = Array.isArray(form.choices) ? form.choices : [];
    if (choices.length > 0) {
      const autoOff = /^(0|false|no)$/i.test(
        String(process.env.TASK_MONITOR_ROUTER_AUTO_AGENT ?? '1').trim()
      );
      if (!autoOff) {
        const agentRow = choices.find(
          (c) =>
            c &&
            (c.id === 'agent' || String(c.type || '').toLowerCase() === 'agent')
        );
        const choiceId = agentRow?.id;
        if (choiceId) {
          const res = await this.sendNext(sessionId, { task: choiceId });
          if (res) {
            console.log(
              `Router step for session ${sessionId}: auto-selected choice "${choiceId}"`
            );
            return true;
          }
        }
      }
      console.log(
        `Router step for session ${sessionId}: manual choice required (monitor does not auto-select)`
      );
      return false;
    }

    // Handle text input forms (task input fields)
    const inputs = Array.isArray(form.input) ? form.input : [];
    const hasTaskField = inputs.some(
      (i) => i && (i.name === 'task' || (i.type === 'text' && !i.name))
    );
    const text = typeof taskDescription === 'string' ? taskDescription.trim() : '';
    if (hasTaskField && text) {
      const res = await this.sendNext(sessionId, { result: { message: text } });
      return !!res;
    }

    return false;
  }

  async readTaskDescriptionForName(taskName) {
    const taskFilePath = path.join(this.tasksDir, taskName);
    try {
      const content = fs.readFileSync(taskFilePath, 'utf8');
      return this.extractTaskDescription(content);
    } catch {
      return null;
    }
  }
  async getTaskFiles() {
    try {
      const skipNames = new Set(['README.md', 'ONE-PIPELINE.md', 'STACK-RUN.md']);
      if (this.taskListPath && fs.existsSync(this.taskListPath)) {
        const lines = fs.readFileSync(this.taskListPath, 'utf8').split(/\r?\n/);
        const names = lines.map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
        const out = [];
        for (const raw of names) {
          const file = raw.endsWith('.md') ? raw : `${raw}.md`;
          if (skipNames.has(file)) continue;
          const full = path.join(this.tasksDir, path.basename(file));
          if (!fs.existsSync(full)) {
            this.log('warn', `[task-monitor] TASK_MONITOR_TASK_LIST: missing ${file}, skipping`);
            continue;
          }
          out.push({
            name: path.basename(full),
            path: full,
            content: fs.readFileSync(full, 'utf8'),
          });
        }
        return out;
      }
      const files = fs
        .readdirSync(this.tasksDir)
        .filter((file) => file.endsWith('.md') && !skipNames.has(file))
        .sort((a, b) => a.localeCompare(b, 'en'));
      return files.map((file) => ({
        name: file,
        path: path.join(this.tasksDir, file),
        content: fs.readFileSync(path.join(this.tasksDir, file), 'utf8'),
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
      const resumeOn =
        !/^(0|false|no)$/i.test(String(process.env.TASK_MONITOR_RESUME ?? '1').trim());
      let resumed = false;

      if (
        resumeOn &&
        this.state.sessionId &&
        this.state.currentTask === taskFile.name
      ) {
        const existing = await this.getSession(this.state.sessionId);
        if (existing && typeof existing === 'object') {
          const sid = existing.id || this.state.sessionId;
          session = { id: sid };
          resumed = true;
          this.state.sessionId = sid;
          this.state.currentTask = taskFile.name;
          this.state.status = 'processing';
          this.saveState();
          console.log(
            `[task-monitor] Resuming session ${sid} from state file (${path.basename(this.stateFile)}) for ${taskFile.name}`
          );
          this.logHardBit({ phase: 'session-resume', detail: 'reused sessionId from state' });
          await this.logAgentExecution(session.id, 'after-session-resume');
        } else {
          this.log(
            'warn',
            `State session ${this.state.sessionId} not found on Client API — creating a new session`
          );
          this.state.sessionId = null;
          this.state.currentTask = null;
          this.saveState();
        }
      }

      if (!session) {
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
      }

      let idleGateAttempts = 0;
      let routerStuckExit = false;
      if (await this.tryAdvanceMonitorGate(session.id, taskDescription, null)) {
        idleGateAttempts += 1;
        await this.logAgentExecution(session.id, 'after-initial-monitor-gate');
      }

      // Poll for completion: wall clock (`pollTimeoutMs`) is authoritative. `maxPollAttempts` alone
      // used to cap ~60×5s≈5m while `.env` could set 10m+ — raise the attempt ceiling to match timeout.
      const pollInterval = Math.max(1, this.pollIntervalMs);
      const attemptCeiling = Math.max(
        this.maxPollAttempts,
        Math.ceil(this.pollTimeoutMs / pollInterval) + 100
      );
      const startTime = Date.now();
      let attempts = 0;
      let idleToolLoopHits = 0;
      let lastStallKey = null;
      let stallHits = 0;
      let agentToolPhaseStart = null;

      while (attempts < attemptCeiling) {
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
        // Treat `pending` like processing — otherwise we fall through and reset stall counters when the hub flips pending/processing.
        const isAsyncPending =
          asyncResult.asyncPending === true ||
          asyncResult.status === 'processing' ||
          asyncResult.status === 'pending';
        const isCompleted =
          asyncResult.completed === true ||
          asyncResult.status === 'completed' ||
          asyncResult.status === 'idle';
        const hasPromiseId = asyncResult.result?.promiseId || asyncResult.execute?.promiseId;
        await this.describeAsyncResult(asyncResult, isAsyncPending);

        const stepNow =
          asyncResult?.context?.execution?.step ||
          asyncResult?.execute?.step ||
          null;
        const actionNow =
          asyncResult?.context?.execution?.action ||
          asyncResult?.execute?.action ||
          null;

        // Wall clock: agent may bounce between tool_read_file / tool_list_directory — step-based stall never trips.
        const inAgentToolWait =
          isAsyncPending &&
          actionNow === 'agent' &&
          stepNow &&
          String(stepNow).startsWith('tool_');
        if (this.agentToolStallMs > 0 && inAgentToolWait) {
          if (agentToolPhaseStart == null) agentToolPhaseStart = Date.now();
          else if (Date.now() - agentToolPhaseStart >= this.agentToolStallMs) {
            failureReason = `Agent tool phase exceeded TASK_MONITOR_AGENT_TOOL_STALL_MS (${this.agentToolStallMs}ms) at step=${stepNow}`;
            break;
          }
        } else {
          agentToolPhaseStart = null;
        }

        // Stagnation: one key for all agent tool_* steps so switching tools does not reset the counter.
        let stallKey = null;
        if (isAsyncPending && stepNow) {
          if (actionNow === 'agent' && String(stepNow).startsWith('tool_')) {
            stallKey = 'agent_tool_phase';
          } else {
            stallKey = String(stepNow);
          }
        }
        if (stallKey) {
          if (stallKey === lastStallKey) {
            stallHits += 1;
          } else {
            lastStallKey = stallKey;
            stallHits = 1;
          }
          if (this.stallPolls > 0 && stallHits >= this.stallPolls) {
            failureReason = `Stalled async loop: key=${stallKey} repeated ${stallHits} busy polls (step=${stepNow})`;
            break;
          }
        } else {
          lastStallKey = null;
          stallHits = 0;
        }

        if (!isAsyncPending && idleGateAttempts < 5) {
          const sd = await this.getSession(session.id, { includeContext: true });
          const progressed = await this.tryAdvanceMonitorGate(session.id, taskDescription, sd);
          if (progressed) {
            idleGateAttempts += 1;
            this.logHardBit({
              phase: 'monitor-gate',
              detail: `advanced (${idleGateAttempts})`,
              serverBusy: true,
            });
            await this.logAgentExecution(session.id, 'after-monitor-gate');
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            continue;
          }
          const gateForm =
            sd?.context?.execution?.form || sd?.execute?.form;
          const routerChoices = Array.isArray(gateForm?.choices) ? gateForm.choices : [];
          if (routerChoices.length > 0) {
            idleGateAttempts += 1;
            if (idleGateAttempts >= 5) {
              failureReason =
                'Router requires manual choice (no auto-advance after 5 idle polls)';
              routerStuckExit = true;
              break;
            }
          }
        }

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

          // Check if we have a result
          const result = sessionData?.context?.result || sessionData?.result;
          if (result) {
            console.log(`Task ${taskFile.name} completed with result:`, result);

            await this.markTaskAsCompleted(taskFile.name);
            success = true;
            return true;
          }

          // Agent terminal beat: step completed with execute.message only (no separate result object)
          const execStep = sessionData?.context?.execution?.step;
          const execAction = sessionData?.context?.execution?.action;
          const finalMsg =
            (sessionData?.execute && typeof sessionData.execute.message === 'string'
              ? sessionData.execute.message
              : null) ||
            (sessionData?.context?.execution &&
            typeof sessionData.context.execution.message === 'string'
              ? sessionData.context.execution.message
              : null);
          if (
            execAction === 'agent' &&
            execStep === 'completed' &&
            finalMsg &&
            finalMsg.trim()
          ) {
            console.log(
              `Task ${taskFile.name} completed (agent step=completed, final message present)`
            );
            await this.markTaskAsCompleted(taskFile.name);
            success = true;
            return true;
          }

          // Guard: agent/tool loop can settle to idle repeatedly at tool_run_script
          // without producing terminal result; fail fast with clear diagnosis.
          const step = sessionData?.context?.execution?.step || sessionData?.execute?.step;
          const action = sessionData?.context?.execution?.action;
          const asyncStatus = asyncResult?.status;
          if (action === 'agent' && step === 'tool_run_script' && (asyncStatus === 'idle' || asyncStatus === 'completed')) {
            idleToolLoopHits += 1;
            if (idleToolLoopHits >= 3) {
              failureReason = 'Agent loop detected: repeated idle at step=tool_run_script with no terminal result';
              break;
            }
          } else {
            idleToolLoopHits = 0;
          }
        }

        // Unknown state, wait a bit
        attempts++;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      if (routerStuckExit) {
        console.error(`Task ${taskFile.name} aborted: ${failureReason}`);
        return false;
      }

      if (failureReason) {
        console.error(`Task ${taskFile.name} failed: ${failureReason}`);
        return false;
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
      if (session?.id && (classification.severity === 'high' || classification.severity === 'critical')) {
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
      }
      if (success) {
        this.state.status = 'idle';
        this.state.sessionId = null;
        this.state.currentTask = null;
      } else if (!abortDueToServer) {
        // Do not keep sessionId after failure — resume would re-enter terminal/bad execute (e.g. validation loop).
        this.state.status = 'idle';
        this.state.sessionId = null;
        this.state.currentTask = null;
      }
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
          taskDescription,
          startedAt: new Date().toISOString(),
          lastPolled: new Date().toISOString(),
          status: 'processing',
          gateAttempts: 0,
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

        let isCompleted = this.checkTaskCompletion(asyncResult);
        // Client GET /sessions/:id/async uses an idle envelope { completed: true, status: 'idle' }
        // whenever there is no in-flight promise — including router/forms waiting for /next.
        // Without this guard the daemon drops the task and processNewTasks() spams new sessions.
        if (isCompleted && asyncResult.status === 'idle') {
          const sd = await this.getSession(sessionId, { includeContext: true });
          const form = sd?.context?.execution?.form || sd?.execute?.form;
          const choices = Array.isArray(form?.choices) ? form.choices : [];
          const step = sd?.context?.execution?.step;
          if (choices.length > 0 || step === 'routing') {
            isCompleted = false;
          }
        }

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
    const isAsyncPending =
      asyncResult.asyncPending === true ||
      asyncResult.status === 'processing' ||
      asyncResult.status === 'pending';
    const isCompleted =
      asyncResult.completed === true ||
      asyncResult.status === 'completed' ||
      asyncResult.status === 'idle';
    const hasPromiseId = asyncResult.result?.promiseId || asyncResult.execute?.promiseId;

    // Task is completed if not pending and not waiting on promise
    return !isAsyncPending && (!hasPromiseId || isCompleted);
  }

  isTaskTimeout(taskMeta) {
    const elapsedMs = Date.now() - new Date(taskMeta.startedAt).getTime();
    return elapsedMs > this.pollTimeoutMs;
  }

  async handleTaskCompletion(taskName, taskMeta, asyncResult) {
    const stageInfo = await this.describeTaskStage(taskMeta.sessionId, asyncResult);
    console.log(`Task ${taskName} completed (stage=${stageInfo.stage})`);

    const taskDesc =
      taskMeta.taskDescription || (await this.readTaskDescriptionForName(taskName));
    const gateCap = 5;
    if ((taskMeta.gateAttempts || 0) < gateCap && taskDesc) {
      const sessionData = await this.getSession(taskMeta.sessionId, { includeContext: true });
      const progressed = await this.tryAdvanceMonitorGate(
        taskMeta.sessionId,
        taskDesc,
        sessionData
      );
      if (progressed) {
        taskMeta.gateAttempts = (taskMeta.gateAttempts || 0) + 1;
        taskMeta.lastPolled = new Date().toISOString();
        this.activeTasks.set(taskName, taskMeta);
        this.saveState();
        return;
      }
    }

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
    const timeoutMin = Math.max(1, Math.round(this.pollTimeoutMs / 60000));
    console.error(
      `Task ${taskName} timed out after ~${timeoutMin}m (poll cap ${this.pollTimeoutMs}ms) (stage=${stageInfo.stage} detail=${stageInfo.detail})`
    );

    await this.createHookDocument(
      taskMeta.sessionId,
      taskName,
      'timeout',
      `Task timed out after monitor poll window (~${timeoutMin}m)`,
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