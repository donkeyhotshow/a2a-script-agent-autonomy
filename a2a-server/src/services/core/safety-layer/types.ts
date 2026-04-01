/**
 * Safety Layer Types & Interfaces
 * Following ADR-0036 "Safety Layer" specification.
 */

export type SafetySignalSeverity = 'info' | 'moderate' | 'critical';

/**
 * Signal emitted when a potential loop is detected.
 */
export interface LoopSignal {
    /** Unique reason/key for the loop (e.g., tool + path) */
    reason: string;
    /** Outcome classification (success/failure/no-change) */
    outcomeClass: string;
    /** Context hash at the time of detection */
    contextHash: string;
    /** Current repetition count */
    count: number;
    /** Severity level based on count */
    severity: SafetySignalSeverity;
    /** Timestamp of detection */
    timestamp: string;
}

/**
 * Result of a safety intercept check.
 */
export interface SafetyInterceptResult {
    /** Whether execution should be interrupted */
    shouldInterrupt: boolean;
    /** Signal details if interrupted or warned */
    signal?: LoopSignal;
    /** Suggested next step (e.g., 'stop', 'clarify', 'continue') */
    action: 'continue' | 'stop' | 'clarify';
}

/**
 * Trace of confidence and reasoning progress.
 */
export interface ConfidenceTrace {
    /** Current confidence score (0-1) */
    score: number;
    /** Justification for the score */
    justification: string;
    /** Missing evidence or gaps identified */
    gaps: string[];
    /** Timestamp of trace */
    timestamp: string;
}

/**
 * Durable waiting state for HITL (Human-In-The-Loop).
 */
export interface WaitingState {
    /** Unique ID for the waiting state */
    id: string;
    /** Type of clarification needed ('clarify', 'confirm', 'input') */
    type: 'clarify' | 'confirm' | 'input';
    /** Message for the user */
    message: string;
    /** Optional data for the UI form */
    form?: Record<string, unknown>;
    /** Timestamp when entered waiting state */
    timestamp: string;
}
