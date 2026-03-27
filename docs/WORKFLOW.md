# A2A Workflow (Linear Model)

This document defines the base linear flow and operational terms used in the project.

## Flow Diagram

```
Client/UI   Client API      Server/Core       LLM/External AI
   │            │                │                  │
   │ message    │                │                  │
   │───────────>│ request.json   │                  │
   │            │───────────────>│ request.md       │
   │            │                │─────────────────>│
   │            │                │ response.md      │
   │            │                │<─────────────────│
   │            │ response.json  │                  │
   │            │<───────────────│                  │
   │ received.json               │                  │
   │<───────────│                │                  │
```

## Core Terms

### Normal Cycle

Standard user message flow:

1. User sends input.
2. Client API forwards request to server.
3. Server prepares request and calls LLM when needed.
4. Server returns final response.
5. Client renders response.

### Red Room

Automatic response path for tool execution:

- Trigger: server asks for a tool action (not direct user text input).
- Behavior: client sends auto-result for requested `execute` tool.
- Then: full normal cycle continues with the new result as input.
- Meaning: direct operational path for automatic tools.

### Gray Room

Server-only substep chain (`N-sub-M` in simulations; **`interrupt`** in transforms) for extra LLM/transform work **before** the client sees the final answer:

- Trigger: response transform emits **`interrupt`** (see [`a2a-server/docs/GRAY-ROOM.md`](../a2a-server/docs/GRAY-ROOM.md)).
- Behavior: server runs compress / thinking / re-LLM substeps; client gets **one** outward response when the chain ends.
- Constraint: no extra client `/next` for gray substeps (unlike red room).
- Former doc name: “server interrupt loop” — [redirect stub](../a2a-server/docs/SERVER-INTERRUPT-LOOP.md) points to the gray room spec.

### Black Room

Future smart loop inside `ai-integration` proxy:

- Planned area for proxy-side autonomous optimization logic.
- Out of current implementation scope.

## Phrase Mapping

- **"normal cycle"** -> regular message flow.
- **"red room"** -> client auto-replies to tool `execute`, then full cycle.
- **"gray room"** -> server-driven LLM/transform substep chain before final client response.
- **"black room"** -> future proxy intelligence loop (not active now).

