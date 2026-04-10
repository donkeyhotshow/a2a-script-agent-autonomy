import { mergeSlotIntoWorkbenchContext } from '../gray-room-utils.js';
import { BaseGrayRoomHandler } from './base-handler.js';
/**
 * Handle clarify interrupt
 * Adds clarification data to workbench slots
 */
export class HandleClarify extends BaseGrayRoomHandler {
    async handleInterrupt(interrupt, ctx, promiseId, aiHubUrl, model, trace) {
        const nextCtx = mergeSlotIntoWorkbenchContext(ctx, 'clarify', interrupt.data ?? {});
        trace.push({ kind: 'sidecar_llm', purpose: 'clarify', ok: true, meta: 'slots.clarify' });
        return { nextCtx, continueLoop: false };
    }
}
// Export a function for backward compatibility
export async function handleClarify(interrupt, ctx, promiseId, aiHubUrl, model, trace) {
    const handler = new HandleClarify();
    return handler.handle(interrupt, ctx, promiseId, aiHubUrl, model, trace);
}
//# sourceMappingURL=clarify.js.map