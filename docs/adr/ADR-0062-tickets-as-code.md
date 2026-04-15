# ADR-0062: Tickets-as-Code (Strict Synchronization)

- **Status:** Accepted
- **Date:** 2026-04-04
- **Author:** Alex Ribchinskiy
- **Impact:** High | **Complexity:** Medium | **Risk:** Low
- **Estimated Effort:** 2 days | **Priority:** P1
- **Deciders:** Autonomy team

---

## Context

The `GoalPlanner` orchestrates goal decomposition and replanning in-memory.  
On server restart or crash the entire plan state is lost and operators have no
way to inspect what the agent is thinking between turns.

## Decision

Implement the **Tickets-as-Code (CAR Pattern)** via a dedicated `TicketSync`
service that strictly mirrors `GoalPlanner` state to the filesystem.

### Directory contract

```
tasks/
  pending/   — unstarted plans (one .md per session/goal)
  active/    — currently executing plan + per-goal progress files
               CURRENT_TICKET.md — always the live snapshot
  done/      — completed plans moved here (immutable history)
```

### TicketSync API

| Method | Description |
|--------|-------------|
| `writePlan(plan)` | Write/overwrite `tasks/pending/{sessionId}.md` and `tasks/active/CURRENT_TICKET.md` |
| `activateGoal(plan, goalId)` | Mark a goal `active`; update `tasks/active/CURRENT_TICKET.md` |
| `completeGoal(plan, goalId)` | Mark a goal `done`; update snapshot |
| `completePlan(plan)` | Move `tasks/active/{sessionId}.md` → `tasks/done/{sessionId}.md`; archive snapshot |
| `resumeActivePlan(activeDir?)` | Read `tasks/active/CURRENT_TICKET.md` on boot and return the last known `ExecutionPlan` or `null` |

### Non-blocking writes

All writes use fire-and-forget `fs.writeFile` (errors are logged, never thrown)
to avoid blocking the async execution loop.  `resumeActivePlan` is the only
async read that callers `await`.

### Commit protocol

`GoalPlanner` hooks call `ticketSync` (if provided) at:
1. `decompose()` completion → `writePlan()`
2. `markGoalActive()` → `activateGoal()`
3. `markGoalDone()` → `completeGoal()`
4. `replan()` completion → `writePlan()`
5. `completePlan()` → `completePlan()` (plan-level finish)

### Markdown format for CURRENT_TICKET.md

```markdown
# CURRENT TICKET — {sessionId}

> Last updated: {ISO timestamp}

## Goal
{rootGoal}

## Sub-goals
| ID | Status | Priority | Description |
|----|--------|----------|-------------|
| goal-xxx | ✅ done | critical | … |
| goal-yyy | 🔄 active | high | … |
| goal-zzz | ⏳ pending | medium | … |

## Critical Path
goal-xxx → goal-yyy → goal-zzz

## Risk Factors
- Risk 1
- Risk 2

## Fallback Strategy
{fallbackStrategy}
```

## Consequences

### Pros
- Perfect observability — operators read `tasks/active/CURRENT_TICKET.md` in
  their IDE and see exactly what the agent is doing.
- Crash resilience — `resumeActivePlan()` on boot lets the server skip
  already-completed sub-goals.
- Zero-overhead hot path — all writes are fire-and-forget.

### Cons
- Filesystem I/O per goal transition (mitigated by non-blocking writes).
- Tasks directory must be on a writable local volume (not ephemeral).

## References

- ADR-0061 — GoalPlanner (EXECUTION_PLAN artifacts)
- `a2a-server/src/services/core/ticket-sync.ts`
- `tasks/active/CURRENT_TICKET.md`
