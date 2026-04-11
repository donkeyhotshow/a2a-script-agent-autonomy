import type { ProcessResult } from "./request-processor.interfaces";
import { GrayRoomOptions } from "./gray-room-utils";
export declare class GrayRoomOrchestrator {
    private maxInterruptTurns;
    private aiHubUrl;
    private model;
    private promptsTransformsPath;
    private static activeControllers;
    constructor(options: GrayRoomOptions);
    /**
     * Run the Gray Room interrupt loop starting from an initial LLM response.
     * @param processInterrupts When false (gray room opted off), one response transform only; `interrupt` is ignored.
     */
    runLoop(ctx: Record<string, unknown>, schemaName: string, responseMd: string, promiseId: string, recovered?: boolean, processInterrupts?: boolean): Promise<ProcessResult>;
    private createTempDir;
    private runResponseTransform;
    private extractInterrupt;
    /** `result.completed` from response transforms (agent/dialog/coder); optional top-level `completed` fallback. */
    private isResponseTransformCompleted;
    private interruptWhenSatisfied;
    private applyInterrupt;
    /**
     * Halt an active gray room loop by promiseId.
     */
    static halt(promiseId: string): boolean;
    private mergeTraceIntoResult;
    private warnOnInvalidExecute;
}
//# sourceMappingURL=gray-room-orchestrator.d.ts.map