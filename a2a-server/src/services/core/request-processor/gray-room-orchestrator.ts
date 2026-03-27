import * as path from 'path';
import {logger} from '../../../utils/logger.js';
import {runPromptsTransform} from '../../../transform/index.js';
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';
import {executeReadFile} from '../../../actions/handlers/file-operations.js';
import {mergeServerRagPageIntoContext} from '../../rag/auto-rag-page-server.js';
import {pollReadyThenFetch} from '../../../daemon/llm-hub-poll.js';
import type {ProcessResult} from './request-processor.interfaces.js';
import {validateDialogExecuteShape, shouldEnforceTransformStrictMode} from './validators/transform-execute-validator.js';

const DEFAULT_AI_HUB = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3:8b';

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
        this.maxInterruptTurns = options.maxInterruptTurns ?? 10;
        this.aiHubUrl = (options.aiHubUrl ?? process.env.AI_HUB_URL ?? DEFAULT_AI_HUB).replace(/\/$/, '');
        this.model = options.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;
        this.promptsTransformsPath = options.promptsTransformsPath;
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

        for (;;) {
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
                return this.mergeTraceIntoResult(result, trace);
            }

            if (!this.interruptWhenSatisfied(interrupt, workingCtx)) {
                trace.push({
                    kind: 'interrupt_skipped',
                    reason: interrupt.reason,
                    detail: 'when_clause_not_met',
                });
                return this.mergeTraceIntoResult(result, trace);
            }

            if (typeof interrupt.maxTurns === 'number' && Number.isFinite(interrupt.maxTurns) && interrupt.maxTurns >= 0) {
                interruptBudget = Math.min(interruptBudget, interrupt.maxTurns);
            }

            if (interruptBudget <= 0) {
                const c = result.context as Record<string, unknown>;
                return this.mergeTraceIntoResult(
                    {...result, context: {...c, interrupt_truncated: true}} as ProcessResult,
                    trace
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

            if (!continueLoop) {
                const normalizedExecute = rawOutput.execute as ProcessResult['execute'] | undefined;
                const res: ProcessResult = {
                    outcome: 'completed',
                    context: rawOutput.context as Record<string, unknown> | undefined ?? nextCtx,
                    execute: normalizedExecute,
                };
                this.warnOnInvalidExecute(res.execute, 'grayRoom.finalize');
                return this.mergeTraceIntoResult(res, trace);
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

    private mergeTraceIntoResult(result: ProcessResult, trace: ServerInterruptTraceEvent[]): ProcessResult {
        if (trace.length === 0 || !result.context) return result;
        const ctx = result.context as Record<string, unknown>;
        const wb = (ctx['workbench'] as Record<string, unknown>) ?? {};
        const slots = (wb['slots'] as Record<string, unknown>) ?? {};
        return {
            ...result,
            context: {
                ...ctx,
                workbench: { ...wb, slots: { ...slots, interruptTrace: trace } }
            }
        };
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
