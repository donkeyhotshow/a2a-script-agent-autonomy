/**
 * Base class for gray room interrupt handlers to eliminate duplication
 */
export class BaseGrayRoomHandler {
    /**
     * Template method that handles the common logic
     */
    async handle(interrupt, ctx, promiseId, aiHubUrl, model, trace) {
        // Create initial context copy
        let nextCtx = { ...ctx };
        // Call the specific handler implementation
        const result = await this.handleInterrupt(interrupt, nextCtx, promiseId, aiHubUrl, model, trace);
        // Ensure we return the correct type
        return {
            nextCtx: result.nextCtx,
            continueLoop: result.continueLoop
        };
    }
}
//# sourceMappingURL=base-handler.js.map