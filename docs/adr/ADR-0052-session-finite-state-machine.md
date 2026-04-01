# ADR-0052: Session Finite State Machine

- **Status:** Accepted
- **Date:** 2026-04-01
- **Author:** Alex Ribchinskiy
- **Impact:** Critical | **Complexity:** Medium | **Risk:** Low
- **Estimated Effort:** 1 week | **Priority:** P0
- **Deciders:** Backend team lead, Frontend team lead

---

## Context

The orchestrator previously used multiple boolean flags (`is_waiting`, `is_running`, `has_error`, `is_paused`) to represent session state. This "boolean soup" created:

1. **Conflicting state definitions** — `is_waiting=true` + `is_running=true` was possible but semantically invalid.
2. **UI bugs** — Session Status Strip showed wrong labels because it derived text from multiple flags.
3. **Resume ambiguity** — No clear contract for which state to return to after Waiting resolution.
4. **Testing gaps** — No exhaustive transition tests possible without explicit FSM definition.

## Decision

Implement a **strict Single State Enum** as the sole representation of orchestrator phase:

```typescript
type OrchestratorState =
  | 'IDLE'
  | 'SCANNING'
  | 'SYNTHESIZING'
  | 'ENRICHING'
  | 'EXECUTING'
  | 'SELF_CORRECTING'
  | 'WAITING_ON_HUMAN'
  | 'VALIDATING'
  | 'DELIVERING'
  | 'STOPPED';
```

### Transition Table (exhaustive)

| From | Event | Guard | To | Artifact |
|---|---|---|---|---|
| IDLE | scan_triggered | — | SCANNING | ORCHESTRATOR_CYCLE |
| SCANNING | signals_found | OPPORTUNITY_SET exists | SYNTHESIZING | OPPORTUNITY_SET |
| SCANNING | no_signals | — | IDLE | — (cooldown) |
| SYNTHESIZING | task_ready | donecriteria valid | ENRICHING | — |
| SYNTHESIZING | synthesis_fail×3 | — | IDLE | OPPORTUNITY_SUPPRESSION |
| ENRICHING | enriched | memory available | EXECUTING (via gate) | MEMORY_INFLUENCE |
| ENRICHING | gate_fail | confidence < threshold | SELF_CORRECTING | CONFIDENCE_TRACE |
| EXECUTING | execution_complete | — | VALIDATING | EXECUTION_TRACE |
| EXECUTING | loop_detected | LOOP_SIGNAL ≥ moderate | WAITING_ON_HUMAN | LOOP_SIGNAL |
| EXECUTING | tool_blocked | policy violation | WAITING_ON_HUMAN | POLICY_DECISION |
| SELF_CORRECTING | attempt_success | confidence ≥ threshold | EXECUTING | SELF_CORRECTION_ATTEMPT |
| SELF_CORRECTING | attempts_exhausted | attempt_count = 3 | WAITING_ON_HUMAN | WAITING_STATE |
| WAITING_ON_HUMAN | approved | checkpoint_valid | EXECUTING | EXECUTION_DECISION |
| WAITING_ON_HUMAN | rejected | approval_type=CRITICAL_PATH | STOPPED | SESSION_END_RECORD |
| WAITING_ON_HUMAN | rejected | approval_type≠CRITICAL_PATH | SELF_CORRECTING | EXECUTION_DECISION |
| WAITING_ON_HUMAN | expired | expiry_policy=escalate | WAITING_ON_HUMAN | WAITING_STATE_EVENT |
| WAITING_ON_HUMAN | expired | expiry_policy=stop | STOPPED | SESSION_END_RECORD |
| VALIDATING | all_pass | donecriteria_pass=true | DELIVERING | VALIDATION_SUMMARY |
| VALIDATING | any_fail | — | WAITING_ON_HUMAN | DONECRITERIA_RESULT |
| DELIVERING | delivered | no branch violation | IDLE | BRANCH_INTEGRITY |
| DELIVERING | branch_violation | — | STOPPED | DRYRUN_DELTA(critical) |
| Any | emergency_stop | — | STOPPED | SESSION_END_RECORD |
| Any | operator_stop | — | STOPPED | SESSION_END_RECORD |

### Implementation

```typescript
// OrchestratorKernel.ts
class OrchestratorKernel {
  private state: OrchestratorState = 'IDLE';

  transition(event: OrchestratorEvent, guard?: () => boolean): void {
    const next = this.fsm.resolve(this.state, event);
    if (!next) throw new InvalidTransitionError(this.state, event);
    if (guard && !guard()) throw new GuardFailedError(this.state, event);

    const prev = this.state;
    this.state = next;
    this.emit('ORCHESTRATOR_CYCLE', { previous_state: prev, new_state: next });
  }
}
```

## Consequences

### Positive
- Exhaustive transition coverage in tests
- UI derives label directly from state enum (no interpretation logic)
- Resume paths are unambiguous

### Negative
- Requires migration of existing boolean-flag usages across codebase (~12 files estimated)

## Alternatives Considered

| Option | Verdict |
|---|---|
| Keep boolean flags | ❌ Root cause of bugs |
| XState library | ⚠️ Overkill; custom FSM is 50 lines and testable |
| String constants without FSM | ❌ No guard enforcement |

---
