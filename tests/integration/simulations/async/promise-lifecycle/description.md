# promise-lifecycle (async golden)

Models the **async protocol** using **invoke-shaped** snapshots (see `../SCHEMA.md`: sync goldens omit transport-only `promiseId`).

- **Step 1** — Semantic equivalent of polling `GET /api/v1/requests/{promiseId}/result` while work is **not** terminal: server has not yet produced final `execute` (here expressed as `execute.message` + `context.execution.step: processing`).
- **Step 2** — Terminal snapshot after async completion: `execution.status: completed` and a final `execute.message`.
- **Step 3** — Terminal **failure** branch: `execution.status: failed`, `execution.step: failed`, with an `execute.message` suitable for UI (real poll responses may also carry top-level `status: failed` and `error`; see `requests.routes.ts`).

Real stack: first `POST /api/v1/invoke` may return only `{ promiseId }`; Client API maps that to `asyncPending` and polls `/async` or `/requests/.../result`. This folder documents the **payload shapes** you eventually merge into session state, not the raw 202 ack JSON.
