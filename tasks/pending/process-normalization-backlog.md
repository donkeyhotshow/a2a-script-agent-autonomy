# Process normalization — remaining actions

Cross-cutting items after gray-room + transform `interrupt` passthrough (dialog / coder / server default / agent).

## Done in repo (reference)

- Response transforms copy `$.llm.interrupt` → `$.interrupt` for **agent**, **dialog**, **dialog-llm**, **coder**, and **server-transforms-response** (generic).
- `resolveHistoryLength()` in `normalization.ts` drives `interrupt.when` in `GrayRoomOrchestrator` (root vs nested `context.history`).

## Suggested next steps (prioritized)

1. **Per-schema overrides** — Repo currently has one root [`server-transforms-response.json`](../../a2a-server/prompts/transforms/server-transforms-response.json); if a future schema adds its own `server-transforms-response.json` beside `*-request.md`, mirror the `interrupt` `copy` step there.
2. ~~**`normalizeContext` depth**~~ — Done: root `execution` / `history` folded into nested `context` when present; `resolveExecution()` shared with `resolveTransformSchema` and gray-room trigger.
3. ~~**SDK + Vite parity**~~ — Done: `sanitizeContextForServer` forces `history` to an array; noted in [`simulations/SERVER-CONTRACT.md`](../../simulations/SERVER-CONTRACT.md) + `a2a-invoke-builders.mjs` header.
4. ~~**Sims**~~ — Done: [`simulations/sync/dialog-interrupt/1/`](../../simulations/sync/dialog-interrupt/1/) (dialog + top-level `interrupt` + `response.md` fence). Validated ✅.
5. **compress_history context write** — Gray-room `compress_history` sets root `history` and `context.history` to the same array; `resolveHistoryLength` prefers root — covered by `a2a-server/tests/normalization-history-length.test.ts` (*gray-room compress_history dual-write*).

**Runtime:** Response transform output may include top-level `interrupt` on `ProcessResult` when the directive is present (e.g. skipped `when` clause); see `gray-room-orchestrator` `runResponseTransform`.

## System Improvements List (Added)

P1 - Critical / Active Development
#	Improvement	Current State	Target
1	Black/Gray Room Split (ADR-0058)	Proposed	Implement Algorithm Mode for local Ollama execution alongside Prompt Mode for paid API. Reduces cost by ~70% for deterministic tasks
2	Sequence Workbench Completion	Partial (11 pending tasks)	Full task queue with look-ahead UI, step_complete workflow, step prediction when backlog < 3
3	Script/Dialog/Agent Parity (S14)	Partial	Unified "one language of data" across all execution modes - same forms, history, Web DTO
4	Per-Schema Transform Overrides	Single root file only	Allow schema-local server-transforms-response.json overrides beyond root transforms
5	compress_history Dual-Write Cleanup	Writes to both root and context	Clean reconciliation - prefer root, remove duplicate writes

P2 - High Priority Architecture
#	Improvement	Description
6	Multi-Agent Orchestrator (ADR-0038)	Native delegation between specialized agents (researcher → coder → reviewer) with context.workbench.sections.agents
7	Predictive Step Generation	Auto-generate steps when context.workbench.sections.sequence.steps.length <= 2 with confidence scores
8	Gray Room Visualization	Expose hidden server-side processing to UI with spin traces, progress bars, cancel buttons
9	Interrupt Recovery Patterns	Extend beyond clarify to: confirm_dangerous, missing_context, algorithm_invoke, escalate_to_human
10	@a2a-client Web Package (S18)	Complete scoped package migration: packages/web/ + @a2a-client/vite-plugin with proper build/publish

P3 - Developer Experience
#	Improvement	Description
11	Schema-First Contract Testing	Runtime JSON Schema validation (Zod) on every request/response - fail fast on violations
12	11 Excluded Test Files	Review and re-enable tests in vitest.config.ts exclusions (neurons-v2, rag-entity, auth.middleware, etc.)
13	Client Package Import Policy	Tighten @a2a/execution imports - enforce .js relatives for NodeNext vs @/ for bundled UI
14	Simulation Coverage - Async/Retries	Missing goldens for promiseId lifecycle, execute.wait timing, loader behavior
15	Request/Response Markdown Mirrors	Extend S11 coverage to async simulations with request.md/response.md documentation

P4 - Performance & Observability
#	Improvement	Description
16	Connection Pool Optimization	Reuse LLM connections across Gray Room spins
17	Response Deduplication	Cache identical tool responses within session
18	Delta Update Protocol	Send only changed context fields instead of full payload
19	Parallel Gray Room Spins	Run independent handlers concurrently where safe
20	OpenTelemetry Integration	Distributed tracing across Client API → Server → AI Hub

## Links

- [`a2a-server/docs/GRAY-ROOM.md`](../../a2a-server/docs/GRAY-ROOM.md) — `interrupt` on transform output
- [`tasks/system-improvement-priorities.md`](../system-improvement-priorities.md) — contract / parity themes
