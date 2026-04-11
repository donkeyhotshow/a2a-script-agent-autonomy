/**
 * Inner context structure within gray room pipeline
 */
export interface GrayRoomInnerContext {
    session_id?: string;
    workbench?: unknown;
    files?: unknown;
    history?: unknown[];
    execution?: unknown;
    operationHistory?: unknown[];
    [key: string]: unknown;
}
/**
 * Top-level context structure for gray room pipeline
 */
export interface GrayRoomContext {
    context?: GrayRoomInnerContext;
    history?: unknown[];
    [key: string]: unknown;
}
/** Single-key `execute` payloads that must pass through to the client (tool rounds). */
export declare const DIALOG_TOOL_EXECUTE_KEYS: readonly ["rag-search", "read-file", "write-file", "execute-command", "list-directory", "grep-search", "script"];
/** True when `execute` is a single allowed dialog tool key (tool round, not form/chat). */
export declare function isDialogToolExecutePayload(execute: Record<string, unknown> | null | undefined): boolean;
/**
 * Merge transform `context` with handler output for gray-room finalize (`continueLoop: false`).
 * Handlers update `nextCtx.context` (workbench.slots, files, compressed history); using only
 * `rawOutput.context` would drop those updates.
 */
export declare function mergeGrayRoomFinalizeInnerContext(rawInner: Record<string, unknown> | undefined, nextCtx: GrayRoomContext): Record<string, unknown> | undefined;
export interface GrayRoomOptions {
    maxInterruptTurns?: number;
    aiHubUrl?: string;
    model?: string;
    promptsTransformsPath: string;
}
/**
 * Result of a review operation in gray room
 */
export interface ReviewResult {
    passed: boolean;
    critique: string;
    turn: number;
}
/** Immutably set `context.workbench.slots[slotKey]` on a shallow-copied root context. */
export declare function mergeSlotIntoWorkbenchContext(ctx: GrayRoomContext, slotKey: string, slotValue: unknown): GrayRoomContext;
//# sourceMappingURL=gray-room-utils.d.ts.map