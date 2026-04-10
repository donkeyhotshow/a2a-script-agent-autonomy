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
export type GrayRoomTriggerSource = 'env_enabled' | 'explicit_flag' | 'policy_dialog' | 'policy_agent' | 'policy_task_decomposition' | 'disabled';
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
 * @param ctx - Request context (normalized invoke / dialog shape)
 */
export declare function detectGrayRoomTrigger(ctx: Record<string, unknown>): GrayRoomTriggerResult;
/**
 * Whether to run the full interrupt chain (vs one response-transform pass that ignores `interrupt`).
 *
 * @param ctx - Request context
 * @param flowControlHint - Optional; otherwise read from `ctx.flowControlHint` when present
 */
export declare function shouldUseGrayRoom(ctx: Record<string, unknown>, flowControlHint?: string): GrayRoomTriggerResult;
/** Max hub LLM promise resubmits before failing (`DIALOG_HUB_LLM_RESUBMIT_MAX`, default 2). */
export declare function readDialogHubLlmResubmitMax(): number;
/** Interrupt budget for `GrayRoomOrchestrator` (env `A2A_MAX_INTERRUPT_TURNS` or `A2A_GRAY_ROOM_MAX_TURNS`). */
export declare function readGrayRoomInterruptBudget(): number;
/**
 * Get current gray room enabled state (for diagnostics)
 */
export declare function isGrayRoomEnabled(): boolean;
/**
 * Get current gray room max turns (for diagnostics)
 */
export declare function getConfiguredMaxTurns(): number;
//# sourceMappingURL=gray-room-trigger.d.ts.map