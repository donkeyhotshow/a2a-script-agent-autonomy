import { AgentSwing } from '../../agent-swing.js';
import { pollReadyThenFetch } from '../../../daemon/llm-hub-poll.js';
import { logger } from '../../../utils/logger.js';
import { BaseGrayRoomHandler } from './base-handler.js';
/**
 * Handle compress_history interrupt
 * Compresses conversation history into 3-7 short entries
 */
export class HandleCompressHistory extends BaseGrayRoomHandler {
    async handleInterrupt(interrupt, ctx, promiseId, aiHubUrl, model, trace) {
        let nextCtx = { ...ctx };
        const history = nextCtx.history || nextCtx.context?.history || [];
        if (!Array.isArray(history) || history.length === 0) {
            trace.push({ kind: 'sidecar_llm', purpose: 'compress_history', ok: true, meta: 'skipped_empty_history' });
            return { nextCtx: ctx, continueLoop: false };
        }
        try {
            const swing = new AgentSwing();
            const result = await swing.compressWithLookahead(history, ctx, promiseId, aiHubUrl, model, pollReadyThenFetch);
            const innerCtx = ctx.context ?? {};
            nextCtx = { ...ctx, history: result.best_history, context: { ...innerCtx, history: result.best_history } };
            trace.push({
                kind: 'sidecar_llm',
                purpose: 'compress_history',
                ok: true,
                meta: `from=${history.length} to=${result.best_history.length} score=${result.score.toFixed(2)} options=${result.options_considered}`
            });
        }
        catch (err) {
            logger.warn('[GrayRoom:compress_history] AgentSwing Failed', { error: String(err) });
            trace.push({ kind: 'sidecar_llm', purpose: 'compress_history', ok: false, meta: 'error' });
        }
        return { nextCtx, continueLoop: false };
    }
}
// Export a function for backward compatibility
export async function handleCompressHistory(interrupt, ctx, promiseId, aiHubUrl, model, trace) {
    const handler = new HandleCompressHistory();
    return handler.handle(interrupt, ctx, promiseId, aiHubUrl, model, trace);
}
//# sourceMappingURL=compress-history.js.map