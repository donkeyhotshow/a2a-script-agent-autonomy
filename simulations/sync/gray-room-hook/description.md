# Gray room — insertion into one invoke (simulation)

This folder documents **where** the gray room sits in the server pipeline.

**Normative spec:** [`a2a-server/docs/GRAY-ROOM.md`](../../../a2a-server/docs/GRAY-ROOM.md) · **Code:** [`dialog-request-processor.ts`](../../../a2a-server/src/services/core/request-processor/dialog-request-processor.ts) → [`GrayRoomOrchestrator.runLoop()`](../../../a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts).

## Sequence (one Client API → Server invoke)

```text
Client ──► DialogRequestProcessor.doProcess()
              │
              ├─► request transforms → main LLM → response.md
              │
              └─► GrayRoomOrchestrator.runLoop(ctx, schemaName, responseMd, …, processInterrupts)
                        │
                        ├─► runResponseTransform (same transform pack as primary)
                        ├─► extractInterrupt(transform output)
                        │
                        ├─ processInterrupts=false ──► if interrupt → skip chain → return
                        ├─ no interrupt ──► merge trace + grayRoom slot → return ProcessResult ──► Client
                        │
                        └─ interrupt + when satisfied ──► applyInterrupt (sidecar / follow-up LLM / …)
                                                              └─► loop until no interrupt or budget 0
```

**Red room** (client tools) is **after** this: extra HTTP only when the **final** `execute` asks the client to run a tool.

## Default vs opt-out

| Layer | Meaning |
|-------|--------|
| **Default** | If `A2A_GRAY_ROOM_ENABLED` is **unset**, gray room **runs** (`processInterrupts=true`) for normal dialog/agent/task flows. |
| **Opt-out** | Set `A2A_GRAY_ROOM_ENABLED=0` (or `false` / `no` / `off`) to force **one** response-transform pass; `interrupt` directives are not executed. **Override:** `context.execution.grayRoomRequested=true` or root `flowControlHint: gray-room`. |
| **RAG → history** | Server `interrupt.reason === auto_rag_page` merges hits into `context.ragResults` and appends a **system** line to `context.history` (see [`auto-rag-page-server.ts`](../../../a2a-server/src/services/rag/auto-rag-page-server.ts)). |

## Golden step `1/`

Minimal **dialog** turn: **`execute.message`** only, **no** `interrupt` in the fixture — baseline single pass.

For **interrupt** shapes and substeps, see [`../interrupt-thinking/`](../interrupt-thinking/) and [`../../agent-auto-ai/6/interrupt.md`](../../agent-auto-ai/6/interrupt.md).
