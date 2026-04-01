# ADR-0056: Operator Decision Model

- **Status:** Accepted
- **Date:** 2026-04-01
- **Author:** Alex Ribchinskiy
- **Impact:** High | **Complexity:** Low | **Risk:** Low
- **Estimated Effort:** 0.5 weeks | **Priority:** P1
- **Deciders:** UX lead, Product

---

## Context

Operator controls (Pause, Resume, Stop, Steer, Approve, Reject) were scattered across the UI with inconsistent behaviour. No explicit policy governed which controls were available in which FSM states.

## Decision

Define a **Steering Controls Authority** that is the single rule table for all operator interactions:

| Control | Allowed FSM States | Action | Artifact Emitted |
|---|---|---|---|
| **Pause** | EXECUTING, SCANNING, ENRICHING | → WAITING_ON_HUMAN | WAITING_STATE(reason=operator_pause) |
| **Resume** | WAITING_ON_HUMAN | → confidence recheck → EXECUTING | EXECUTION_DECISION |
| **Stop** | Any except STOPPED | → STOPPED | SESSION_END_RECORD(reason=manual_stop) |
| **Steer** | WAITING_ON_HUMAN, IDLE | Replace intent, re-synthesize | PREFLIGHT_IMPROVEMENT |
| **Approve** | WAITING_ON_HUMAN | Resolve WAITING_STATE | WAITING_STATE_EVENT(resolved) |
| **Reject** | WAITING_ON_HUMAN | Per approval type (see HumanLayer Matrix) | EXECUTION_DECISION |

### Implementation: Resume & Steering Panel

The panel is always visible but controls are enabled/disabled based on current FSM state. This prevents "grey area" operations where the operator is unsure if a control is valid.

### "Approve Plan → Start Live Run" Rule

This button is a **start signal only**. It explicitly does NOT:
- Bypass HumanLayer policy
- Skip confidence gating
- Skip validation pipeline

Any preflight approval leads to the same execution path as a non-preflight run.

## Consequences

### Positive
- Operators cannot trigger invalid state transitions via UI
- Clear mental model: "if the button is enabled, the action is valid right now"
- `STOPPED` state is terminal — operator must start a new session

---
