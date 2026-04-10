import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';
import type {GrayRoomContext} from '../gray-room-utils.js';

/**
 * Base class for gray room interrupt handlers to eliminate duplication
 */
export abstract class BaseGrayRoomHandler {
  /**
   * Handle the interrupt - to be implemented by subclasses
   */
  protected abstract handleInterrupt(
    interrupt: InterruptDirective,
    ctx: GrayRoomContext,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
  ): Promise<{ nextCtx: GrayRoomContext; continueLoop: boolean }>;

  /**
   * Template method that handles the common logic
   */
  public async handle(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
  ): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    // Create initial context copy
    let nextCtx: GrayRoomContext = { ...ctx };
    
    // Call the specific handler implementation
    const result = await this.handleInterrupt(
      interrupt,
      nextCtx,
      promiseId,
      aiHubUrl,
      model,
      trace
    );
    
    // Ensure we return the correct type
    return {
      nextCtx: result.nextCtx,
      continueLoop: result.continueLoop
    };
  }
}