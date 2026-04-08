/**
 * Sequential `processTask`: drives exactly one prompt file per invocation until the poll loop exits
 * (completed, failed, timeout). The daemon awaits this before starting the next incomplete file.
 */
import path from 'path';
import { ServerUnavailableError } from '../errors.js';
import {
  sessionHasAssistantAfterAgentChoice,
  sessionHasVisibleAgentPipelineContent,
  sessionRouterAgentChoiceWithTaskStub,
  sessionTimelineEntries,
} from '../task-monitor-session-helpers.js';

/**
 * @param {new () => unknown} Ctor
 */
export function applyTaskMonitorProcessTask(Ctor) {
  Object.assign(Ctor.prototype, {
    async processTask(taskFile) {
      console.log(`Processing task: ${taskFile.name}`);

      const agentTask = this.buildMonitorAgentSpecTaskInput(taskFile);
      if (!String(agentTask || '').trim()) {
        console.warn(`Could not build agent task input from ${taskFile.name}`);
        this.recordProcessedTask(taskFile.name, 'failed', 'Could not build agent task input', {});
        return false;
      }
      const twoPhase = this.isMonitorTwoPhaseRouterThenSpec(taskFile);
      const routerTask = twoPhase ? this.buildMonitorRouterSearchTaskInput(taskFile) : agentTask;
      const createSessionTask = this.buildMonitorCreateSessionTaskInput(taskFile, routerTask, twoPhase);
      const agentSpecGate = { submitted: false };
      const gateOpts = twoPhase
        ? { twoPhase: true, agentSpecText: agentTask, agentSpecGate }
        : { twoPhase: false, agentSpecText: agentTask, agentSpecGate };
      /** Agent-side spec (file link, summary) — used for completion heuristics vs session history. */
      const taskDescription = agentTask;

      let success = false;
      let failureReason = null;
      let session = null;
      let nextResult = null;
      let abortDueToServer = false;
      let lastAsyncResult = null;
      let attempts = 0;

      try {
        const resumeOn =
          !/^(0|false|no)$/i.test(String(process.env.TASK_MONITOR_RESUME ?? '1').trim());
        const forceNewSession = /^(1|true|yes)$/i.test(
          String(process.env.TASK_MONITOR_NEW_SESSION_PER_TASK ?? '').trim()
        );
        if (forceNewSession && this.state.taskSessions?.[taskFile.name]) {
          this.log(
            'warn',
            `[task-monitor] TASK_MONITOR_NEW_SESSION_PER_TASK=1 — clearing bound session for ${taskFile.name}`
          );
          delete this.state.taskSessions[taskFile.name];
          this.saveState();
        }
        const sidFromMap = this.state.taskSessions?.[taskFile.name]?.sessionId || null;
        const sidFromState =
          resumeOn && this.state.currentTask === taskFile.name ? this.state.sessionId : null;
        const resumeSid = forceNewSession ? sidFromState || null : sidFromMap || sidFromState;

        if (resumeSid) {
          if (sidFromMap && resumeSid === sidFromMap) {
            this.log(
              'info',
              `[task-monitor] One-session policy: continuing ${taskFile.name} in ${resumeSid} (rewind/retry same session)`
            );
          }
          this.tryRewindSessionDiskStep(resumeSid, taskFile.name);
          const existing = await this.getSession(resumeSid);
          if (existing && typeof existing === 'object') {
            const sid = existing.id || resumeSid;
            session = { id: sid };
            this.state.sessionId = sid;
            this.state.currentTask = taskFile.name;
            this.state.status = 'processing';
            this.recordTaskSessionSnapshot(taskFile.name, existing);
            this.saveState();
            console.log(
              `[task-monitor] Resuming session ${sid} from state file (${path.basename(this.stateFile)}) for ${taskFile.name}`
            );
            this.logMonitorSessionObserveLinks(session.id, taskFile, { resumed: true, twoPhase });
            this.logHardBit({ phase: 'session-resume', detail: 'reused sessionId from state' });
            await this.logAgentExecution(session.id, 'after-session-resume');
            const sdResume = await this.getSession(session.id, { includeContext: true });
            const tlResume = sessionTimelineEntries(sdResume);
            const hasAssistantTimeline = tlResume.some(
              (m) =>
                String(m.role || '').toLowerCase() === 'assistant' &&
                String(m.content || '').trim().length > 0
            );
            if (!hasAssistantTimeline) {
              const resumeKick =
                twoPhase && !this.sessionHistoryShowsAgentChoice(sdResume) ? routerTask : agentTask;
              this.log(
                'warn',
                `[task-monitor] Resumed session ${session.id} has no assistant output — sending /next (task) to continue`
              );
              this.logHardBit({ phase: 'resume-initial-next', detail: 'kick task after resume' });
              nextResult = await this.sendNext(session.id, { task: resumeKick });
              if (!nextResult || nextResult.error) {
                nextResult = await this.sendNext(session.id, { result: { message: resumeKick } });
              }
              if (!nextResult) {
                console.error(`Failed to send resume kick for task ${taskFile.name}`);
                failureReason = 'Resume kick (next) failed';
                return false;
              }
              await this.logAgentExecution(session.id, 'after-resume-initial-next');
            }
          } else {
            this.log(
              'warn',
              `Mapped session ${resumeSid} not found on Client API — creating a new session`
            );
            this.state.sessionId = null;
            this.state.currentTask = null;
            if (this.state.taskSessions?.[taskFile.name]) {
              delete this.state.taskSessions[taskFile.name];
            }
            this.saveState();
          }
        }

        if (!session) {
          this.log(
            'info',
            `[task-monitor] No resumable session for ${taskFile.name} (no taskSessions binding, or TASK_MONITOR_NEW_SESSION_PER_TASK, or GET /sessions/{id} 404) — creating NEW session`
          );
          session = await this.createSession(createSessionTask);
          if (!session) {
            console.error(`Failed to create session for task ${taskFile.name}`);
            failureReason = 'Session creation failed';
            return false;
          }

          this.state.sessionId = session.id;
          this.state.currentTask = taskFile.name;
          this.state.status = 'processing';
          this.recordTaskSessionSnapshot(taskFile.name, session);
          this.saveState();
          this.log(
            'info',
            `[task-monitor] New session ${session.id} for ${taskFile.name} (bind in taskSessions; reuse until done or TASK_MONITOR_NEW_SESSION_PER_TASK=1)`
          );
          this.logMonitorSessionObserveLinks(session.id, taskFile, { resumed: false, twoPhase });
          this.logHardBit({ phase: 'session-start', detail: 'session created with task' });
          await this.logAgentExecution(session.id, 'after-session-create');

          nextResult = await this.sendNext(session.id, { task: routerTask });
          if (!nextResult || nextResult.error) {
            console.log('Initial task send failed, retrying with result.message');
            nextResult = await this.sendNext(session.id, { result: { message: routerTask } });
          }
          if (!nextResult) {
            console.error(`Failed to send initial next for task ${taskFile.name}`);
            failureReason = 'Initial next failed';
            return false;
          }
          this.logHardBit({
            phase: 'initial-next',
            detail: `sent task input (message/task)`,
            serverBusy: true,
          });
          await this.logAgentExecution(session.id, 'after-initial-next');
        }

        let routerIdleStuckCount = 0;
        let monitorGateAdvanceCount = 0;
        let routerStuckExit = false;
        if (await this.tryAdvanceMonitorGate(session.id, routerTask, null, gateOpts)) {
          monitorGateAdvanceCount += 1;
          await this.logAgentExecution(session.id, 'after-initial-monitor-gate');
        }

        const pollInterval = Math.max(1, this.pollIntervalMs);
        const attemptCeiling = Math.max(
          this.maxPollAttempts,
          Math.ceil(this.pollTimeoutMs / pollInterval) + 100
        );
        const startTime = Date.now();
        attempts = 0;
        let idleToolLoopHits = 0;
        let lastStallKey = null;
        let stallHits = 0;
        let agentToolPhaseStart = null;

        const strictAgentCompletion = /^(1|true|yes)$/i.test(
          String(process.env.TASK_MONITOR_STRICT_AGENT_COMPLETION ?? '').trim()
        );
        /** When true, do not mark success on agent `step=request` + assistant text alone — only `context.result` or `step=completed`. */
        const requireTerminalAgentSuccess = /^(1|true|yes)$/i.test(
          String(process.env.TASK_MONITOR_REQUIRE_TERMINAL_AGENT ?? '').trim()
        );
        const _rawContinueMax = parseInt(
          String(process.env.TASK_MONITOR_AGENT_CONTINUE_MAX ?? '20'),
          10
        );
        const agentContinueMax =
          Number.isFinite(_rawContinueMax) && _rawContinueMax >= 0 ? _rawContinueMax : 20;
        const agentContinuePrompt =
          String(process.env.TASK_MONITOR_AGENT_CONTINUE_PROMPT ?? '').trim() ||
          'Continue until the assigned task is fully done. When finished, give a clear final answer.';
        let agentContinueCount = 0;

        while (attempts < attemptCeiling) {
          if (Date.now() - startTime > this.pollTimeoutMs) {
            console.error(`Poll timeout exceeded (${this.pollTimeoutMs}ms)`);
            break;
          }

          const asyncResult = await this.pollAsync(session.id);
          lastAsyncResult = asyncResult;
          if (!asyncResult) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            continue;
          }
          const isCompleted =
            asyncResult.completed === true ||
            asyncResult.status === 'completed' ||
            asyncResult.status === 'idle';
          const isAsyncPending =
            !isCompleted &&
            (asyncResult.asyncPending === true ||
              asyncResult.status === 'processing' ||
              asyncResult.status === 'pending');
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

          if (!isAsyncPending) {
            const sd = await this.getSession(session.id, { includeContext: true });
            this.recordTaskSessionSnapshot(taskFile.name, sd);
            const progressed = await this.tryAdvanceMonitorGate(session.id, routerTask, sd, gateOpts);
            if (progressed) {
              monitorGateAdvanceCount += 1;
              this.logHardBit({
                phase: 'monitor-gate',
                detail: `advanced (${monitorGateAdvanceCount})`,
                serverBusy: true,
              });
              await this.logAgentExecution(session.id, 'after-monitor-gate');
              attempts++;
              await new Promise((resolve) => setTimeout(resolve, pollInterval));
              continue;
            }
            const gateForm = sd?.context?.execution?.form || sd?.execute?.form;
            const routerChoices = Array.isArray(gateForm?.choices) ? gateForm.choices : [];
            if (routerChoices.length > 0) {
              routerIdleStuckCount += 1;
              if (routerIdleStuckCount >= 5) {
                failureReason =
                  'Router requires manual choice (no auto-advance after 5 idle polls)';
                routerStuckExit = true;
                break;
              }
            }
          }

          if (isAsyncPending) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            continue;
          }

          if (hasPromiseId && !isCompleted) {
            console.log(`Waiting on promise ${hasPromiseId} to complete...`);
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            continue;
          }

          if (isCompleted) {
            const sessionData = await this.getSession(session.id, { includeContext: true });
            this.recordTaskSessionSnapshot(taskFile.name, sessionData);

            const result = sessionData?.context?.result || sessionData?.result;
            if (result) {
              console.log(`Task ${taskFile.name} completed with result:`, result);

              this.warnSessionArtifactWireJson(session.id);
              await this.markTaskAsCompleted(taskFile.name);
              success = true;
              return true;
            }

            const execStep =
              sessionData?.context?.execution?.step ?? sessionData?.execute?.step;
            const execAction =
              sessionData?.context?.execution?.action ?? sessionData?.execute?.action;
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
              this.warnSessionArtifactWireJson(session.id);
              await this.markTaskAsCompleted(taskFile.name);
              success = true;
              return true;
            }

            if (
              execAction === 'agent' &&
              execStep === 'request' &&
              (sessionHasAssistantAfterAgentChoice(sessionData, taskDescription) ||
                sessionHasVisibleAgentPipelineContent(sessionData) ||
                sessionRouterAgentChoiceWithTaskStub(sessionData, taskDescription))
            ) {
              if (strictAgentCompletion) {
                if (agentContinueMax <= 0) {
                  failureReason =
                    'TASK_MONITOR_STRICT_AGENT_COMPLETION: agent step=request with assistant text but TASK_MONITOR_AGENT_CONTINUE_MAX is 0 (set >=1 for auto /next nudges, or unset strict)';
                  break;
                }
                if (agentContinueCount < agentContinueMax) {
                  let res = await this.sendNext(session.id, { task: agentContinuePrompt });
                  if (!res) {
                    res = await this.sendNext(session.id, {
                      result: { message: agentContinuePrompt },
                    });
                  }
                  if (res) {
                    agentContinueCount += 1;
                    console.log(
                      `[task-monitor] Strict agent completion: continuation ${agentContinueCount}/${agentContinueMax} (await step=completed, not step=request)`
                    );
                    this.logHardBit({
                      phase: 'strict-agent-continue',
                      detail: `${agentContinueCount}/${agentContinueMax}`,
                      serverBusy: true,
                    });
                    attempts++;
                    await new Promise((resolve) => setTimeout(resolve, pollInterval));
                    continue;
                  }
                  failureReason =
                    'TASK_MONITOR_STRICT_AGENT_COMPLETION: continuation /next failed after agent step=request';
                  break;
                }
                failureReason = `TASK_MONITOR_STRICT_AGENT_COMPLETION: exhausted TASK_MONITOR_AGENT_CONTINUE_MAX (${agentContinueMax}) without agent step=completed`;
                break;
              }
              if (!requireTerminalAgentSuccess) {
                console.log(
                  `Task ${taskFile.name} completed (agent step=request, assistant after agent-choice or substantive reply)`
                );
                this.warnSessionArtifactWireJson(session.id);
                await this.markTaskAsCompleted(taskFile.name);
                success = true;
                return true;
              }
              if (attempts % 24 === 0) {
                console.log(
                  `[task-monitor] TASK_MONITOR_REQUIRE_TERMINAL_AGENT=1: async idle at step=request — waiting for context.result or step=completed (not treating as done yet)`
                );
              }
            }

            const step = sessionData?.context?.execution?.step || sessionData?.execute?.step;
            const action = sessionData?.context?.execution?.action;
            const asyncStatus = asyncResult?.status;
            if (
              action === 'agent' &&
              step === 'tool_run_script' &&
              (asyncStatus === 'idle' || asyncStatus === 'completed')
            ) {
              idleToolLoopHits += 1;
              if (idleToolLoopHits >= 3) {
                failureReason =
                  'Agent loop detected: repeated idle at step=tool_run_script with no terminal result';
                break;
              }
            } else {
              idleToolLoopHits = 0;
            }
          }

          attempts++;
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }

        if (routerStuckExit) {
          console.error(`Task ${taskFile.name} aborted: ${failureReason}`);
          await this.logHubPromiseQueueSnapshot();
          return false;
        }

        if (failureReason) {
          console.error(`Task ${taskFile.name} failed: ${failureReason}`);
          await this.logHubPromiseQueueSnapshot();
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
        await this.logHubPromiseQueueSnapshot();
        failureReason = `Timed out after ${timeoutSeconds}s${timeoutStageInfo ? ` (${timeoutStageInfo.stage})` : ''}`;
        return false;
      } catch (error) {
        if (error instanceof ServerUnavailableError) {
          abortDueToServer = true;
          this.state.status = 'server-unavailable';
          this.saveState();
          throw error;
        }

        const extraContext = {
          sessionId: session?.id,
          phase: 'task-processing',
          attempts,
          lastAsyncResult: lastAsyncResult
            ? {
                status: lastAsyncResult.status,
                asyncPending: lastAsyncResult.asyncPending,
                hasPromiseId: !!(
                  lastAsyncResult.result?.promiseId || lastAsyncResult.execute?.promiseId
                ),
              }
            : null,
        };
        const classification = this.logError('processTask', error, taskFile.name, extraContext);

        if (session?.id && (classification.severity === 'high' || classification.severity === 'critical')) {
          console.log(`\n🔍 Running deep session inspection for failed task...`);
          const inspection = await this.inspectSessionForErrors(session.id);
          this.printSessionInspection(inspection);

          if (inspection.issues && inspection.issues.length > 0) {
            failureReason =
              `${classification.type}:${classification.subtype} - ` +
              `Session issues: ${inspection.issues.map((i) => i.type).join(', ')}`;
          } else {
            failureReason = `${classification.type}:${classification.subtype} - ${error.message || 'Unexpected error'}`;
          }
        } else {
          failureReason = `${classification.type}:${classification.subtype} - ${error.message || 'Unexpected error'}`;
        }

        return false;
      } finally {
        if (!abortDueToServer) {
          this.recordProcessedTask(
            taskFile.name,
            success ? 'completed' : 'failed',
            success ? null : failureReason,
            {
              sessionId: session?.id || null,
              projectId: this.projectId || null,
            }
          );
          if (success && session?.id) {
            console.log(
              `[task-monitor] Recorded completion: task=${taskFile.name} sessionId=${session.id} (state + ledger)`
            );
            try {
              const sd = await this.getSession(session.id, { includeContext: true });
              const terminalResult = sd?.context?.result || sd?.result || null;
              await this.createCompletionReport(session.id, taskFile.name, terminalResult);
            } catch (reportErr) {
              console.warn(
                `[task-monitor] createCompletionReport failed: ${reportErr?.message || reportErr}`
              );
            }
          }
        }
        if (success) {
          this.clearTaskSessionBinding(taskFile.name);
          this.state.status = 'idle';
          this.state.sessionId = null;
          this.state.currentTask = null;
        } else if (!abortDueToServer) {
          this.state.status = 'idle';
          if (session?.id) {
            this.recordTaskSessionSnapshot(taskFile.name, { id: session.id });
            // Keep sessionId + currentTask so the next run can resume via state OR taskSessions (not only the map).
            this.state.sessionId = session.id;
            this.state.currentTask = taskFile.name;
          } else {
            this.state.sessionId = null;
            this.state.currentTask = null;
          }
        }
        this.saveState();
      }
    },
  });
}
