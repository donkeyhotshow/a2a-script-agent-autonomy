import fs from 'fs';
import path from 'path';

/**
 * Legacy alternate path: multi `activeTasks` + processNewTasks / monitorActiveTasks.
 * Default entry does NOT use this: `runDaemon()` awaits a single `processTask` per incomplete prompt instead.
 * @param {new () => unknown} Ctor
 */
export function applyTaskMonitorParallelMonitor(Ctor) {
  Object.assign(Ctor.prototype, {
    async processNewTasks() {
      const taskFiles = await this.getTaskFiles();
      if (taskFiles.length === 0) {
        return;
      }

      if (this.activeTasks.size > 0) {
        return;
      }

      for (const taskFile of taskFiles) {
        if (
          this.activeTasks.has(taskFile.name) ||
          taskFile.content.includes('[X] Completed') ||
          (taskFile.content.includes('## Completion') && taskFile.content.includes('Completed'))
        ) {
          continue;
        }

        try {
          const agentTask = this.buildMonitorAgentSpecTaskInput(taskFile);
          if (!String(agentTask || '').trim()) {
            console.warn(`Could not build task input from ${taskFile.name}`);
            continue;
          }
          const twoPhase = this.isMonitorTwoPhaseRouterThenSpec(taskFile);
          const routerTask = twoPhase ? this.buildMonitorRouterSearchTaskInput(taskFile) : agentTask;
          const createSessionTask = this.buildMonitorCreateSessionTaskInput(taskFile, routerTask, twoPhase);
          const agentSpecGate = { submitted: false };
          const gateOpts = twoPhase
            ? { twoPhase: true, agentSpecText: agentTask, agentSpecGate }
            : { twoPhase: false, agentSpecText: agentTask, agentSpecGate };

          const forceNewSession = /^(1|true|yes)$/i.test(
            String(process.env.TASK_MONITOR_NEW_SESSION_PER_TASK ?? '').trim()
          );
          if (forceNewSession && this.state.taskSessions?.[taskFile.name]) {
            this.log(
              'warn',
              `[task-monitor] TASK_MONITOR_NEW_SESSION_PER_TASK=1 — clearing bound session for ${taskFile.name} (daemon start)`
            );
            delete this.state.taskSessions[taskFile.name];
            this.saveState();
          }

          const boundSid =
            !forceNewSession && this.state.taskSessions?.[taskFile.name]?.sessionId
              ? this.state.taskSessions[taskFile.name].sessionId
              : null;

          let session = null;
          if (boundSid) {
            this.log(
              'info',
              `[task-monitor] One-session policy: reusing bound session ${boundSid} for ${taskFile.name} (no new session)`
            );
            this.tryRewindSessionDiskStep(boundSid, taskFile.name);
            const existing = await this.getSession(boundSid);
            if (existing && typeof existing === 'object' && (existing.id || boundSid)) {
              session = { id: existing.id || boundSid };
              this.recordTaskSessionSnapshot(taskFile.name, existing);
            } else {
              this.log(
                'warn',
                `[task-monitor] Bound session ${boundSid} not found — creating a new session for ${taskFile.name}`
              );
            }
          }

          if (!session) {
            session = await this.createSession(createSessionTask);
          }
          if (!session) {
            console.error(`Failed to create session for task ${taskFile.name}`);
            await this.createHookDocument(null, taskFile.name, 'failed', 'Session creation failed');
            continue;
          }
          if (!boundSid || session.id !== boundSid) {
            this.recordTaskSessionSnapshot(taskFile.name, session);
          }

          this.activeTasks.set(taskFile.name, {
            sessionId: session.id,
            taskName: taskFile.name,
            taskDescription: routerTask,
            agentSpecText: agentTask,
            twoPhase,
            agentSpecGate,
            gateOpts,
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
          this.logMonitorSessionObserveLinks(session.id, taskFile, { resumed: false, twoPhase });

          return;
        } catch (error) {
          const classification = this.logError('processNewTasks', error, taskFile.name, {
            phase: 'task-start',
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
    },

    async monitorActiveTasks() {
      const activeSessions = Array.from(this.activeTasks.keys());

      for (const taskName of activeSessions) {
        let taskMeta;
        try {
          taskMeta = this.activeTasks.get(taskName);
          const sessionId = taskMeta.sessionId;

          const asyncResult = await this.pollAsync(sessionId);
          if (!asyncResult) continue;

          taskMeta.lastPolled = new Date().toISOString();

          let isCompleted = this.checkTaskCompletion(asyncResult);
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
          this.logError('monitorActiveTasks', error, taskName, {
            sessionId: taskMeta?.sessionId,
            taskStatus: taskMeta?.status,
          });
        }
      }
    },

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

      return !isAsyncPending && (!hasPromiseId || isCompleted);
    },

    isTaskTimeout(taskMeta) {
      const elapsedMs = Date.now() - new Date(taskMeta.startedAt).getTime();
      return elapsedMs > this.pollTimeoutMs;
    },

    async handleTaskCompletion(taskName, taskMeta, asyncResult) {
      const stageInfo = await this.describeTaskStage(taskMeta.sessionId, asyncResult);
      console.log(`Task ${taskName} completed (stage=${stageInfo.stage})`);

      const taskDesc =
        taskMeta.taskDescription || (await this.readTaskDescriptionForName(taskName));
      const gateCap = 5;
      const gateOpts =
        taskMeta.gateOpts ||
        (taskMeta.twoPhase
          ? {
              twoPhase: true,
              agentSpecText: taskMeta.agentSpecText || '',
              agentSpecGate: taskMeta.agentSpecGate || { submitted: false },
            }
          : { twoPhase: false, agentSpecText: taskMeta.agentSpecText || taskDesc, agentSpecGate: { submitted: false } });
      if ((taskMeta.gateAttempts || 0) < gateCap && taskDesc) {
        const sessionData = await this.getSession(taskMeta.sessionId, { includeContext: true });
        const progressed = await this.tryAdvanceMonitorGate(
          taskMeta.sessionId,
          taskDesc,
          sessionData,
          gateOpts
        );
        if (progressed) {
          taskMeta.gateAttempts = (taskMeta.gateAttempts || 0) + 1;
          taskMeta.lastPolled = new Date().toISOString();
          this.activeTasks.set(taskName, taskMeta);
          this.saveState();
          return;
        }
      }

      const sessionData = await this.getSession(taskMeta.sessionId);
      const result = sessionData?.context?.result || sessionData?.result;

      if (result) {
        console.log(`Task ${taskName} completed with result:`, result);

        await this.markTaskAsCompleted(taskName);
        this.recordProcessedTask(taskName, 'completed', null, {
          sessionId: taskMeta.sessionId,
          projectId: this.projectId || null,
        });
        this.clearTaskSessionBinding(taskName);
        await this.createCompletionReport(taskMeta.sessionId, taskName, result);
      } else {
        console.warn(
          `Task ${taskName} completed but no result found (stage=${stageInfo.stage} detail=${stageInfo.detail})`
        );
        this.recordProcessedTask(taskName, 'failed', 'No result in completed session', {
          sessionId: taskMeta.sessionId,
          projectId: this.projectId || null,
        });
        await this.createHookDocument(
          taskMeta.sessionId,
          taskName,
          'failed',
          'No result in completed session',
          stageInfo
        );
      }

      this.activeTasks.delete(taskName);
      this.saveState();
    },

    async handleTaskTimeout(taskName, taskMeta, asyncResult) {
      const stageInfo = await this.describeTaskStage(taskMeta.sessionId, asyncResult);
      const timeoutMin = Math.max(1, Math.round(this.pollTimeoutMs / 60000));
      console.error(
        `Task ${taskName} timed out after ~${timeoutMin}m (poll cap ${this.pollTimeoutMs}ms) (stage=${stageInfo.stage} detail=${stageInfo.detail})`
      );

      this.recordProcessedTask(taskName, 'failed', `Task timed out (~${timeoutMin}m)`, {
        sessionId: taskMeta.sessionId,
        projectId: this.projectId || null,
      });
      await this.createHookDocument(
        taskMeta.sessionId,
        taskName,
        'timeout',
        `Task timed out after monitor poll window (~${timeoutMin}m)`,
        stageInfo
      );

      this.activeTasks.delete(taskName);
      this.saveState();
    },

    async cleanupCompletedTasks() {
      const now = new Date();
      for (const [taskName, taskMeta] of this.activeTasks.entries()) {
        const lastPolled = new Date(taskMeta.lastPolled);
        const minutesSincePoll = (now - lastPolled) / (1000 * 60);

        if (minutesSincePoll > 10) {
          console.warn(`Removing stale task ${taskName} from active monitoring`);
          this.activeTasks.delete(taskName);
        }
      }
    },

    async markTaskAsCompleted(taskName) {
      const taskFilePath = path.join(this.tasksDir, taskName);
      try {
        let content = fs.readFileSync(taskFilePath, 'utf8');

        if (!content.includes('## Completion')) {
          content += '\n\n## Completion\n\n[X] Completed\n';
          fs.writeFileSync(taskFilePath, content);
          console.log(`Marked task ${taskName} as completed`);
        } else {
          content = content.replace(/## Completion[\s\S]*?(?=##|$)/, '## Completion\n\n[X] Completed\n');
          fs.writeFileSync(taskFilePath, content);
          console.log(`Updated completion status for task ${taskName}`);
        }
      } catch (error) {
        console.error(`Error marking task ${taskName} as completed:`, error.message);
      }
    },
  });
}
