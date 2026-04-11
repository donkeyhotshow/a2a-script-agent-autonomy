import {resolveExecution, resolveHistoryLength} from './gray-room-utils';
import {grayRoomLlmModelFallback, resolveGrayRoomLlmModelFromContext} from './llm-model-resolver';

/** Default value for A2A_GRAY_ROOM_MAX_TURNS */
const DEFAULT_GRAY_ROOM_MAX_TURNS = 10;

/** When `A2A_GRAY_ROOM_ENABLED` is unset, gray room interrupt chain is on (set to `0`/`false` to disable). */
const DEFAULT_GRAY_ROOM_ENABLED = true;

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

export { readDialogHubLlmResubmitMax } from '../../../../lib/env-utils';



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