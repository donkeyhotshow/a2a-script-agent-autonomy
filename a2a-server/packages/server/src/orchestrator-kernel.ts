/**
 * OrchestratorKernel — ADR-0052: Session Finite State Machine
 *
 * Enforces the canonical transition table, evaluates guards before each
 * transition, and emits ORCHESTRATOR_CYCLE artifacts on every state change.
 *
 * Design choices (from ADR-0052):
 *  - Single State Enum — no boolean flags
 *  - Exhaustive event → (guard → state × artifact) table
 *  - InvalidTransitionError / GuardFailedError are thrown (never swallowed)
 *  - Emergency and operator-stop events apply from ANY state
 */

import { EventEmitter } from 'events';
import { globalEventBus } from './event-bus.js';

// ── States ──────────────────────────────────────────────────────────────────

export type OrchestratorState =
  | 'IDLE'
  | 'SCANNING'
  | 'SYNTHESIZING'
  | 'ENRICHING'
  | 'EXECUTING'
  | 'SELF_CORRECTING'
  | 'WAITING_ON_HUMAN'
  | 'VALIDATING'
  | 'REVIEWING'
  | 'DEBATING'
  | 'SIEGE_REVIEW'
  | 'DELIVERING'
  | 'STOPPED';

// ── Events ───────────────────────────────────────────────────────────────────

export type OrchestratorEvent =
  | 'scan_triggered'
  | 'signals_found'
  | 'no_signals'
  | 'task_ready'
  | 'synthesis_fail'
  | 'enriched'
  | 'gate_fail'
  | 'execution_complete'
  | 'loop_detected'
  | 'tool_blocked'
  | 'attempt_success'
  | 'attempts_exhausted'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'all_pass'
  | 'any_fail'
  | 'review_passed'
  | 'review_failed'
  | 'debate_resolved'
  | 'delivered'
  | 'branch_violation'
  | 'emergency_stop'
  | 'operator_stop'
  | 'siege_passed'
  | 'siege_failed';

// ── Artifact types emitted on transitions ────────────────────────────────────

export type TransitionArtifactType =
  | 'ORCHESTRATOR_CYCLE'
  | 'OPPORTUNITY_SET'
  | 'MEMORY_INFLUENCE'
  | 'CONFIDENCE_TRACE'
  | 'EXECUTION_TRACE'
  | 'LOOP_SIGNAL'
  | 'POLICY_DECISION'
  | 'SELF_CORRECTION_ATTEMPT'
  | 'WAITING_STATE'
  | 'EXECUTION_DECISION'
  | 'SESSION_END_RECORD'
  | 'WAITING_STATE_EVENT'
  | 'VALIDATION_SUMMARY'
  | 'DONECRITERIA_RESULT'
  | 'BRANCH_INTEGRITY'
  | 'DRYRUN_DELTA'
  | 'OPPORTUNITY_SUPPRESSION'
  | 'REVIEW_RESULT'
  | 'DEBATE_OUTCOME'
  | 'SIEGE_RESULT';

// ── Guard context passed to guard functions ──────────────────────────────────

export interface GuardContext {
  /** Approval type supplied with the incoming event (for WAITING_ON_HUMAN transitions) */
  approval_type?: 'CRITICAL_PATH' | 'EXTERNAL_CALL' | 'DATA_ACCESS' | 'ESCALATION' | 'DELEGATION' | 'ACTION_APPROVAL' | 'TEXT_APPROVAL';
  /** Current self-correction attempt count */
  correction_attempts?: number;
  /** Confidence score relevant to the current event */
  confidence?: number;
  /** Gate threshold for confidence comparison */
  gate_threshold?: number;
  /** Whether an OPPORTUNITY_SET artifact already exists for the session */
  opportunity_set_exists?: boolean;
  /** Whether memory is available for the ENRICHING → EXECUTING transition */
  memory_available?: boolean;
  /** Checkpoint validation result */
  checkpoint_valid?: boolean;
  /** Whether all done-criteria passed */
  criteria_pass?: boolean;
  /** Branch violation detected during DELIVERING */
  branch_violation?: boolean;
  /** Waiting-state expiry policy */
  expiry_policy?: 'escalate' | 'stop';
  /** LOOP_SIGNAL severity level */
  loop_signal_severity?: 'info' | 'warning' | 'critical' | 'moderate';
  /** Whether a policy violation is present */
  policy_violation?: boolean;
  /** Synthesis failure count for detecting ×3 exhaustion */
  synthesis_fail_count?: number;
  /** Done-criteria validation result */
  done_criteria_valid?: boolean;
  /** ID of the sub-goal that failed, used to trigger GoalPlanner.replan() */
  goal_failure_id?: string;
  /** Human-readable reason for the sub-goal failure */
  goal_failure_reason?: string;
}

// ── Transition descriptor ────────────────────────────────────────────────────

interface TransitionSpec {
  to: OrchestratorState;
  /** Guard must return true for transition to proceed; undefined = always allowed */
  guard?: (ctx: GuardContext) => boolean;
  /** Artifact emitted after successful transition */
  artifact: TransitionArtifactType;
}

// ── Full transition table (ADR-0052) ─────────────────────────────────────────
//
// Structure: FSM_TABLE[from][event] = TransitionSpec | TransitionSpec[]
// When multiple specs are listed (conditional branching) they are evaluated
// in order and the first one whose guard returns true wins.

type EventMap = Partial<Record<OrchestratorEvent, TransitionSpec | TransitionSpec[]>>;
type TransitionTable = Partial<Record<OrchestratorState, EventMap>>;

const FSM_TABLE: TransitionTable = {
  IDLE: {
    scan_triggered: {
      to: 'SCANNING',
      artifact: 'ORCHESTRATOR_CYCLE',
    },
  },

  SCANNING: {
    signals_found: {
      to: 'SYNTHESIZING',
      guard: (ctx) => ctx.opportunity_set_exists === true,
      artifact: 'OPPORTUNITY_SET',
    },
    no_signals: {
      to: 'IDLE',
      artifact: 'ORCHESTRATOR_CYCLE',
    },
  },

  SYNTHESIZING: {
    task_ready: {
      to: 'ENRICHING',
      guard: (ctx) => ctx.done_criteria_valid === true,
      artifact: 'ORCHESTRATOR_CYCLE',
    },
    synthesis_fail: {
      to: 'IDLE',
      guard: (ctx) => (ctx.synthesis_fail_count ?? 0) >= 3,
      artifact: 'OPPORTUNITY_SUPPRESSION',
    },
  },

  ENRICHING: {
    enriched: {
      to: 'EXECUTING',
      guard: (ctx) => ctx.memory_available === true,
      artifact: 'MEMORY_INFLUENCE',
    },
    gate_fail: {
      to: 'SELF_CORRECTING',
      guard: (ctx) =>
        ctx.confidence !== undefined &&
        ctx.gate_threshold !== undefined &&
        ctx.confidence < ctx.gate_threshold,
      artifact: 'CONFIDENCE_TRACE',
    },
  },

  EXECUTING: {
    execution_complete: {
      to: 'VALIDATING',
      artifact: 'EXECUTION_TRACE',
    },
    loop_detected: {
      to: 'WAITING_ON_HUMAN',
      guard: (ctx) =>
        ctx.loop_signal_severity === 'moderate' ||
        ctx.loop_signal_severity === 'critical',
      artifact: 'LOOP_SIGNAL',
    },
    tool_blocked: {
      to: 'WAITING_ON_HUMAN',
      guard: (ctx) => ctx.policy_violation === true,
      artifact: 'POLICY_DECISION',
    },
  },

  SELF_CORRECTING: {
    attempt_success: {
      to: 'EXECUTING',
      guard: (ctx) =>
        ctx.confidence !== undefined &&
        ctx.gate_threshold !== undefined &&
        ctx.confidence >= ctx.gate_threshold,
      artifact: 'SELF_CORRECTION_ATTEMPT',
    },
    attempts_exhausted: {
      to: 'WAITING_ON_HUMAN',
      guard: (ctx) => (ctx.correction_attempts ?? 0) >= 3,
      artifact: 'WAITING_STATE',
    },
  },

  WAITING_ON_HUMAN: {
    approved: {
      to: 'EXECUTING',
      guard: (ctx) => ctx.checkpoint_valid === true,
      artifact: 'EXECUTION_DECISION',
    },
    rejected: [
      {
        to: 'STOPPED',
        guard: (ctx) => ctx.approval_type === 'CRITICAL_PATH',
        artifact: 'SESSION_END_RECORD',
      },
      {
        to: 'SELF_CORRECTING',
        guard: (ctx) => ctx.approval_type !== 'CRITICAL_PATH',
        artifact: 'EXECUTION_DECISION',
      },
    ],
    expired: [
      {
        to: 'WAITING_ON_HUMAN',
        guard: (ctx) => ctx.expiry_policy === 'escalate',
        artifact: 'WAITING_STATE_EVENT',
      },
      {
        to: 'STOPPED',
        guard: (ctx) => ctx.expiry_policy === 'stop',
        artifact: 'SESSION_END_RECORD',
      },
    ],
  },

  VALIDATING: {
    all_pass: {
      to: 'SIEGE_REVIEW',
      guard: (ctx) => ctx.criteria_pass === true,
      artifact: 'VALIDATION_SUMMARY',
    },
    any_fail: {
      to: 'REVIEWING',
      artifact: 'DONECRITERIA_RESULT',
    },
  },

  SIEGE_REVIEW: {
    siege_passed: {
      to: 'DELIVERING',
      artifact: 'SIEGE_RESULT',
    },
    siege_failed: {
      to: 'SELF_CORRECTING',
      artifact: 'SIEGE_RESULT',
    },
  },

  REVIEWING: {
    review_passed: {
      to: 'EXECUTING',
      artifact: 'REVIEW_RESULT',
    },
    review_failed: {
      to: 'DEBATING',
      artifact: 'REVIEW_RESULT',
    },
  },

  DEBATING: {
    debate_resolved: {
      to: 'EXECUTING',
      artifact: 'DEBATE_OUTCOME',
    },
  },

  DELIVERING: {
    delivered: {
      to: 'IDLE',
      guard: (ctx) => ctx.branch_violation !== true,
      artifact: 'BRANCH_INTEGRITY',
    },
    branch_violation: {
      to: 'STOPPED',
      artifact: 'DRYRUN_DELTA',
    },
  },

  STOPPED: {},
};

// ── Events that apply from ANY non-STOPPED state ─────────────────────────────

const UNIVERSAL_TRANSITIONS: Partial<Record<OrchestratorEvent, TransitionSpec>> = {
  emergency_stop: { to: 'STOPPED', artifact: 'SESSION_END_RECORD' },
  operator_stop:  { to: 'STOPPED', artifact: 'SESSION_END_RECORD' },
};

// ── Errors ───────────────────────────────────────────────────────────────────

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: OrchestratorState,
    public readonly event: OrchestratorEvent,
  ) {
    super(`No valid transition from '${from}' on event '${event}'`);
    this.name = 'InvalidTransitionError';
  }
}

export class GuardFailedError extends Error {
  constructor(
    public readonly from: OrchestratorState,
    public readonly event: OrchestratorEvent,
  ) {
    super(`Guard failed for transition from '${from}' on event '${event}'`);
    this.name = 'GuardFailedError';
  }
}

// ── Transition result ─────────────────────────────────────────────────────────

export interface TransitionResult {
  previousState: OrchestratorState;
  newState: OrchestratorState;
  event: OrchestratorEvent;
  artifactType: TransitionArtifactType;
  timestamp: string;
}

// ── OrchestratorKernel ────────────────────────────────────────────────────────

/**
 * Optional hook invoked whenever the kernel enters the SELF_CORRECTING state.
 * Called with the GuardContext that triggered the transition so callers can
 * forward goal_failure_id / goal_failure_reason to GoalPlanner.replan().
 */
export type SelfCorrectingHook = (ctx: GuardContext) => void;

export class OrchestratorKernel extends EventEmitter {
  private _state: OrchestratorState;
  private readonly _selfCorrectingHooks: SelfCorrectingHook[] = [];
  private readonly _sessionId: string;

  constructor(initialState: OrchestratorState = 'IDLE', sessionId = 'unknown') {
    super();
    this._state = initialState;
    this._sessionId = sessionId;
  }

  /**
   * Register a hook that is called synchronously whenever the FSM transitions
   * into SELF_CORRECTING. Use this to wire GoalPlanner.replan() into the kernel:
   *
   * ```ts
   * kernel.onSelfCorrecting((ctx) => {
   *   if (ctx.goal_failure_id) {
   *     goalPlanner.replan(currentPlan, ctx.goal_failure_id, ctx.goal_failure_reason ?? '');
   *   }
   * });
   * ```
   */
  onSelfCorrecting(hook: SelfCorrectingHook): void {
    this._selfCorrectingHooks.push(hook);
  }

  get state(): OrchestratorState {
    return this._state;
  }

  /**
   * Attempt a transition.
   *
   * @param event       The event triggering the transition.
   * @param guardCtx    Context used to evaluate guards.
   * @returns           The transition result, including the emitted artifact type.
   * @throws            InvalidTransitionError if no transition exists for the event.
   * @throws            GuardFailedError if all guards for the event failed.
   */
  transition(
    event: OrchestratorEvent,
    guardCtx: GuardContext = {},
  ): TransitionResult {
    // Universal events take priority
    const universal = UNIVERSAL_TRANSITIONS[event];
    if (universal) {
      return this._apply(event, universal, guardCtx);
    }

    // Look up state-specific transitions
    const stateMap = FSM_TABLE[this._state];
    if (!stateMap) {
      throw new InvalidTransitionError(this._state, event);
    }

    const spec = stateMap[event];
    if (!spec) {
      throw new InvalidTransitionError(this._state, event);
    }

    // Evaluate specs (array = conditional branches, first passing guard wins)
    const specs: TransitionSpec[] = Array.isArray(spec) ? spec : [spec];

    for (const s of specs) {
      if (!s.guard || s.guard(guardCtx)) {
        return this._apply(event, s, guardCtx);
      }
    }

    // Every branch's guard failed
    throw new GuardFailedError(this._state, event);
  }

  /**
   * Apply an already-resolved transition spec. Records the state change and
   * emits an 'ORCHESTRATOR_CYCLE' event on the EventEmitter.
   * When the new state is SELF_CORRECTING, registered onSelfCorrecting hooks
   * are invoked synchronously so callers can trigger GoalPlanner.replan().
   */
  private _apply(
    event: OrchestratorEvent,
    spec: TransitionSpec,
    guardCtx: GuardContext,
  ): TransitionResult {
    const previousState = this._state;
    this._state = spec.to;

    const result: TransitionResult = {
      previousState,
      newState: spec.to,
      event,
      artifactType: spec.artifact,
      timestamp: new Date().toISOString(),
    };

    this.emit('transition', result);

    globalEventBus.publish({
      type: 'FSM_TRANSITION',
      session_id: this._sessionId,
      payload: result,
    });

    if (spec.to === 'SELF_CORRECTING') {
      for (const hook of this._selfCorrectingHooks) {
        hook(guardCtx);
      }
    }

    return result;
  }

  /**
   * Returns true if the given event is valid from the current state
   * (without evaluating guards).
   */
  canReceive(event: OrchestratorEvent): boolean {
    if (event in UNIVERSAL_TRANSITIONS) return true;
    const stateMap = FSM_TABLE[this._state];
    return stateMap ? event in stateMap : false;
  }

  /**
   * Returns all valid events from the current state (including universals).
   */
  validEvents(): OrchestratorEvent[] {
    const stateEvents = Object.keys(FSM_TABLE[this._state] ?? {}) as OrchestratorEvent[];
    const universalEvents = Object.keys(UNIVERSAL_TRANSITIONS) as OrchestratorEvent[];
    return [...new Set([...stateEvents, ...universalEvents])];
  }

  /**
   * Reset the kernel to a new state without emitting a transition event.
   * Useful for session restore / test setup.
   */
  reset(state: OrchestratorState = 'IDLE'): void {
    this._state = state;
  }
}
