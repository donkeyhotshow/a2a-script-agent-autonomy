# Gray room (client view)

**Gray room** is server-only work inside **one** user invoke: extra LLM/transform steps **before** you get a final `execute`. The client does **not** send extra `/next` turns for gray-room substeps.

## Contrast with red room

| | Red room | Gray room |
|---|----------|-----------|
| **Where** | Client + Client API | A2A server only |
| **Trigger** | Server returns tool `execute` the client must run | Response transform emits `interrupt` |
| **Extra HTTP** | Yes — auto `client-result` + `/next` | No — one outward response after the chain |
| **Artifacts** | Step folders (`client-result.json`, …) | Same **one** logical step from the client’s perspective |

## What you observe

- Final session state matches **one** completed step after the invoke (same as a non-gray response).
- Optional debug: **`context.workbench.slots.interruptTrace`** — ordered server-side events (see `a2a-client/web/js/task-flow/render.js`).
- If budget is exhausted: **`context.interrupt_truncated: true`**.

## Normative server doc

Full protocol (`interrupt` shape, `reason` table, simulations, limits): [`a2a-server/docs/GRAY-ROOM.md`](../../a2a-server/docs/GRAY-ROOM.md)

## Related

- [RED-ROOM.md](./RED-ROOM.md) — client auto tool cycle
- [WEB_UI_PROTOCOL.md](./WEB_UI_PROTOCOL.md)
- [WORKFLOW.md](../../docs/WORKFLOW.md) — red / gray / black terms
