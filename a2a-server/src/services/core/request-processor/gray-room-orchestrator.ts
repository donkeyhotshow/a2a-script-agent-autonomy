import * as path from 'path';
import {logger} from '../../../utils/logger.js';
import {runPromptsTransform} from '../../../transform/index.js';
import type {GrayRoomControlEnvelope, InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';
import {mergeGrayRoomSlotIntoContext, mergeInterruptTraceIntoContext} from '../../../transform/interrupt-trace-contract.js';
import {executeReadFile} from '../../../actions/handlers/file-operations.js';
import {mergeServerRagPageIntoContext} from '../../rag/auto-rag-page-server.js';
import {pollReadyThenFetch} from '../../../daemon/llm-hub-poll.js';
import {BlackRoomOrchestrator} from '../black-room/black-room-orchestrator.js';
import type {AlgorithmContext, AlgorithmData} from '../black-room/types.js';
import type {ProcessResult} from './request-processor.interfaces.js';
import {validateDialogExecuteShape, validateLlmOutputShape, shouldEnforceTransformStrictMode} from './validators/transform-execute-validator.js';
import {resolveExecution, resolveHistoryLength} from './normalization.js';
import {grayRoomLlmModelFallback, resolveGrayRoomLlmModelFromContext} from './llm-model-resolver.js';

// Import trigger detection logic
import {
    detectGrayRoomTrigger,
    shouldUseGrayRoom,
    isGrayRoomEnabled,
    getConfiguredMaxTurns,
    readGrayRoomInterruptBudget,
    GrayRoomTriggerResult
} from './gray-room-trigger.js';

// Import utilities
import {
    DIALOG_TOOL_EXECUTE_KEYS,
    isDialogToolExecutePayload,
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

const DEFAULT_AI_HUB = 'http://localhost:11434';

export class GrayRoomOrchestrator {
    private maxInterruptTurns: number;
    private aiHubUrl: string;
    private model: string;
    private promptsTransformsPath: string;

    constructor(options: GrayRoomOptions) {
        this.maxInterruptTurns = options.maxInterruptTurns ?? readGrayRoomInterruptBudget();
        this.aiHubUrl = (options.aiHubUrl ?? process.env.AI_HUB_URL ?? DEFAULT_AI_HUB).replace(/\/$/, '');
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
                this.warnOnInvalidExecute(res, 'grayRoom.finalize');
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
            const llmModel = resolveGrayRoomLlmModelFromContext(workingCtx, this.model);
            const chatRes = await fetch(`${this.aiHubUrl}/api/chat?promise=1`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Server-Promise-Id': subHeader,
                },
                body: JSON.stringify({
                    model: llmModel,
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
            this.warnOnInvalidExecute(result, 'runResponseTransform');

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

    private warnOnInvalidExecute(result: ProcessResult, source: string): void {
        const issues = [
            ...validateDialogExecuteShape(result.execute),
            ...validateLlmOutputShape(result)
        ];
        if (issues.length === 0) return;
        if (shouldEnforceTransformStrictMode()) {
            throw new Error(`Gray room transform contract violation (${source}): ${issues.map(i => i.code).join(', ')}`);
        }
        logger.warn('[GrayRoom] Transform execute validation warnings', { source, issues: issues.map(i => i.code) });
    }
}