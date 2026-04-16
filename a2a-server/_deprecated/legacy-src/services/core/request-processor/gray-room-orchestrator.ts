import * as path from 'path';
import {logger} from '@a2a/server-utils';
import {runPromptsTransform, mergeGrayRoomSlotIntoContext, mergeInterruptTraceIntoContext} from '@a2a/server-transform';
import type {GrayRoomControlEnvelope, InterruptDirective, ServerInterruptTraceEvent} from '@a2a/server-transform';
import {executeReadFile} from '@a2a/server-actions';
import {mergeServerRagPageIntoContext} from '../rag/auto-rag-page-server.js';
import {initAiHubChatPromise, pollReadyThenFetch} from '@a2a/server-daemon';
import {BlackRoomOrchestrator} from '../black-room/black-room-orchestrator.js';
import type {AlgorithmContext, AlgorithmData} from '../black-room/types.js';
import type {ProcessResult} from './request-processor.interfaces.js';
import {
    validateExecuteShapeForSchema,
    validateLlmOutputShape,
    validateRouterResultShape,
    shouldEnforceTransformStrictMode,
} from './validators/transform-execute-validator.js';
import {resolveExecution, resolveHistoryLength, toInvokeShapeForPromptsTransform} from './normalization.js';
import {grayRoomLlmModelFallback, resolveGrayRoomLlmModelFromContext} from './llm-model-resolver.js';
import {globalArtifactStore} from '@a2a/server-utils';
import {DedicatedAnalyzer} from '../analyzer.js';
import {globalExperienceBank} from '../../memory/experience-bank.js';
import {globalMcpRegistry} from '../../mcp/registry.js';

// Import trigger detection logic
import {
    readGrayRoomInterruptBudget,
} from './gray-room-trigger.js';

// Import utilities
import {
    mergeGrayRoomFinalizeInnerContext,
    GrayRoomOptions
} from './gray-room-utils.js';

// Import interrupt handlers
import {handleCompressHistory} from './gray-room-interrupt-handlers/compress-history.js';
import {handleThinking} from './gray-room-interrupt-handlers/thinking.js';
import {handleAutoReadFile} from './gray-room-interrupt-handlers/auto-read-file.js';
import {handleAutoRagPage} from './gray-room-interrupt-handlers/auto-rag-page.js';
import {handleClarify} from './gray-room-interrupt-handlers/clarify.js';
import {handleAlgorithmInvoke} from './gray-room-interrupt-handlers/algorithm-invoke.js';
import {globalVisionTester} from '../vision-tester.js';
import {globalRoleRegistry} from '../agent-role-registry.js';
import {globalSafetyLayer} from '../safety-layer.js';
import {globalIntentGate} from '../intent-gate.js';
import {decisionCell} from './decision-cell.js';
import {bugFixer} from '../../llm/bug-fixer.js';
import {repoMapService} from '../../context/repo-map.service.js';
import {llmService} from '../../llm/llm-service.js';
import {OrchestratorKernel} from '../orchestrator-kernel.js';
import type {OrchestratorState, OrchestratorEvent} from '../orchestrator-kernel.js';
import {contextDiscoveryService} from '../../context/context-discovery.service.js';
import {resolveAiHubBaseUrl} from '@a2a/server-llm';
import {mkdtempOsTmp} from '@a2a/server-utils';
import {prepareLlmMessages} from './llm-orchestration.js';

export class GrayRoomOrchestrator {
    private maxInterruptTurns: number;
    private aiHubUrl: string;
    private model: string;
    private promptsTransformsPath: string;
    private static activeControllers = new Map<string, AbortController>();

    constructor(options: GrayRoomOptions) {
        this.maxInterruptTurns = options.maxInterruptTurns ?? readGrayRoomInterruptBudget();
        this.aiHubUrl = resolveAiHubBaseUrl(options.aiHubUrl);
        this.model = options.model ?? grayRoomLlmModelFallback();
        this.promptsTransformsPath = options.promptsTransformsPath;
    }

    /**
     * Run the Gray Room interrupt loop starting from an initial LLM response.
     * @param processInterrupts When false (gray room opted off), one response transform only; `interrupt` is ignored.
     */
    async runLoop(
        ctx: Record<string, unknown>,
        schemaName: string,
        responseMd: string,
        promiseId: string,
        recovered: boolean = false,
        processInterrupts: boolean = true
    ): Promise<ProcessResult> {
        let workingCtx = ctx;
        let md = responseMd;
        let isRecovered = recovered;
        let interruptBudget = this.maxInterruptTurns;
        let activeSchemaName = schemaName;
        const trace: ServerInterruptTraceEvent[] = [];
        let turn = 0;
        const startedAt = new Date().toISOString();
        const grayRoom: GrayRoomControlEnvelope = {
            enabled: processInterrupts,
            planId: promiseId,
            phase: 'response_transform',
            maxTurns: this.maxInterruptTurns,
            turn: 0,
            status: 'running',
            timestamps: {startedAt, lastUpdateAt: startedAt},
            remainingBudget: interruptBudget,
            traceRef: {length: 0},
        };

        // BUG-1 FIX: Declare FSM kernel and currentState (was missing, causing ReferenceError)
        const kernel = new OrchestratorKernel('EXECUTING', promiseId);
        let currentState: OrchestratorState = 'EXECUTING';

        const controller = new AbortController();
        GrayRoomOrchestrator.activeControllers.set(promiseId, controller);

        const touchGrayRoom = (patch: Partial<GrayRoomControlEnvelope>): void => {
            Object.assign(grayRoom, patch);
            grayRoom.timestamps = {startedAt, lastUpdateAt: new Date().toISOString()};
            grayRoom.traceRef = {length: trace.length};
        };

        // -- SAFETY & INTENT INITIALIZATION (ADR-0035 / ADR-0050) --
        globalSafetyLayer.reset();
        globalIntentGate.lockIntent((workingCtx['task'] as string) || '');
        const sessionStartTime = Date.now();
        
        // ADR-0092: Generate Project Repo Map for structural awareness
        const repoRoot = (workingCtx['projectRoot'] as string) || process.cwd();
        try {
            const projectMap = await repoMapService.generateMapMd(repoRoot);
            workingCtx['repo_map'] = projectMap;
        } catch (e) {
            logger.warn('[GrayRoom] Failed to generate RepoMap', { error: String(e) });
        }
        // -------------------------------------------------------------

        // ADR-0093: Internal Debate for the first turn to refine the plan (agent-style tasks).
        // Skip when recovering from a hub promise: `md` is the completed hub body; debate would
        // replace it and runs 3 sync hub calls (proxy errors / timeouts).
        // Skip for `dialog` schema: the main dialog LLM response is already the user-facing turn;
        // debate was causing failed invokes (e.g. upstream/proxy "terminated") before response transform.
        if (turn === 0 && processInterrupts && !isRecovered && schemaName !== 'dialog') {
            logger.info('[GrayRoom] Running ADR-0093 Internal Debate');
            try {
                const debateResult = await llmService.debate((workingCtx['task'] as string) || '', workingCtx);
                md = debateResult.plan;
                workingCtx['debate_consensus'] = debateResult.consensus;
            } catch (e) {
                logger.warn('[GrayRoom] Internal debate skipped — using primary LLM output', {
                    error: String(e),
                });
            }
        }
        // ---------------------------------------------------------

        // Event-driven Actor Model Step
        return new Promise<ProcessResult>(async (resolve) => {
            const processTick = async () => {
                if (controller.signal.aborted) {
                    logger.warn('[GrayRoom] Externally halted!', { promiseId });
                    GrayRoomOrchestrator.activeControllers.delete(promiseId);
                    resolve({
                        outcome: 'failed',
                        error: 'Task halted by operator',
                        context: workingCtx
                    } as ProcessResult);
                    return;
                }

                // -- SAFETY INTERCEPT (ADR-0035 / ADR-0050) --
                const safety = globalSafetyLayer.intercept(workingCtx);
                if (safety.halt) {
                    logger.error('[GrayRoom] Safety halt!', { reason: safety.reason });
                    resolve({
                        outcome: 'failed',
                        error: safety.reason || 'Safety violation detected',
                        context: workingCtx
                    } as ProcessResult);
                    return;
                }
                // --------------------------------------------

                // -- EXPERIENCE BANK (PRE) --
            try {
                const exprs = await globalExperienceBank.getRelevantExperiences(JSON.stringify(workingCtx).slice(0, 500));
                if (exprs.length > 0) {
                    workingCtx['relevant_experiences'] = exprs.map(e => e.action_payload);
                }
            } catch (err) {
                logger.warn('[GrayRoom] ExperienceBank get failure', { error: String(err) });
            }
            // --------------------------

            touchGrayRoom({phase: 'response_transform', turn, remainingBudget: interruptBudget});
            trace.push({
                kind: 'llm_output',
                phase: turn === 0 ? 'primary' : 'follow_up',
                chars: md.length,
            });

            const pair = await this.runResponseTransform(
                activeSchemaName, workingCtx, md, isRecovered
            );
            isRecovered = false;

            if (!pair) {
                resolve({outcome: 'failed', error: 'Response transform failed'} as ProcessResult);
                return;
            }

            const {result, rawOutput} = pair;

            // -- MCP TOOL BRIDGE (ADR-0078) --
            const executeCall = (result.execute as Record<string, any>);
            if (executeCall) {
                const actionKeys = Object.keys(executeCall);
                const actionName = actionKeys.length > 0 ? actionKeys[0] : undefined;
                if (actionName) {
                    const mcpTool = globalMcpRegistry.getTool(actionName);
                    if (mcpTool) {
                        logger.info('[GrayRoom] Executing MCP Tool', { actionName });
                        try {
                            const mcpResult = await mcpTool.execute(executeCall[actionName]);
                            result.context = { ...result.context, mcp_result: { [actionName]: mcpResult } } as Record<string, unknown>;
                        } catch (e) {
                            const err = e as Error;
                            logger.error('[GrayRoom] MCP Tool failed, triggering BugFixer', { actionName, error: err.message });
                            const fix = await bugFixer.fix(JSON.stringify(executeCall[actionName]), err.message);
                            if (fix.fixed) {
                                logger.info('[GrayRoom] BugFixer produced a patch', { actionName });
                                result.context = { ...result.context, mcp_error: err.message, bugfix_analysis: fix.analysis, recommended_patch: fix.patches } as Record<string, unknown>;
                            } else {
                                result.context = { ...result.context, mcp_error: err.message } as Record<string, unknown>;
                            }
                        }
                    }
                }
            }
            // --------------------------------

            const interrupt = this.extractInterrupt(rawOutput);
            trace.push({
                kind: 'response_transform',
                interruptReason: interrupt?.reason,
            });

            if (interrupt && !processInterrupts) {
                trace.push({
                    kind: 'interrupt_skipped',
                    reason: interrupt.reason,
                    detail: 'gray_room_disabled',
                });
                touchGrayRoom({
                    phase: 'completed',
                    status: 'completed',
                    turn,
                    remainingBudget: interruptBudget,
                    lastReason: interrupt.reason,
                });
                resolve(this.mergeTraceIntoResult(result, trace, grayRoom));
                return;
            }

            if (!interrupt) {
                // -- DECISION CELL FINAL CHECK (ADR-0088) --
                const decision = await decisionCell.decide(
                    (workingCtx['session_id'] as string) || promiseId,
                    (workingCtx['task'] as string) || '',
                    workingCtx
                );
                
                // -- INTENT DRIFT CHECK (ADR-0050) --
                // Check for drift every 5 turns after initial passes
                if (globalIntentGate.getTurnCount() >= 5) {
                    const executeKey = Object.keys(result.execute || {}).find(k => 
                        k !== 'noop' && k !== 'message' && k !== 'form'
                    );
                    const currentPlan = executeKey || (workingCtx['task'] as string) || '';
                    
                    const driftCheck = await globalIntentGate.checkDrift(currentPlan, workingCtx);
                    if (driftCheck.hasDrift && driftCheck.confidence > 0.7) {
                        logger.error('[GrayRoom] Intent drift detected - halting', { 
                            confidence: driftCheck.confidence,
                            reason: driftCheck.reason 
                        });
                        touchGrayRoom({
                            phase: 'completed',
                            status: 'truncated',
                            turn,
                            remainingBudget: interruptBudget,
                            lastReason: `intent_drift: ${driftCheck.reason}`,
                        });
                        resolve(this.mergeTraceIntoResult(
                            {...result, context: {...workingCtx, intent_drift_detected: true}} as ProcessResult,
                            trace,
                            grayRoom
                        ));
                        return;
                    }
                }
                // ------------------------------------
                
                if (decision.done) {
                    // ADR-0095: Instead of completing immediately, enter SIEGE_REVIEW
                    logger.info('[GrayRoom] DecisionCell marked done. Entering SIEGE_REVIEW');
                    const reviewResult = await globalRoleRegistry.executeSyndicateReview(workingCtx);
                    if (reviewResult.passed) {
                        logger.info('[GrayRoom] SIEGE_REVIEW passed. Completing session.');
                        touchGrayRoom({phase: 'completed', status: 'completed', turn, remainingBudget: interruptBudget});
                        resolve(this.mergeTraceIntoResult(result, trace, grayRoom));
                        return;
                    } else {
                        logger.warn('[GrayRoom] SIEGE_REVIEW failed. Forcing extra turn for corrections.', { reason: reviewResult.reason });
                        workingCtx['task'] = `[SIEGE REVIEW FAILED] ${reviewResult.reason}\n\nPlease correct these issues.`;
                        // Continue loop
                    }
                } else if (decision.retry) {
                    logger.info('[GrayRoom] DecisionCell requested retry', { reason: decision.reason });
                    // Continue loop instead of exit
                } else {
                    touchGrayRoom({phase: 'completed', status: 'completed', turn, remainingBudget: interruptBudget});
                    resolve(this.mergeTraceIntoResult(result, trace, grayRoom));
                    return;
                }
            }

            if (!interrupt || !this.interruptWhenSatisfied(interrupt, workingCtx)) {
                if (interrupt) {
                    trace.push({
                        kind: 'interrupt_skipped',
                        reason: interrupt.reason,
                        detail: 'when_clause_not_met',
                    });
                }
                touchGrayRoom({
                    phase: 'completed',
                    status: 'completed',
                });
                resolve(this.mergeTraceIntoResult(result, trace, grayRoom));
                return;
            }

            const currentInterrupt = interrupt;
            if (typeof currentInterrupt.maxTurns === 'number' && Number.isFinite(currentInterrupt.maxTurns) && currentInterrupt.maxTurns >= 0) {
                interruptBudget = Math.min(interruptBudget, currentInterrupt.maxTurns);
            }

            if (interruptBudget <= 0) {
                const c = result.context as Record<string, unknown>;
                touchGrayRoom({
                    phase: 'completed',
                    status: 'truncated',
                    turn,
                    remainingBudget: 0,
                    lastReason: currentInterrupt.reason,
                });
                resolve(this.mergeTraceIntoResult(
                    {...result, context: {...c, interrupt_truncated: true}} as ProcessResult,
                    trace,
                    grayRoom
                ));
                return;
            }

            if (typeof interrupt.maxTurns === 'number' && Number.isFinite(interrupt.maxTurns) && interrupt.maxTurns >= 0) {
                interruptBudget = Math.min(interruptBudget, interrupt.maxTurns);
            }

            if (interruptBudget <= 0) {
                const c = result.context as Record<string, unknown>;
                touchGrayRoom({
                    phase: 'completed',
                    status: 'truncated',
                    turn,
                    remainingBudget: 0,
                    lastReason: interrupt.reason,
                });
                resolve(this.mergeTraceIntoResult(
                    {...result, context: {...c, interrupt_truncated: true}} as ProcessResult,
                    trace,
                    grayRoom
                ));
                return;
            }
            interruptBudget--;

            // -- DEDICATED ANALYZER INTEGRATION (ADR-0060) --
            const analyzer = new DedicatedAnalyzer(globalArtifactStore);
            const currentConfidence = (workingCtx['confidence'] as number) ?? 0.5;
            
            // Note: We need a way to get artifacts, but for now we'll pass an empty array or query globalArtifactStore if needed.
            // ADR: Insights are extracted from history and artifacts.
            const responseArtifacts = await globalArtifactStore.query({ turn_id: `turn-${turn}` });
            const sessionHistory = (workingCtx['history'] as unknown[]) ?? [];
            
            const insights = await analyzer.analyze(
                responseArtifacts,
                sessionHistory,
                currentConfidence,
                turn
            );

            // Inject insights into next iteration via thinkingSlot
            workingCtx = {
                ...workingCtx,
                thinkingSlot: {
                    ...((workingCtx['thinkingSlot'] as Record<string, unknown>) ?? {}),
                    analyzer_insights: insights,
                    recommended_strategy: insights.recommended_strategy,
                }
            };
            
            // -- EXPERIENCE BANK (POST) --
            try {
                await globalExperienceBank.recordTurn(
                    (workingCtx['session_id'] as string) || 'unknown',
                    `turn-${turn}`,
                    JSON.stringify(workingCtx),
                    { type: 'interrupt', payload: interrupt.reason },
                    insights.confidence_delta
                );
            } catch (err) {
                logger.warn('[GrayRoom] ExperienceBank record failure', { error: String(err) });
            }
            // ------------------------------------------------

            logger.info('[GrayRoom] Iteration start', { turn, state: currentState });

            // -- AGENT ROLE INTEGRATION (ADR-0038) --
            const activeRole = globalRoleRegistry.getRoleForState(currentState);
            const roleInstruction = globalRoleRegistry.getInstruction(activeRole);
            workingCtx = { 
                ...workingCtx, 
                agent_role: activeRole,
                system_instruction_override: roleInstruction 
            };
            logger.info('[GrayRoom] Role assigned', { role: activeRole });
            // ---------------------------------------

            // -- VISION QA INTEGRATION (ADR-0060) --
            let lastOutcome = (workingCtx['result'] as Record<string, any>)?.['outcome'] || 'noop';

            // -- OVERRIDE OUTCOME FOR REVIEW/DEBATE (ADR-0038) --
            if (currentState === 'REVIEWING' && workingCtx['REVIEW_RESULT']) {
                const res = workingCtx['REVIEW_RESULT'] as any;
                lastOutcome = res.passed ? 'review_passed' : 'review_failed';
                // Clear result for next turns if necessary, or let kernel handle it
            }
            if (currentState === 'DEBATING' && workingCtx['DEBATE_OUTCOME']) {
                lastOutcome = 'debate_resolved';
            }
            // --------------------------------------------------

            // BUG-1+BUG-5 FIX: Use kernel instance (not this.kernel) and correct signature; handle artifact
            let fsmTransition: ReturnType<OrchestratorKernel['transition']> | null = null;
            const fsmEvent = (lastOutcome === 'noop' || !lastOutcome)
                ? 'execution_complete'
                : (lastOutcome as OrchestratorEvent);
            try {
                fsmTransition = kernel.transition(fsmEvent, {});
                currentState = fsmTransition.newState;
                if (fsmTransition.artifactType) {
                    // BUG-5 FIX: Log artifact instead of silently discarding
                    logger.info('[GrayRoom] FSM artifact emitted', {
                        from: fsmTransition.previousState,
                        to: fsmTransition.newState,
                        artifact: fsmTransition.artifactType,
                    });
                }
            } catch (fsmErr) {
                // Invalid transition — log and keep current state rather than crashing
                logger.warn('[GrayRoom] FSM transition skipped', { event: fsmEvent, state: currentState, error: String(fsmErr) });
            }

            const lastAction = (workingCtx['execute'] as Record<string, any>)?.['write-file'] || 
                               (workingCtx['execute'] as Record<string, any>)?.['edit-file'];
            const isUIChange = lastAction && (
                lastAction.path?.endsWith('.html') || 
                lastAction.path?.endsWith('.css') || 
                lastAction.path?.endsWith('.vue') || 
                lastAction.path?.endsWith('.tsx') ||
                lastAction.path?.endsWith('.jsx')
            );

            if (isUIChange) {
                try {
                    const devUrl = 'http://localhost:5173';
                    const screenshotPath = `storage/screenshots/turn-${turn}.png`;
                    await globalVisionTester.captureScreenshot(devUrl, screenshotPath);
                    const visionResult = await globalVisionTester.performVisualQA(screenshotPath, (workingCtx['task'] as string) || 'UI matching manifesto');
                    
                    if (!visionResult.passed) {
                        workingCtx = {
                            ...workingCtx,
                            visual_critique: visionResult.critique,
                            thinkingSlot: {
                                ...((workingCtx['thinkingSlot'] as Record<string, unknown>) ?? {}),
                                visual_feedback: visionResult.critique
                            }
                        };
                        logger.warn('[GrayRoom] Vision QA failed, injecting critique', { critique: visionResult.critique });
                    } else {
                        logger.info('[GrayRoom] Vision QA passed');
                    }
                } catch (err) {
                    // BUG-3 FIX: Log the actual error, not a misleading state-transition message
                    logger.warn('[GrayRoom] Vision QA error (non-fatal, continuing)', { error: String(err) });
                }
            }
            // --------------------------------------

            // -- SPECIAL HANDLING FOR REVIEWING STATE --
            if (currentState === 'REVIEWING') {
                logger.info('[GrayRoom] Entering Review Phase');
                workingCtx['task'] = `Review the recent execution. Find bugs or design flaws. Return 'passed: true' or 'passed: false' with critique.`;
            }
            // -----------------------------------------

            const {nextCtx, continueLoop} = await this.applyInterrupt(
                interrupt, workingCtx, promiseId, trace
            );

            if (continueLoop && typeof interrupt.schema === 'string' && interrupt.schema.trim() !== '') {
                activeSchemaName = interrupt.schema.trim();
            }

            trace.push({
                kind: 'interrupt_handler',
                reason: interrupt.reason,
                continueLoop,
                note: interrupt.reason === 'auto_rag_page' ? 'merge_context_reenter' : undefined,
            });

            touchGrayRoom({
                phase: 'interrupt_handler',
                lastReason: interrupt.reason,
                turn,
                remainingBudget: interruptBudget,
            });

            if (!continueLoop) {
                const normalizedExecute = rawOutput.execute as ProcessResult['execute'] | undefined;
                const mergedInner = mergeGrayRoomFinalizeInnerContext(
                    rawOutput.context as Record<string, unknown> | undefined,
                    nextCtx
                );
                const res: ProcessResult = {
                    outcome: 'completed',
                    context: mergedInner,
                    execute: normalizedExecute,
                };
                this.warnOnInvalidExecute(res, 'grayRoom.finalize', activeSchemaName, rawOutput);
                touchGrayRoom({phase: 'completed', status: 'completed', turn, remainingBudget: interruptBudget});
                resolve(this.mergeTraceIntoResult(res, trace, grayRoom));
                return;
            }

            workingCtx = nextCtx;

            // Rebuild request for next LLM turn
            const outputDir = await this.createTempDir();
            const invokeShape = toInvokeShapeForPromptsTransform(workingCtx);
            const requestTransformResult = await runPromptsTransform(
                this.promptsTransformsPath,
                activeSchemaName,
                invokeShape,
                'request',
                {forceServerTransforms: true, outputDir}
            );

            if (!requestTransformResult.success) {
                resolve({
                    outcome: 'failed',
                    error: requestTransformResult.error || 'Request transform failed (gray room loop)',
                } as ProcessResult);
                return;
            }

            trace.push({kind: 'request_rebuild'});
            touchGrayRoom({phase: 'follow_up_llm', turn, remainingBudget: interruptBudget});
            const files = (requestTransformResult.files as Record<string, string>) || {};
            const requestMd = files['request.md'];
            if (!requestMd) {
                resolve({
                    outcome: 'failed',
                    error: 'Request transform did not produce request.md (gray room)',
                } as ProcessResult);
                return;
            }

            const messages = prepareLlmMessages(
                files,
                (workingCtx['system_instruction_override'] as string | undefined) || undefined
            );

            const subHeader = `${promiseId}-intr-${interruptBudget}`;
            const llmModel = resolveGrayRoomLlmModelFromContext(workingCtx, this.model);
            const chatInit = await initAiHubChatPromise(this.aiHubUrl, subHeader, {
                model: llmModel,
                messages,
                stream: false,
            });
            if (!chatInit.ok) {
                if (chatInit.reason === 'bad_http_status') {
                    logger.error('[GrayRoom] LLM promise init failed', {
                        status: chatInit.status,
                        error: chatInit.bodyText,
                    });
                    resolve({
                        outcome: 'failed',
                        error: `LLM error (gray room): ${chatInit.status} ${chatInit.bodyText.slice(0, 200)}`,
                    } as ProcessResult);
                } else {
                    resolve({outcome: 'failed', error: 'No promiseId in LLM response (gray room)'} as ProcessResult);
                }
                return;
            }

            const subLlmId = chatInit.llmPromiseId;
            const nextMd = await pollReadyThenFetch(this.aiHubUrl, subLlmId);
            if (!nextMd) {
                resolve({outcome: 'failed', error: 'LLM response fetch failed (gray room)'} as ProcessResult);
                return;
            }
            md = nextMd;
            turn++;
            
            // -- INTENT GATE TURN COUNT (ADR-0050) --
            globalIntentGate.incrementTurn();
            
            // -- HARD TIMEOUT CIRCUIT BREAKER --
            const elapsedMs = Date.now() - sessionStartTime;
            const HARD_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes hard cap
            if (elapsedMs >= HARD_TIMEOUT_MS) {
                logger.error('[GrayRoom] Hard timeout reached', { elapsedMs, turn });
                touchGrayRoom({
                    phase: 'completed',
                    status: 'truncated',
                    turn,
                    remainingBudget: 0,
                    lastReason: 'hard_timeout',
                });
                const timeoutCtxBase =
                    result.context && typeof result.context === 'object' && !Array.isArray(result.context)
                        ? {...(result.context as Record<string, unknown>)}
                        : {...workingCtx};
                resolve(this.mergeTraceIntoResult(
                    {...result, context: {...timeoutCtxBase, hard_timeout: true}} as ProcessResult,
                    trace,
                    grayRoom
                ));
                return;
            }
            // -----------------------------------

            // -- HANDLE REVIEW OUTCOME (ADR-0038) --
            if (currentState === 'REVIEWING') {
                const isPassed = md.toLowerCase().includes('passed: true');
                // BUG-6 FIX: Renamed from 'result' to 'reviewResult' to avoid shadowing ProcessResult
                const reviewResult = {
                    passed: isPassed,
                    critique: md,
                    turn: turn
                };
                workingCtx['REVIEW_RESULT'] = reviewResult;
                logger.info('[GrayRoom] Review outcome recorded', { passed: isPassed });
                // Trigger FSM event for review outcome
                try {
                    const reviewEvent: OrchestratorEvent = isPassed ? 'review_passed' : 'review_failed';
                    const reviewTransition = kernel.transition(reviewEvent, {});
                    currentState = reviewTransition.newState;
                    logger.info('[GrayRoom] FSM review transition', { to: currentState });
                } catch (fsmErr) {
                    logger.warn('[GrayRoom] FSM review transition skipped', { error: String(fsmErr) });
                }
            }
            // -------------------------------------

            // BUG-7 FIX: Use direct await recursion instead of setImmediate to avoid
            // unpredictable I/O-queue delays under load.
            await processTick();
            return;
        };

        // Start the actor loop (BUG-7 FIX: direct await, not setImmediate)
        await processTick();
    });
    }

    private async createTempDir(): Promise<string> {
        return mkdtempOsTmp('a2a-gray-room-');
    }

    private async runResponseTransform(
        schemaName: string,
        ctx: Record<string, unknown>,
        responseMd: string,
        _recovered: boolean
    ): Promise<{result: ProcessResult; rawOutput: Record<string, unknown>} | null> {
        try {
            const {writeFile} = await import('node:fs/promises');
            const tempDir = await this.createTempDir();
            await writeFile(path.join(tempDir, 'response.md'), responseMd, 'utf-8');
            
            const responseData = {context: ctx, llm: {response: responseMd}};
            const responseTransformResult = await runPromptsTransform(
                this.promptsTransformsPath,
                schemaName,
                responseData,
                'response',
                {baseDir: tempDir, forceServerTransforms: true}
            );
            if (!responseTransformResult.success) {
                logger.error('[GrayRoom] Response transform pipeline failed', {
                    error: responseTransformResult.error ?? 'unknown',
                });
                return null;
            }
            const output = responseTransformResult.output;
            const rawOutput = output as Record<string, unknown>;

            const intrRaw = rawOutput['interrupt'];
            const interruptPassthrough =
                intrRaw && typeof intrRaw === 'object' && !Array.isArray(intrRaw)
                    ? (intrRaw as Record<string, unknown>)
                    : undefined;

            const result: ProcessResult = {
                outcome: 'completed',
                context: rawOutput.context as Record<string, unknown> | undefined ?? ctx,
                execute: rawOutput.execute as ProcessResult['execute'] | undefined,
                ...(interruptPassthrough ? {interrupt: interruptPassthrough} : {}),
            };
            this.warnOnInvalidExecute(result, 'runResponseTransform', schemaName, rawOutput);

            return {rawOutput, result};
        } catch (err) {
            logger.error('[GrayRoom] Transform error', { error: err });
            return null;
        }
    }

    private extractInterrupt(output: Record<string, unknown>): InterruptDirective | null {
        const raw = output['interrupt'];
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
        const d = raw as Record<string, unknown>;
        if (typeof d.reason !== 'string') return null;
        return d as unknown as InterruptDirective;
    }

    private interruptWhenSatisfied(interrupt: InterruptDirective, ctx: Record<string, unknown>): boolean {
        const w = interrupt.when;
        if (!w) return true;

        const len = resolveHistoryLength(ctx);

        if (w.historyMinLength != null && len < w.historyMinLength) return false;
        if (w.historyMaxLength != null && len > w.historyMaxLength) return false;
        return true;
    }

    private async applyInterrupt(
        interrupt: InterruptDirective,
        ctx: Record<string, unknown>,
        promiseId: string,
        trace: ServerInterruptTraceEvent[]
    ): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
        const { reason, context: extraCtx } = interrupt;
        let nextCtx = extraCtx ? { ...ctx, ...extraCtx } : { ...ctx };

        switch (reason) {
            case 'compress_history': {
                return await handleCompressHistory(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            case 'thinking': {
                return await handleThinking(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            case 'auto_read_file': {
                return await handleAutoReadFile(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            case 'auto_rag_page': {
                return await handleAutoRagPage(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            case 'clarify': {
                return await handleClarify(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            case 'algorithm_invoke': {
                return await handleAlgorithmInvoke(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            default:
                logger.warn('[GrayRoom] Unknown reason', { reason });
                return { nextCtx, continueLoop: false };
        }
    }

    /**
     * Halt an active gray room loop by promiseId.
     */
    static halt(promiseId: string): boolean {
        const controller = this.activeControllers.get(promiseId);
        if (controller) {
            controller.abort();
            this.activeControllers.delete(promiseId);
            return true;
        }
        return false;
    }

    private mergeTraceIntoResult(
        result: ProcessResult,
        trace: ServerInterruptTraceEvent[],
        grayRoom?: GrayRoomControlEnvelope
    ): ProcessResult {
        let ctx: Record<string, unknown> =
            result.context && typeof result.context === 'object' && !Array.isArray(result.context)
                ? (result.context as Record<string, unknown>)
                : {};
        if (trace.length > 0) {
            ctx = mergeInterruptTraceIntoContext(ctx, trace);
        }
        if (grayRoom) {
            ctx = mergeGrayRoomSlotIntoContext(ctx, grayRoom);
        }
        return {...result, context: ctx};
    }

    private warnOnInvalidExecute(
        result: ProcessResult,
        source: string,
        schemaName: string,
        rawTransformOutput?: Record<string, unknown>
    ): void {
        const topMsg =
            rawTransformOutput && typeof rawTransformOutput['message'] === 'string'
                ? (rawTransformOutput['message'] as string).trim()
                : '';
        const issues = [
            ...validateExecuteShapeForSchema(schemaName, result.execute),
            ...(schemaName === 'router' ? validateRouterResultShape(result) : []),
            ...validateLlmOutputShape({
                ...(topMsg ? {message: topMsg} : {}),
                execute: result.execute,
            }),
        ];
        if (issues.length === 0) return;
        if (shouldEnforceTransformStrictMode()) {
            throw new Error(`Gray room transform contract violation (${source}): ${issues.map(i => i.code).join(', ')}`);
        }
        logger.warn('[GrayRoom] Transform execute validation warnings', { source, issues: issues.map(i => i.code) });
    }
}

export {
    detectGrayRoomTrigger,
    shouldUseGrayRoom,
    isGrayRoomEnabled,
    getConfiguredMaxTurns,
    readGrayRoomInterruptBudget,
    type GrayRoomTriggerResult
} from './gray-room-trigger.js';

export {
    DIALOG_TOOL_EXECUTE_KEYS,
    isDialogToolExecutePayload,
    type GrayRoomOptions
} from './gray-room-utils.js';
