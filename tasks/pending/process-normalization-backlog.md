# Process normalization — remaining actions

Cross-cutting items after gray-room + transform `interrupt` passthrough (dialog / coder / server default / agent).

## Done in repo (reference)

- Response transforms copy `$.llm.interrupt` → `$.interrupt` for **agent**, **dialog**, **dialog-llm**, **coder**, and **server-transforms-response** (generic).
- `resolveHistoryLength()` in `normalization.ts` drives `interrupt.when` in `GrayRoomOrchestrator` (root vs nested `context.history`).

## Suggested next steps (prioritized)

1. **Per-schema overrides** — Repo currently has one root [`server-transforms-response.json`](../../a2a-server/prompts/transforms/server-transforms-response.json); if a future schema adds its own `server-transforms-response.json` beside `*-request.md`, mirror the `interrupt` `copy` step there.
2. ~~**`normalizeContext` depth**~~ — Done: root `execution` / `history` folded into nested `context` when present; `resolveExecution()` shared with `resolveTransformSchema` and gray-room trigger.
3. ~~**SDK + Vite parity**~~ — Done: `sanitizeContextForServer` forces `history` to an array; noted in [`simulations/SERVER-CONTRACT.md`](../../simulations/SERVER-CONTRACT.md) + `a2a-invoke-builders.mjs` header.
4. ~~**Sims**~~ — Done: [`simulations/sync/dialog-interrupt/1/`](../../simulations/sync/dialog-interrupt/1/) (dialog + top-level `interrupt` + `response.md` fence). Validate: `npm run sim:validate -- --sim sync/dialog-interrupt/1`.
5. **compress_history context write** — Today compress writes both `nextCtx.history` and `context.history`; confirm `resolveHistoryLength(workingCtx)` sees the same object the next loop iteration uses (integration test or trace-only sim).

**Runtime:** Response transform output may include top-level `interrupt` on `ProcessResult` when the directive is present (e.g. skipped `when` clause); see `gray-room-orchestrator` `runResponseTransform`.

## Links

- [`a2a-server/docs/GRAY-ROOM.md`](../../a2a-server/docs/GRAY-ROOM.md) — `interrupt` on transform output
- [`tasks/system-improvement-priorities.md`](../system-improvement-priorities.md) — contract / parity themes
