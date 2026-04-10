import * as path from 'path';
import {logger} from '../../../utils/logger.js';
import {runPromptsTransform} from '../../../transform/index.js';
import type {GrayRoomControlEnvelope, InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';
import {mergeGrayRoomSlotIntoContext, mergeInterruptTraceIntoContext} from '../../../transform/interrupt-trace-contract.js';
import {executeReadFile} from '../../../actions/handlers/file-operations.js';
import {mergeServerRagPageIntoContext} from '../../rag/auto-rag-page-server.js';
import {pollReadyThenFetch} from '../../../daemon/llm-hub-poll.js';
import type {ProcessResult} from './request-processor.interfaces.js';
import {validateDialogExecuteShape, shouldEnforceTransformStrictMode} from './validators/transform-execute-validator.js';
import {MetaReasoner, type ProgressReport} from './meta-reasoner.js';
import {MetacognitiveAudit, extractInternalState, type InternalState, type ProposedAction} from './metacognitive-audit.js';

const DEFAULT_AI_HUB = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3:8b';

/** Default value for A2A_GRAY_ROOM_MAX_TURNS */
const DEFAULT_GRAY_ROOM_MAX_TURNS = 10;

/** Default value for A2A_GRAY_ROOM_ENABLED (default: off) */
const DEFAULT_GRAY_ROOM_ENABLED = false;

/**
 * Gray Room Trigger Configuration
 * 
 * Controls when gray room loop should be activated.
 * Priority: (1) explicit flag in context.execution.grayRoomRequested, (2) env toggle, (3) policy for request types
 */
export interface GrayRoomTriggerConfig {
    /** Enable/disable gray room globally (env override) */
    enabled?: boolean;
    /** Maximum number of gray room turns (env override) */
    maxTurns?: number;
    /** Enable gray room only for specific actions (policy) */
    allowedActions?: string[];
}

/**
 * Trigger sources for gray room activation
 */
export type GrayRoomTriggerSource = 
    | 'env_enabled'           // Global env toggle A2A_GRAY_ROOM_ENABLED=1
    | 'explicit_flag'        // context.execution.grayRoomRequested = true
    | 'policy_dialog'        // Policy: action = dialog
    | 'policy_agent'         // Policy: action = agent
    | 'policy_task_decomposition' // Policy: action = task-decomposition
    | 'disabled';            // Gray room disabled

/**
 * Gray Room trigger detection result
 */
export interface GrayRoomTriggerResult {
    /** Whether gray room should be triggered */
    shouldTrigger: boolean;
    /** Source that triggered gray room */
    source: GrayRoomTriggerSource;
    /** Max turns allowed (null if disabled) */
    maxTurns: number | null;
}

/**
 * Check if gray room should be triggered based on request context
 * 
 * Priority of evaluation:
 * 1. Explicit flag: context.execution.grayRoomRequested
 * 2. Environment toggle: A2A_GRAY_ROOM_ENABLED
 * 3. Policy for request types: dialog, agent, task-decomposition
 * 
 * @param ctx - Request context
 * @returns GrayRoomTriggerResult with decision and source
 */
export function detectGrayRoomTrigger(ctx: Record<string, unknown>): GrayRoomTriggerResult {
    // Check explicit flag first (highest priority)
    const execution = (ctx['context'] as Record<string, unknown> | undefined)?.['execution'] as Record<string, unknown> | undefined;
    const explicitFlag = execution?.['grayRoomRequested'];
    
    if (explicitFlag === true) {
        const envMaxTurns = getGrayRoomMaxTurns();
        return {
            shouldTrigger: true,
            source: 'explicit_flag',
            maxTurns: envMaxTurns,
        };
    }
    
    // Check environment toggle
    const envEnabled = getGrayRoomEnabled();
    if (envEnabled) {
        const envMaxTurns = getGrayRoomMaxTurns();
        return {
            shouldTrigger: true,
            source: 'env_enabled',
            maxTurns: envMaxTurns,
        };
    }
    
    // Check policy for request types
    const action = execution?.['action'] as string | undefined;
    
    if (action === 'dialog') {
        const envMaxTurns = getGrayRoomMaxTurns();
        return {
            shouldTrigger: true,
            source: 'policy_dialog',
            maxTurns: envMaxTurns,
        };
    }
    
    if (action === 'agent' || action === 'coder' || action === 'auto-ai' || action === 'analyze') {
        const envMaxTurns = getGrayRoomMaxTurns();
        return {
            shouldTrigger: true,
            source: 'policy_agent',
            maxTurns: envMaxTurns,
        };
    }
    
    if (action === 'task-decomposition' || action === 'task') {
        const envMaxTurns = getGrayRoomMaxTurns();
        return {
            shouldTrigger: true,
            source: 'policy_task_decomposition',
            maxTurns: envMaxTurns,
        };
    }
    
    // Default: disabled
    return {
        shouldTrigger: false,
        source: 'disabled',
        maxTurns: null,
    };
}

/**
 * Get A2A_GRAY_ROOM_ENABLED from environment (default: off)
 */
function getGrayRoomEnabled(): boolean {
    const envValue = process.env.A2A_GRAY_ROOM_ENABLED;
    if (envValue === undefined || envValue === null) {
        return DEFAULT_GRAY_ROOM_ENABLED;
    }
    // Accept: '1', 'true', 'yes' as enabled
    const normalized = envValue.toLowerCase().trim();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

/**
 * Get A2A_GRAY_ROOM_MAX_TURNS from environment (default: 10)
 */
function getGrayRoomMaxTurns(): number {
    const envValue = process.env.A2A_GRAY_ROOM_MAX_TURNS;
    if (envValue === undefined || envValue === null) {
        return DEFAULT_GRAY_ROOM_MAX_TURNS;
    }
    const parsed = parseInt(envValue, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
        return DEFAULT_GRAY_ROOM_MAX_TURNS;
    }
    return Math.min(parsed, 100); // Cap at 100 turns
}

/**
 * Check if gray room should run based on context and environment
 * 
 * This is the main entry point for determining whether to run gray room loop.
 * Used by DialogRequestProcessor and other processors to decide whether
 * to invoke gray room after LLM response.
 * 
 * Priority of evaluation:
 * 1. Explicit flag: context.execution.grayRoomRequested = true
 * 2. flowControlHint: "gray-room" in invoke payload
 * 3. Environment toggle: A2A_GRAY_ROOM_ENABLED
 * 4. Policy for request types: dialog, agent, task-decomposition
 * 
 * @param ctx - Request context
 * @param flowControlHint - Optional flowControlHint from invoke payload
 * @returns GrayRoomTriggerResult with decision and source
 */
export function shouldUseGrayRoom(ctx: Record<string, unknown>, flowControlHint?: string): GrayRoomTriggerResult {
    // Check explicit flag first (highest priority)
    const execution = (ctx['context'] as Record<string, unknown> | undefined)?.['execution'] as Record<string, unknown> | undefined;
    const explicitFlag = execution?.['grayRoomRequested'];
    
    if (explicitFlag === true) {
        return {
            shouldTrigger: true,
            source: 'explicit_flag',
            maxTurns: getGrayRoomMaxTurns(),
        };
    }
    
    // Check flowControlHint (second priority)
    if (flowControlHint === 'gray-room' || flowControlHint === 'gray_room') {
        return {
            shouldTrigger: true,
            source: 'explicit_flag',
            maxTurns: getGrayRoomMaxTurns(),
        };
    }
    
    // Check environment toggle (third priority)
    if (getGrayRoomEnabled()) {
        return {
            shouldTrigger: true,
            source: 'env_enabled',
            maxTurns: getGrayRoomMaxTurns(),
        };
    }
    
    // Check policy for request types (lowest priority)
    const action = execution?.['action'] as string | undefined;
    
    if (action === 'dialog') {
        return {
            shouldTrigger: true,
            source: 'policy_dialog',
            maxTurns: getGrayRoomMaxTurns(),
        };
    }
    
    if (action === 'agent' || action === 'coder' || action === 'auto-ai' || action === 'analyze') {
        return {
            shouldTrigger: true,
            source: 'policy_agent',
            maxTurns: getGrayRoomMaxTurns(),
        };
    }
    
    if (action === 'task-decomposition' || action === 'task') {
        return {
            shouldTrigger: true,
            source: 'policy_task_decomposition',
            maxTurns: getGrayRoomMaxTurns(),
        };
    }
    
    // Default: disabled
    return {
        shouldTrigger: false,
        source: 'disabled',
        maxTurns: null,
    };
}

/**
 * Get current gray room enabled state (for diagnostics)
 */
export function isGrayRoomEnabled(): boolean {
    return getGrayRoomEnabled();
}

/**
 * Get current gray room max turns (for diagnostics)
 */
export function getConfiguredMaxTurns(): number {
    return getGrayRoomMaxTurns();
}

/** Single-key `execute` payloads that must pass through to the client (tool rounds). */
export const DIALOG_TOOL_EXECUTE_KEYS = [
    'rag-search',
    'read-file',
    'write-file',
    'execute-command',
    'list-directory',
    'grep-search',
    'script',
] as const;

/** True when `execute` is a single allowed dialog tool key (tool round, not form/chat). */
export function isDialogToolExecutePayload(
    execute: Record<string, unknown> | null | undefined
): boolean {
    if (!execute || typeof execute !== 'object' || Array.isArray(execute)) {
        return false;
    }
    const keys = Object.keys(execute);
    if (keys.length !== 1) {
        return false;
    }
    return (DIALOG_TOOL_EXECUTE_KEYS as readonly string[]).includes(keys[0]!);
}

export interface GrayRoomOptions {
    maxInterruptTurns?: number;
    aiHubUrl?: string;
    model?: string;
    promptsTransformsPath: string;
}

export class GrayRoomOrchestrator {
    private maxInterruptTurns: number;
    private aiHubUrl: string;
    private model: string;
    private promptsTransformsPath: string;
    private metaReasoner: MetaReasoner;
    private enableMetacognition: boolean;

    constructor(options: GrayRoomOptions) {
        this.maxInterruptTurns = options.maxInterruptTurns ?? 10;
        this.aiHubUrl = (options.aiHubUrl ?? process.env.AI_HUB_URL ?? DEFAULT_AI_HUB).replace(/\/$/, '');
        this.model = options.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;
        this.promptsTransformsPath = options.promptsTransformsPath;
        this.metaReasoner = new MetaReasoner({
            enabled: process.env.A2A_METACOGNITION_ENABLED !== 'false',
            confidenceThreshold: parseFloat(process.env.A2A_METACOGNITION_THRESHOLD ?? '0.7'),
        });
        this.enableMetacognition = process.env.A2A_METACOGNITION_ENABLED !== 'false';
    }

    /**
     * Run the Gray Room interrupt loop starting from an initial LLM response.
     */
    async runLoop(
        ctx: Record<string, unknown>,
        schemaName: string,
        responseMd: string,
        promiseId: string,
        recovered: boolean = false
    ): Promise<ProcessResult> {
        let workingCtx = ctx;
        let md = responseMd;
        let isRecovered = recovered;
        let interruptBudget = this.maxInterruptTurns;
        let activeSchemaName = schemaName;
        const trace: ServerInterruptTraceEvent[] = [];
        let turn = 0;
        let restartCount = 0;
        const MAX_RESTARTS = 2;
        const startedAt = new Date().toISOString();
        const grayRoom: GrayRoomControlEnvelope = {
            enabled: true,
            planId: promiseId,
            phase: 'response_transform',
            maxTurns: this.maxInterruptTurns,
            turn: 0,
            status: 'running',
            timestamps: {startedAt, lastUpdateAt: startedAt},
            remainingBudget: interruptBudget,
            traceRef: {length: 0},
        };

        const touchGrayRoom = (patch: Partial<GrayRoomControlEnvelope>): void => {
            Object.assign(grayRoom, patch);
            grayRoom.timestamps = {startedAt, lastUpdateAt: new Date().toISOString()};
            grayRoom.traceRef = {length: trace.length};
        };

        for (;;) {
            touchGrayRoom({phase: 'response_transform', turn, remainingBudget: interruptBudget});

            // Generate progress report for Meta-Reasoner
            const progressReport = this.generateProgressReport(turn, md, workingCtx, interruptBudget);
            this.metaReasoner.updateConfidenceMetric(progressReport.confidence);
            const strategyRecommendation = await this.metaReasoner.evaluateProgress(progressReport);

            logger.debug('[GrayRoom] Meta-Reasoner recommendation', {strategy: strategyRecommendation.strategy, reason: strategyRecommendation.reason});

            // Apply strategy recommendation
            switch (strategyRecommendation.strategy) {
                case 'BACKTRACK':
                    trace.push({kind: 'meta_reasoner_strategy', strategy: 'BACKTRACK', reason: strategyRecommendation.reason});
                    // Simulate backtracking by reducing interrupt budget and potentially modifying context
                    interruptBudget = Math.max(0, interruptBudget - 2); // Penalize backtracking
                    // In a real scenario, this might involve reverting state files or specific context elements
                    break;
                case 'SWITCH_APPROACH':
                    trace.push({kind: 'meta_reasoner_strategy', strategy: 'SWITCH_APPROACH', reason: strategyRecommendation.reason});
                    // Force a new approach, potentially by resetting some context or changing schema
                    interruptBudget = Math.max(0, interruptBudget - 3); // Penalize switching approach
                    // This might involve changing activeSchemaName or injecting new prompts
                    break;
                case 'RESTART':
                    trace.push({kind: 'meta_reasoner_strategy', strategy: 'RESTART', reason: strategyRecommendation.reason});
                    if (restartCount >= MAX_RESTARTS) {
                        logger.warn('[GrayRoom] Max restarts reached, continuing with CONTINUE instead', {restartCount});
                        trace.push({kind: 'meta_reasoner_strategy', strategy: 'CONTINUE', reason: 'max_restarts_reached'});
                        break;
                    }
                    restartCount++;
                    this.metaReasoner.reset();
                    interruptBudget = this.maxInterruptTurns;
                    workingCtx = ctx;
                    md = responseMd;
                    turn = 0;
                    activeSchemaName = schemaName;
                    continue;
                case 'REFINE':
                    trace.push({kind: 'meta_reasoner_strategy', strategy: 'REFINE', reason: strategyRecommendation.reason});
                    // Inject a clarification or refinement prompt into the next LLM call
                    // This will be handled by modifying the request.md in the next turn
                    break;
                case 'CONTINUE':
                default:
                    // Continue as normal
                    break;
            }

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
                return {outcome: 'failed', error: 'Response transform failed'} as ProcessResult;
            }

            const {result, rawOutput} = pair;
            const interrupt = this.extractInterrupt(rawOutput);
            trace.push({
                kind: 'response_transform',
                interruptReason: interrupt?.reason,
            });

            if (!interrupt) {
                touchGrayRoom({phase: 'completed', status: 'completed', turn, remainingBudget: interruptBudget});
                // Perform metacognitive audit before finalizing
                const auditResult = await this.performMetacognitiveAudit(md, result, workingCtx);
                if (!auditResult.passed) {
                    logger.warn('[GrayRoom] Metacognitive audit failed, triggering REFINE or BACKTRACK', {issues: auditResult.auditResult?.issues});
                    trace.push({kind: 'metacognitive_audit_failed', issues: auditResult.auditResult?.issues});
                    // If audit fails, force a REFINE or BACKTRACK to address issues
                    interruptBudget = Math.max(0, interruptBudget - 1); // Consume budget
                    // This would typically involve injecting a prompt to the LLM to address audit issues
                    // For now, we'll just continue the loop, expecting the LLM to self-correct
                    // In a more advanced setup, we might force a specific interrupt reason here
                    continue; // Re-enter loop to allow LLM to self-correct
                }
                touchGrayRoom({phase: 'completed', status: 'completed', turn, remainingBudget: interruptBudget});
                return this.mergeTraceIntoResult(result, trace, grayRoom);
            }

            if (!this.interruptWhenSatisfied(interrupt, workingCtx)) {
                trace.push({
                    kind: 'interrupt_skipped',
                    reason: interrupt.reason,
                    detail: 'when_clause_not_met',
                });
                touchGrayRoom({
                    phase: 'completed',
                    status: 'completed',
                    turn,
                    remainingBudget: interruptBudget,
                    lastReason: interrupt.reason,
                });
                // Perform metacognitive audit before finalizing
                const auditResult = await this.performMetacognitiveAudit(md, result, workingCtx);
                if (!auditResult.passed) {
                    logger.warn('[GrayRoom] Metacognitive audit failed, triggering REFINE or BACKTRACK', {issues: auditResult.auditResult?.issues});
                    trace.push({kind: 'metacognitive_audit_failed', issues: auditResult.auditResult?.issues});
                    // If audit fails, force a REFINE or BACKTRACK to address issues
                    interruptBudget = Math.max(0, interruptBudget - 1); // Consume budget
                    // This would typically involve injecting a prompt to the LLM to address audit issues
                    // For now, we'll just continue the loop, expecting the LLM to self-correct
                    // In a more advanced setup, we might force a specific interrupt reason here
                    continue; // Re-enter loop to allow LLM to self-correct
                }
                touchGrayRoom({phase: 'completed', status: 'completed', turn, remainingBudget: interruptBudget});
                return this.mergeTraceIntoResult(result, trace, grayRoom);
            }

            if (typeof interrupt.maxTurns === 'number' && Number.isFinite(interrupt.maxTurns) && interrupt.maxTurns >= 0) {
                interruptBudget = Math.min(interruptBudget, interrupt.maxTurns);
            }

            if (interruptBudget <= 0) {
                // Perform metacognitive audit before finalizing (even if truncated)
                const auditResult = await this.performMetacognitiveAudit(md, result, workingCtx);
                if (!auditResult.passed) {
                    logger.warn('[GrayRoom] Metacognitive audit failed on truncation, ignoring (budget exhausted)', {issues: auditResult.auditResult?.issues});
                    trace.push({kind: 'metacognitive_audit_failed_on_truncation', issues: auditResult.auditResult?.issues});
                    // Budget is already 0, cannot loop further — fall through to truncated result
                }
                const c = result.context as Record<string, unknown>;
                touchGrayRoom({
                    phase: 'completed',
                    status: 'truncated',
                    turn,
                    remainingBudget: 0,
                    lastReason: interrupt.reason,
                });
                return this.mergeTraceIntoResult(
                    {...result, context: {...c, interrupt_truncated: true}} as ProcessResult,
                    trace,
                    grayRoom
                );
            }
            interruptBudget--;

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
                const res: ProcessResult = {
                    outcome: 'completed',
                    context: rawOutput.context as Record<string, unknown> | undefined ?? nextCtx,
                    execute: normalizedExecute,
                };
                this.warnOnInvalidExecute(res.execute, 'grayRoom.finalize');
                // Perform metacognitive audit before finalizing
                const auditResult = await this.performMetacognitiveAudit(md, res, workingCtx);
                if (!auditResult.passed) {
                    logger.warn('[GrayRoom] Metacognitive audit failed on non-continue, triggering REFINE or BACKTRACK', {issues: auditResult.auditResult?.issues});
                    trace.push({kind: 'metacognitive_audit_failed_on_non_continue', issues: auditResult.auditResult?.issues});
                    interruptBudget = Math.max(0, interruptBudget - 1); // Consume budget
                    continue; // Re-enter loop to allow LLM to self-correct
                }
                touchGrayRoom({phase: 'completed', status: 'completed', turn, remainingBudget: interruptBudget});
                return this.mergeTraceIntoResult(res, trace, grayRoom);
            }

            workingCtx = nextCtx;

            // Rebuild request for next LLM turn
            const outputDir = await this.createTempDir();
            const requestTransformResult = await runPromptsTransform(
                this.promptsTransformsPath, activeSchemaName, workingCtx, 'request', {forceServerTransforms: true, outputDir}
            );
            
            if (!requestTransformResult.success) {
                return {
                    outcome: 'failed',
                    error: requestTransformResult.error || 'Request transform failed (gray room loop)',
                } as ProcessResult;
            }

            trace.push({kind: 'request_rebuild'});
            touchGrayRoom({phase: 'follow_up_llm', turn, remainingBudget: interruptBudget});
            const files = (requestTransformResult.files as Record<string, string>) || {};
            const requestMd = files['request.md'];
            if (!requestMd) {
                return {
                    outcome: 'failed',
                    error: 'Request transform did not produce request.md (gray room loop)',
                } as ProcessResult;
            }

            const systemMd = files['system.md'];
            const messages: Array<{role: string; content: string}> = [];
            if (typeof systemMd === 'string' && systemMd.trim().length > 0) {
                messages.push({role: 'system', content: systemMd});
            }
            messages.push({role: 'user', content: requestMd});

            const subHeader = `${promiseId}-intr-${interruptBudget}`;
            const chatRes = await fetch(`${this.aiHubUrl}/api/chat?promise=1`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Server-Promise-Id': subHeader,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    stream: false,
                }),
            });

            if (chatRes.status !== 202) {
                const errText = await chatRes.text();
                logger.error('[GrayRoom] LLM promise init failed', {status: chatRes.status, error: errText});
                return {
                    outcome: 'failed',
                    error: `LLM error (gray room): ${chatRes.status} ${errText.slice(0, 200)}`,
                } as ProcessResult;
            }

            const initData = (await chatRes.json()) as {promiseId?: string};
            const subLlmId = initData?.promiseId;
            if (!subLlmId) {
                return {outcome: 'failed', error: 'No promiseId in LLM response (gray room)'} as ProcessResult;
            }

            const nextMd = await pollReadyThenFetch(this.aiHubUrl, subLlmId);
            if (!nextMd) {
                return {outcome: 'failed', error: 'LLM response fetch failed (gray room)'} as ProcessResult;
            }
            md = nextMd;
            turn++;
        }
    }

    private async createTempDir(): Promise<string> {
        const {mkdtemp} = await import('fs/promises');
        const {tmpdir} = await import('os');
        return mkdtemp(path.join(tmpdir(), 'a2a-gray-room-'));
    }

    private async runResponseTransform(
        schemaName: string,
        ctx: Record<string, unknown>,
        responseMd: string,
        _recovered: boolean
    ): Promise<{result: ProcessResult; rawOutput: Record<string, unknown>} | null> {
        try {
            const {writeFile} = await import('fs/promises');
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

            const result: ProcessResult = {
                outcome: 'completed',
                context: rawOutput.context as Record<string, unknown> | undefined ?? ctx,
                execute: rawOutput.execute as ProcessResult['execute'] | undefined,
            };
            this.warnOnInvalidExecute(result.execute, 'runResponseTransform');

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
        
        const history = (ctx['history'] as any[]) || (ctx['context'] as any)?.history || [];
        const len = history.length;
        
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
        const { reason, context: extraCtx, data } = interrupt;
        let nextCtx = extraCtx ? { ...ctx, ...extraCtx } : { ...ctx };

        switch (reason) {
            case 'compress_history': {
                const history = (nextCtx['history'] as any[]) || (nextCtx['context'] as any)?.history || [];
                if (!Array.isArray(history) || history.length === 0) {
                    trace.push({ kind: 'sidecar_llm', purpose: 'compress_history', ok: true, meta: 'skipped_empty_history' });
                    return { nextCtx, continueLoop: false };
                }
                
                const compressPrompt = [
                    'Compress the following conversation history into 3–7 short entries (JSON array of {"role":"system"|"assistant"|"user","message":"..."}).',
                    'Preserve enough detail to continue the task: user goal, constraints, unresolved steps, file paths touched, last assistant intent.',
                    'Respond with ONLY the JSON array, no prose.',
                    '',
                    'History:',
                    JSON.stringify(history, null, 2)
                ].join('\n');

                try {
                    const chatRes = await fetch(`${this.aiHubUrl}/api/chat?promise=1`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Server-Promise-Id': `${promiseId}-compress` },
                        body: JSON.stringify({ model: this.model, messages: [{ role: 'user', content: compressPrompt }], stream: false }),
                    });
                    if (chatRes.status === 202) {
                        const initData = (await chatRes.json()) as { promiseId?: string };
                        if (initData?.promiseId) {
                            const compressed = await pollReadyThenFetch(this.aiHubUrl, initData.promiseId);
                            if (compressed) {
                                const parsed = JSON.parse(compressed.trim());
                                if (Array.isArray(parsed)) {
                                    const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};
                                    nextCtx = { ...nextCtx, history: parsed, context: {...innerCtx, history: parsed} };
                                    trace.push({ kind: 'sidecar_llm', purpose: 'compress_history', ok: true, meta: `from=${history.length} to=${parsed.length}` });
                                }
                            }
                        }
                    }
                } catch (err) {
                    logger.warn('[GrayRoom:compress_history] Failed', { error: String(err) });
                    trace.push({ kind: 'sidecar_llm', purpose: 'compress_history', ok: false, meta: 'error' });
                }
                return { nextCtx, continueLoop: false };
            }

            case 'thinking': {
                const thinkingPrompt = [
                    'Think step by step about the current task state. Be concise.',
                    'Return JSON: {"thinking": "your reasoning", "next_action": "what to do next"}',
                    '',
                    'Context:',
                    JSON.stringify(nextCtx['context'] ?? {}, null, 2)
                ].join('\n');
                try {
                    const chatRes = await fetch(`${this.aiHubUrl}/api/chat?promise=1`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Server-Promise-Id': `${promiseId}-think` },
                        body: JSON.stringify({ model: this.model, messages: [{ role: 'user', content: thinkingPrompt }], stream: false }),
                    });
                    if (chatRes.status === 202) {
                        const initData = (await chatRes.json()) as { promiseId?: string };
                        if (initData?.promiseId) {
                            const thinkMd = await pollReadyThenFetch(this.aiHubUrl, initData.promiseId);
                            if (thinkMd) {
                                const parsed = JSON.parse(thinkMd.trim());
                                const innerCtx = nextCtx['context'] as Record<string, unknown>;
                                const wb = (innerCtx['workbench'] as Record<string, unknown>) ?? {};
                                const slots = (wb['slots'] as Record<string, unknown>) ?? {};
                                nextCtx = {
                                    ...nextCtx,
                                    context: { ...innerCtx, workbench: { ...wb, slots: { ...slots, thinking: parsed } } }
                                };
                                trace.push({ kind: 'sidecar_llm', purpose: 'thinking', ok: true, meta: 'slots.thinking' });
                            }
                        }
                    }
                } catch (err) {
                    logger.warn('[GrayRoom:thinking] Failed', { error: String(err) });
                    trace.push({ kind: 'sidecar_llm', purpose: 'thinking', ok: false, meta: 'error' });
                }
                return { nextCtx, continueLoop: true };
            }

            case 'auto_read_file': {
                const fp = (data?.filePath || data?.path) as string;
                if (!fp) {
                    trace.push({ kind: 'sidecar_llm', purpose: 'auto_read_file', ok: false, meta: 'missing_path' });
                    return { nextCtx, continueLoop: false };
                }
                const out = await executeReadFile({ filePath: fp });
                if (out.success && out.content !== undefined) {
                    const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};
                    const prevFiles = (innerCtx['files'] as Record<string, string>) ?? {};
                    nextCtx = { ...nextCtx, context: { ...innerCtx, files: { ...prevFiles, [fp]: out.content } } };
                    trace.push({ kind: 'sidecar_llm', purpose: 'auto_read_file', ok: true, meta: fp });
                } else {
                    trace.push({ kind: 'sidecar_llm', purpose: 'auto_read_file', ok: false, meta: 'read_failed' });
                }
                return { nextCtx, continueLoop: false };
            }

            case 'auto_rag_page': {
                const {nextCtx: afterRag, trace: ragTrace} = await mergeServerRagPageIntoContext(nextCtx, data);
                nextCtx = afterRag;
                if (ragTrace) trace.push(ragTrace);
                const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};
                nextCtx = { ...nextCtx, context: {...innerCtx, _interrupt_reason: reason, ...(data ?? {})} };
                return { nextCtx, continueLoop: true };
            }

            case 'clarify': {
                const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};
                const wb = (innerCtx['workbench'] as Record<string, unknown>) ?? {};
                const slots = (wb['slots'] as Record<string, unknown>) ?? {};
                nextCtx = {
                    ...nextCtx,
                    context: { ...innerCtx, workbench: { ...wb, slots: { ...slots, clarify: data ?? {} } } }
                };
                trace.push({ kind: 'sidecar_llm', purpose: 'clarify', ok: true, meta: 'slots.clarify' });
                return { nextCtx, continueLoop: false };
            }

            default:
                logger.warn('[GrayRoom] Unknown reason', { reason });
                return { nextCtx, continueLoop: false };
        }
    }

    private mergeTraceIntoResult(
        result: ProcessResult,
        trace: ServerInterruptTraceEvent[],
        grayRoom?: GrayRoomControlEnvelope
    ): ProcessResult {
        if (!result.context) return result;
        let ctx = result.context as Record<string, unknown>;
        if (trace.length > 0) {
            ctx = mergeInterruptTraceIntoContext(ctx, trace);
        }
        if (grayRoom) {
            ctx = mergeGrayRoomSlotIntoContext(ctx, grayRoom);
        }
        return {...result, context: ctx};
    }

    private warnOnInvalidExecute(execute: ProcessResult['execute'] | undefined, source: string): void {
        const issues = validateDialogExecuteShape(execute);
        if (issues.length === 0) return;
        if (shouldEnforceTransformStrictMode()) {
            throw new Error(`Gray room transform contract violation (${source}): ${issues.map(i => i.code).join(', ')}`);
        }
        logger.warn('[GrayRoom] Transform execute validation warnings', { source, issues: issues.map(i => i.code) });
    }

    /**
     * Perform metacognitive audit on proposed action before finalizing
     */
    private async performMetacognitiveAudit(
        responseMd: string,
        result: ProcessResult,
        ctx: Record<string, unknown>
    ): Promise<{passed: boolean; auditResult?: any}> {
        if (!this.enableMetacognition) {
            return {passed: true};
        }

        try {
            const internalState = extractInternalState(responseMd, {
                strategy: (ctx['execution'] as Record<string, unknown> | undefined)?.['action'] as string,
                confidence: 0.5,
            });

            const proposedAction: ProposedAction = {
                type: result.execute ? Object.keys(result.execute)[0] : 'message',
                payload: result.execute ?? {},
                justification: responseMd.substring(0, 500),
            };

            const auditResult = await MetacognitiveAudit.audit(
                internalState,
                proposedAction,
                ctx
            );

            logger.info('[GrayRoom:MetacognitiveAudit] Audit completed', {
                passed: auditResult.passed,
                consistencyScore: auditResult.consistencyScore,
                issueCount: auditResult.issues.length,
            });

            return {passed: auditResult.passed, auditResult};
        } catch (err) {
            logger.warn('[GrayRoom:MetacognitiveAudit] Audit failed', {error: String(err)});
            return {passed: true};
        }
    }

    /**
     * Generate progress report for meta-reasoner
     */
    private generateProgressReport(
        turn: number,
        md: string,
        ctx: Record<string, unknown>,
        interruptBudget: number
    ): ProgressReport {
        const mdLength = md.length;
        const avgStepLength = mdLength > 0 ? mdLength / Math.max(1, turn + 1) : 0;
        const estimatedRemaining = avgStepLength > 0 ? Math.ceil(interruptBudget * avgStepLength / mdLength) : interruptBudget;

        return {
            stepNumber: turn,
            progressSummary: md.substring(0, 300),
            currentStrategy: (ctx['execution'] as Record<string, unknown> | undefined)?.['action'] as string || 'unknown',
            confidence: 0.5,
            stepsRemaining: estimatedRemaining,
            blockers: undefined,
            qualityMetrics: {
                coherence: 0.7,
                relevance: 0.7,
                completeness: 0.6,
            },
        };
    }
}
