# ADR-0054: Real-time Update Contracts

- **Status:** Accepted
- **Date:** 2026-04-01
- **Author:** Alex Ribchinskiy
- **Impact:** High | **Complexity:** Medium | **Risk:** Medium
- **Estimated Effort:** 1.5 weeks | **Priority:** P0
- **Deciders:** Frontend team lead, Backend team lead

---

## Context

The current system had no defined real-time contract. UI polled `/storage` endpoints on arbitrary intervals, leading to:

1. Stale UI state (operator watching a "thinking" banner for a crashed session).
2. No differentiation between "agent is thinking" and "agent process died".
3. No subscription model — clients fetched all artifacts every poll cycle.
4. No fallback contract when WebSocket connection drops.

## Decision

Define explicit **WebSocket topics** with typed payloads and a **polling fallback contract**.

### WebSocket Topics

```
ws://host/api/v1/ws/{session_id}
```

| Topic | Payload Type | Emitted By |
|---|---|---|
| `session/{id}/state` | `OrchestratorStateUpdate` | OrchestratorKernel on every FSM transition |
| `session/{id}/artifacts` | `ArtifactCreatedEvent` | ArtifactStore on every `write()` |
| `session/{id}/logs` | `LogLine` | All components via LogBus |
| `session/{id}/waiting` | `WaitingStateEvent` | OrchestratorKernel |
| `global/sessions` | `SessionListUpdate` | OrchestratorKernel on session start/stop |

### Heartbeat Contract

`WAITING_STATE.heartbeat_timestamp` is updated every **30 seconds** while in `WAITING_ON_HUMAN` state.

UI rule: If `now - heartbeat_timestamp > 90s` AND `state = WAITING_ON_HUMAN` → display "⚠️ Agent may be unresponsive".

### Polling Fallback

```
GET /api/v1/session/{id}/state?since={last_event_id}
```

Returns `WSEnvelope[]` — same shape as WebSocket events, enabling identical client processing logic.

Backoff: `2s → 4s → 8s → 16s` (cap at 16s).

## Consequences

### Positive
- Operators always know if agent is alive (heartbeat)
- UI and polling client share identical event processing code
- Subscription filtering reduces bandwidth by ~60%

### Negative
- WebSocket connection management adds complexity
- Must handle reconnect + event replay on disconnect

---
