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
import {resolveExecution, resolveHistoryLength} from './normalization.js';

const DEFAULT_AI_HUB = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3:8b';

/** Default value for A2A_GRAY_ROOM_MAX_TURNS */
const DEFAULT_GRAY_ROOM_MAX_TURNS = 10;

/** When `A2A_GRAY_ROOM_ENABLED` is unset, gray room interrupt chain is on (set to `0`/`false` to disable). */
const DEFAULT_GRAY_ROOM_ENABLED = true;

/**
 * Merge transform `context` with handler output for gray-room finalize (`continueLoop: false`).
 * Handlers update `nextCtx.context` (workbench.slots, files, compressed history); using only
 * `rawOutput.context` would drop those updates.
 */
export function mergeGrayRoomFinalizeInnerContext(
    rawInner: Record<string, unknown> | undefined,
    nextCtx: Record<string, unknown>
): Record<string, unknown> | undefined {
    const nextInner = nextCtx['context'] as Record<string, unknown> | undefined;
    if (!nextInner || typeof nextInner !== 'object' || Array.isArray(nextInner)) {
        return rawInner;
    }
    if (!rawInner) {
        return nextInner;
    }
    const rwb = rawInner['workbench'];
    const nwb = nextInner['workbench'];
    let workbenchMerged: Record<string, unknown> | undefined;
    if (rwb && typeof rwb === 'object' && !Array.isArray(rwb) && nwb && typeof nwb === 'object' && !Array.isArray(nwb)) {
        const ra = rwb as Record<string, unknown>;
        const nb = nwb as Record<string, unknown>;
        const rs = ra['sections'];
        const ns = nb['sections'];
        const rsl = ra['slots'];
        const nsl = nb['slots'];
        workbenchMerged = {
            ...ra,
            ...nb,
            ...(rs || ns
                ? {
                      sections: {
                          ...(typeof rs === 'object' && rs && !Array.isArray(rs) ? (rs as Record<string, unknown>) : {}),
                          ...(typeof ns === 'object' && ns && !Array.isArray(ns) ? (ns as Record<string, unknown>) : {}),
                      },
                  }
                : {}),
            ...(rsl || nsl
                ? {
                      slots: {
                          ...(typeof rsl === 'object' && rsl && !Array.isArray(rsl) ? (rsl as Record<string, unknown>) : {}),
                          ...(typeof nsl === 'object' && nsl && !Array.isArray(nsl) ? (nsl as Record<string, unknown>) : {}),
                      },
                  }
                : {}),
        };
    } else if (nwb && typeof nwb === 'object' && !Array.isArray(nwb)) {
        workbenchMerged = nwb as Record<string, unknown>;
    } else if (rwb && typeof rwb === 'object' && !Array.isArray(rwb)) {
        workbenchMerged = rwb as Record<string, unknown>;
    }

    return {
        ...rawInner,
        ...nextInner,
        ...(workbenchMerged !== undefined ? {workbench: workbenchMerged} : {}),
        ...(Array.isArray(nextInner['history']) ? {history: nextInner['history']} : {}),
        ...(nextInner['files'] && typeof nextInner['files'] === 'object' && !Array.isArray(nextInner['files'])
            ? {files: nextInner['files']}
            : {}),
    };
}

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
    | 'env_enabled' // Global env toggle or default-on when unset
    | 'explicit_flag' // context.execution.grayRoomRequested / flowControlHint gray-room
    | 'policy_dialog' // Policy: action = dialog
    | 'policy_agent' // Policy: action = agent
    | 'policy_task_decomposition' // Policy: action = task-decomposition
    | 'disabled'; // Gray room disabled (explicit A2A_GRAY_ROOM_ENABLED=0, …)

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

/** True when `A2A_GRAY_ROOM_ENABLED` is set to a disabling token (explicit opt-out). */
function isGrayRoomExplicitlyDisabled(): boolean {
    const v = process.env.A2A_GRAY_ROOM_ENABLED;
    if (v === undefined || v === null) return false;
    const s = String(v).trim().toLowerCase();
    if (s === '') return false;
    return s === '0' || s === 'false' || s === 'no' || s === 'off';
}

function resolveFlowControlHint(
    ctx: Record<string, unknown>,
    flowControlHint?: string
): string | undefined {
    if (typeof flowControlHint === 'string' && flowControlHint.trim() !== '') {
        return flowControlHint;
    }
    const h = ctx['flowControlHint'];
    return typeof h === 'string' && h.trim() !== '' ? h : undefined;
}

/**
 * Shared trigger resolution for `shouldUseGrayRoom` / `detectGrayRoomTrigger`.
 */
function computeGrayRoomTrigger(
    ctx: Record<string, unknown>,
    flowControlHint?: string
): GrayRoomTriggerResult {
    const execution = resolveExecution(ctx);
    const explicitFlag = execution?.['grayRoomRequested'];
    const maxTurns = getGrayRoomMaxTurns();

    if (explicitFlag === true) {
        return {shouldTrigger: true, source: 'explicit_flag', maxTurns};
    }

    const hint = resolveFlowControlHint(ctx, flowControlHint);
    if (hint === 'gray-room' || hint === 'gray_room') {
        return {shouldTrigger: true, source: 'explicit_flag', maxTurns}; // same bucket as explicit request
    }

    if (isGrayRoomExplicitlyDisabled()) {
        return {shouldTrigger: false, source: 'disabled', maxTurns: null};
    }

    if (getGrayRoomEnabled()) {
        return {shouldTrigger: true, source: 'env_enabled', maxTurns};
    }

    const action = execution?.['action'] as string | undefined;

    if (action === 'dialog') {
        return {shouldTrigger: true, source: 'policy_dialog', maxTurns};
    }

    if (action === 'agent' || action === 'coder' || action === 'auto-ai' || action === 'analyze') {
        return {shouldTrigger: true, source: 'policy_agent', maxTurns};
    }

    if (action === 'task-decomposition' || action === 'task') {
        return {shouldTrigger: true, source: 'policy_task_decomposition', maxTurns};
    }

    return {shouldTrigger: false, source: 'disabled', maxTurns: null};
}

/**
 * Check if gray room should be triggered based on request context
 *
 * @param ctx - Request context (normalized invoke / dialog shape)
 */
export function detectGrayRoomTrigger(ctx: Record<string, unknown>): GrayRoomTriggerResult {
    return computeGrayRoomTrigger(ctx, undefined);
}

/**
 * Get A2A_GRAY_ROOM_ENABLED from environment (default: {@link DEFAULT_GRAY_ROOM_ENABLED})
 */
function getGrayRoomEnabled(): boolean {
    const envValue = process.env.A2A_GRAY_ROOM_ENABLED;
    if (envValue === undefined || envValue === null) {
        return DEFAULT_GRAY_ROOM_ENABLED;
    }
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
 * Whether to run the full interrupt chain (vs one response-transform pass that ignores `interrupt`).
 *
 * @param ctx - Request context
 * @param flowControlHint - Optional; otherwise read from `ctx.flowControlHint` when present
 */
export function shouldUseGrayRoom(ctx: Record<string, unknown>, flowControlHint?: string): GrayRoomTriggerResult {
    return computeGrayRoomTrigger(ctx, flowControlHint);
}

/** Interrupt budget for `GrayRoomOrchestrator` (env `A2A_MAX_INTERRUPT_TURNS` or `A2A_GRAY_ROOM_MAX_TURNS`). */
export function readGrayRoomInterruptBudget(): number {
    const raw = process.env.A2A_MAX_INTERRUPT_TURNS;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        const n = parseInt(String(raw), 10);
        if (Number.isFinite(n) && n >= 1) {
            return Math.min(n, 100);
        }
    }
    return getGrayRoomMaxTurns();
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

    constructor(options: GrayRoomOptions) {
        this.maxInterruptTurns = options.maxInterruptTurns ?? readGrayRoomInterruptBudget();
        this.aiHubUrl = (options.aiHubUrl ?? process.env.AI_HUB_URL ?? DEFAULT_AI_HUB).replace(/\/$/, '');
        this.model = options.model ?? process.env.LLM_MODEL ?? process.env.Z_AI_MODEL ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;
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

        const touchGrayRoom = (patch: Partial<GrayRoomControlEnvelope>): void => {
            Object.assign(grayRoom, patch);
            grayRoom.timestamps = {startedAt, lastUpdateAt: new Date().toISOString()};
            grayRoom.traceRef = {length: trace.length};
        };

        for (;;) {
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
                return {outcome: 'failed', error: 'Response transform failed'} as ProcessResult;
            }

            const {result, rawOutput} = pair;
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
                return this.mergeTraceIntoResult(result, trace, grayRoom);
            }

            if (!interrupt) {
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
                return this.mergeTraceIntoResult(result, trace, grayRoom);
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
                const mergedInner = mergeGrayRoomFinalizeInnerContext(
                    rawOutput.context as Record<string, unknown> | undefined,
                    nextCtx
                );
                const res: ProcessResult = {
                    outcome: 'completed',
                    context: mergedInner,
                    execute: normalizedExecute,
                };
                this.warnOnInvalidExecute(res.execute, 'grayRoom.finalize');
                touchGrayRoom({phase: 'completed', status: 'completed', turn, remainingBudget: interruptBudget});
                return this.mergeTraceIntoResult(res, trace, grayRoom);
            }

            workingCtx = nextCtx;

            // Rebuild request for next LLM turn
            const outputDir = await this.createTempDir();
            const invokeShape: Record<string, unknown> =
                workingCtx && typeof workingCtx === 'object' && !Array.isArray(workingCtx) && 'context' in workingCtx
                    ? workingCtx
                    : {
                          context: workingCtx,
                          task:
                              (workingCtx['task'] as string | undefined) ??
                              (workingCtx['message'] as string | undefined),
                          message: workingCtx['message'],
                          result: (workingCtx['result'] as Record<string, unknown> | undefined) ?? {},
                      };
            const requestTransformResult = await runPromptsTransform(
                this.promptsTransformsPath,
                activeSchemaName,
                invokeShape,
                'request',
                {forceServerTransforms: true, outputDir}
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
}
