# Gray room (server-side)

**Gray room** is the product name for **server-only extra work** inside one logical invoke: extra LLM calls and transforms **before** the client sees a final `execute` / context. The implementation still uses the internal name **interrupt loop** in code (`processDialogResponseWithInterruptLoop`, logs, env `A2A_MAX_INTERRUPT_TURNS`).

| Room | Who acts | Client round-trips |
|------|----------|--------------------|
| **Red room** | Client auto-completes tool `execute`, then sends next turn | One user-visible step per tool cycle |
| **Gray room** | Server runs substeps (compress, thinking, re-LLM) | **None** — client gets one response after the chain finishes |
| **Black room** | Algorithm Mode — local Local LLM upstream execution for deterministic tasks | Proposed per [ADR-0058](../../docs/adr/ADR-0058-gray-room-split-prompt-vs-algorithm.md), see [BLACK-ROOM.md](../../ai-integration/docs/BLACK-ROOM.md) (in ai-integration) |

**Status:** Implemented as an **overlay** on one invoke: [`DialogRequestProcessor`](../src/services/core/request-processor/dialog-request-processor.ts) delegates to [`GrayRoomOrchestrator.runLoop()`](../src/services/core/request-processor/gray-room-orchestrator.ts). Interrupt trace for the client is merged via [`mergeInterruptTraceIntoContext`](../src/transform/interrupt-trace-contract.ts) (see § Concept Boundary).

**Related types:** [`InterruptDirective`](../src/transform/types.ts).

## What it does

After the **response** transform pipeline runs, the server inspects transform output for a top-level **`interrupt`** object. If present, the server does **not** immediately return the dialog result to the client. It may run **additional** LLM calls (compress history, internal “thinking”, or a full **request transform → main LLM → response transform** cycle again). The Web / Client API only sees the **final** `ProcessResult` when the loop ends or the interrupt budget is exhausted.

```text
Client → Server
         request transform → LLM #1 → response transform
         interrupt? ─no→ return to client
              │
              yes
              ├── applyInterrupt (e.g. compress_history: extra LLM, then return with same execute)
              └── continueLoop → request transform → LLM #2 → response transform → …
```

### No `interrupt`: completion flag and syndicate review

When the response transform yields **no** `interrupt`, the loop still finishes through the same merge path — but **non-dialog** schemas (`agent`, `coder`, `analyze`, `auto-ai`, …) may run **IntentGate** (ADR-0050) and, if transform output has **`result.completed === true`** (copied from the primary LLM JSON field **`completed`** in `agent-response.json` / `coder-response.json` / …), **`executeSyndicateReview`** (SIEGE_REVIEW). **Dialog** returns to the client on this branch **before** those checks — no syndicate on that exit. There is **no** separate “decision cell” hub call (superseded ADR-0088). See [`agent-request.md`](../prompts/agent-request.md) and [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) (*Optional `result` on `response.json`*).

## Concept Boundary

**Gray room** is an **overlay** on the existing **interrupt loop** mechanism, not a separate system. It reuses the same `interrupt` directive handling, transform pipeline, and budget enforcement (`A2A_MAX_INTERRUPT_TURNS` / `A2A_GRAY_ROOM_MAX_TURNS`).

### Overlay characteristics

| Aspect | Implementation |
|--------|----------------|
| **Core mechanism** | Same `InterruptDirective` handling via `applyInterrupt` in [`gray-room-orchestrator.ts`](../src/services/core/request-processor/gray-room-orchestrator.ts) |
| **Trigger detection** | `detectGrayRoomTrigger()` — checks explicit flag → env toggle → policy |
| **Loop execution** | `GrayRoomOrchestrator.runLoop()` — same interrupt budget, transform, LLM cycle |
| **Result merging** | `mergeTraceIntoResult()` → [`mergeInterruptTraceIntoContext`](../src/transform/interrupt-trace-contract.ts) — writes `context.workbench.slots.interruptTrace` only |

### Trigger resolution order (`computeGrayRoomTrigger`)

Single source of truth: [`computeGrayRoomTrigger()`](../src/services/core/request-processor/gray-room-orchestrator.ts) (exported wrappers: `detectGrayRoomTrigger`, `shouldUseGrayRoom`). Unit tests: [`tests/gray-room-trigger.test.ts`](../tests/gray-room-trigger.test.ts).

| Step | Condition | If true |
|------|-----------|---------|
| 1 | `context.execution.grayRoomRequested === true` | **On** — `source: explicit_flag` (stops here) |
| 2 | `flowControlHint` is `gray-room` or `gray_room` (call arg or `ctx.flowControlHint`) | **On** — `source: explicit_flag` |
| 3 | `A2A_GRAY_ROOM_ENABLED` is an explicit opt-out token (`0`, `false`, `no`, `off`) | **Off** — `source: disabled` (unless step 1–2 already matched) |
| 4 | `A2A_GRAY_ROOM_ENABLED` is unset, or set to an enable token (`1`, `true`, `yes`) — see `getGrayRoomEnabled()` | **On** — `source: env_enabled` |
| 5 | Else: `execution.action` policy | `dialog` → `policy_dialog`; `agent` / `coder` / `auto-ai` / `analyze` → `policy_agent`; `task-decomposition` / `task` → `policy_task_decomposition`; otherwise **Off** — `disabled` |

Env values that are neither enable nor disable tokens (e.g. arbitrary strings) fall through: gray room is off until **policy** (step 5) applies for known actions.

### Data flow boundaries

- **Only** modifies `context.workbench` and `context.history` during execution.
- Does **not** modify `context.execution` directly except for trace events.
- Final `execute` must follow **Action-Key Shape** (single action-type key per object).
- Intermediate results stay on server; only final `ProcessResult` reaches client.

### Limitations (Concept-level)

| Limitation | Description |
|------------|-------------|
| **No client steps** | Gray room runs entirely server-side; no new client round-trips |
| **Server-only** | Cannot trigger client-side actions; only LLM + transforms |
| **Action-Key Shape** | All `execute`/`result` payloads must use single action-type key |
| **Overlay on interrupt** | Requires existing interrupt loop; cannot run standalone |

### Terminology alignment

- "Gray room" = product/feature name for server-side LLM chaining
- "Interrupt loop" = internal code name (`processDialogResponseWithInterruptLoop`, `runLoop`)
- Both refer to the same mechanism; "overlay" emphasizes product-level UX layer

## Server orchestration (schema entry points)

Gray room does **not** introduce a second transform pipeline. It uses the **same** `prompts/transforms/<schemaName>/` layout and the same `runPromptsTransform` / response-transform machinery as the primary dialog invoke. Only the **active folder name** (`activeSchemaName`) can change between turns inside `runLoop`.

### Primary invoke → first `schemaName`

| Step | Code / data |
|------|-------------|
| Router / client | `execution.action` is one of [`LLM_PIPELINE_ACTIONS`](../../shared/router-static-choices.json) (`dialog`, `agent`, `task-decomposition`, …) **or** `context.transformSchema` is set explicitly. |
| Map action → default schema folder | [`ACTION_TO_SCHEMA`](../../shared/router-static-choices.json) in [`router-static.ts`](../src/config/router-static.ts) (loaded from `shared/router-static-choices.json`). |
| Resolve full schema string | [`resolveTransformSchema()`](../src/services/core/request-processor/normalization.ts): priority `context.transformSchema`, else `ACTION_TO_SCHEMA[action]` when `result.message` / `task` / `message` is present. |
| Folder name for transforms | [`extractSchemaName()`](../src/services/core/request-processor/normalization.ts) — first path segment (e.g. `dialog/3` → `dialog`). That value is the initial `schemaName` passed into [`GrayRoomOrchestrator.runLoop()`](../src/services/core/request-processor/gray-room-orchestrator.ts). |
| Caller | [`DialogRequestProcessor.doProcess()`](../src/services/core/request-processor/dialog-request-processor.ts) computes `schemaName` and passes it to `runLoop`; recovery path uses the same (`response-path.ts` uses the same `resolveTransformSchema` + `extractSchemaName`). |

### Inside `runLoop`: `activeSchemaName` and `interrupt.schema`

- On entry, `activeSchemaName = schemaName` (the primary invoke’s transform pack).
- Each iteration runs the **response** transform with the current `activeSchemaName` (`runResponseTransform(activeSchemaName, …)`).
- After [`applyInterrupt()`](../src/services/core/request-processor/gray-room-orchestrator.ts), if the handler returns **`continueLoop: true`** **and** `interrupt.schema` is a non-empty string, the server sets **`activeSchemaName = interrupt.schema.trim()`** before rebuilding `request.md` and running the next main LLM turn.
- The **next** request rebuild uses `runPromptsTransform(..., activeSchemaName, ..., 'request', …)` — same API as the first LLM leg, only the directory name under `prompts/transforms/` may differ.

`interrupt.schema` is **not** validated against `ACTION_TO_SCHEMA`. It is a **transform-pack directory name** (must exist on disk under `prompts/transforms/` with the usual `server-transforms-request.json` / `server-transforms-response.json` and templates). Typical use: a specialized pack for a follow-up turn (e.g. alternate prompts) without adding a new top-level router action.

### Optional `gray-room-*` assets (no parallel pipeline)

Adding **`prompts/transforms/<your-name>/`** (with `server-transforms-*.json` and `*-request.md` per [`pipeline/prompts.ts`](../src/transform/pipeline/prompts.ts) conventions) is enough to support `interrupt.schema: "<your-name>"` on `continueLoop`. You do **not** need a separate root pipeline, duplicate orchestrator, or mandatory registration in `ACTION_TO_SCHEMA` **unless** you also want that name as a **primary** `execution.action` target. Avoid maintaining a second parallel tree (e.g. “gray-room-only” prompts outside `prompts/transforms/`) unless there is a clear reason — the runtime always resolves through the same transform loader.

## Orchestration loop (runtime)

| Stage | Behavior |
|-------|----------|
| **Entry** | [`DialogRequestProcessor.doProcess()`](../src/services/core/request-processor/dialog-request-processor.ts) runs the LLM, then always calls [`GrayRoomOrchestrator.runLoop()`](../src/services/core/request-processor/gray-room-orchestrator.ts). Recovery uses [`recoverDialogFromLlmPromise()`](../src/services/core/request-processor/response-path.ts) → same `runLoop`. |
| **Per iteration** | `runResponseTransform` → `extractInterrupt` → if **none**: non-dialog → optional IntentGate + syndicate if **`result.completed`**; **dialog** → immediate return; then `mergeTraceIntoResult` and return. If `interrupt` and `when` satisfied → budget → `applyInterrupt` → if `continueLoop`, rebuild `request.md` via `runPromptsTransform`, then main LLM again. |
| **Budget** | `A2A_MAX_INTERRUPT_TURNS` (default 10) on the orchestrator; per-interrupt `maxTurns` clamps via `min`. At 0 with interrupt still present → `context.interrupt_truncated: true` and return. |
| **Merge to client** | Final `ProcessResult` gets `mergeInterruptTraceIntoContext` → [`interrupt-trace-contract.ts`](../src/transform/interrupt-trace-contract.ts) only; `workbench` / `history` come from transform output and handlers. |

### Hub promise recovery (`recovered: true`)

When `runLoop` is entered from **recovery** (hub `llmPromiseId` already finished; `responseMd` is the stored hub body), **ADR-0093 Internal Debate** (`llmService.debate`, three synchronous hub/Local LLM upstream calls) is **skipped** (`!isRecovered`). Otherwise debate **replaces** `md` before the first response transform and can fail with long Local LLM upstream timeouts while the main hub promise was already done — **2026-04-06:** recovery must skip debate so a finished hub body is not re-driven through three sync hub calls (former incident note lived in removed root `BREAK_STATE.md`).

### Error paths (sidecar / sub-LLM)

| Failure | Outcome |
|---------|---------|
| **Response transform** (`runResponseTransform` → `runPromptsTransform` failure) | `ProcessResult` `outcome: 'failed'` — loop stops; no partial client merge beyond error. |
| **Follow-up request rebuild** (`runPromptsTransform` for next turn) | Same — `failed` with message. |
| **Main LLM after interrupt** (chat `!== 202` or poll timeout) | `failed` with short error text. |
| **`compress_history` / `thinking` sidecar LLM** | Caught; trace row `sidecar_llm` with `ok: false`; `compress_history` still returns `continueLoop: false` with best-effort context; `thinking` returns `continueLoop: true` even if thinking slots empty. |
| **`auto_read_file`** | Missing path → trace `missing_path`; read failure → `ok: false`, context unchanged for that file. |
| **`auto_rag_page`** | See [`mergeServerRagPageIntoContext`](../src/services/rag/auto-rag-page-server.ts); merge-only if query/path missing. |
| **Transform execute shape** | `warnOnInvalidExecute` — logs or throws if strict mode env. |

## Isolation and scheduling (policy) — GR-S-05

- **Scope:** One HTTP `/api/v1/invoke` (or session bridge equivalent); no background scheduler for gray room.
- **Tools:** Interrupt handlers use server actions (`read-file` for `auto_read_file`, RAG via `@a2a/rag` for `auto_rag_page` when configured); no writes to client session storage from the loop.
- **Sandbox:** Same workspace / env constraints as the rest of the server; no extra “gray room only” sandbox in v1.

## Runtime vs roadmap (gap) — GR-S-07

- **`shouldUseGrayRoom()` / `detectGrayRoomTrigger()`** are wired in [`DialogRequestProcessor`](../src/services/core/request-processor/dialog-request-processor.ts) and [`response-path.ts`](../src/services/core/request-processor/response-path.ts): when gray room is **off** (`A2A_GRAY_ROOM_ENABLED=0` / `false` / `no` / `off`, unless `context.execution.grayRoomRequested` or root `flowControlHint` is `gray-room`), [`runLoop(..., processInterrupts=false)`](../src/services/core/request-processor/gray-room-orchestrator.ts) runs **one** response transform and **ignores** `interrupt` (trace row `interrupt_skipped` / `gray_room_disabled`). When **on** (default if env unset), full interrupt handling applies if the transform emits `interrupt`.
- **Budget:** `GrayRoomOrchestrator` uses **`A2A_MAX_INTERRUPT_TURNS`** when set, else **`A2A_GRAY_ROOM_MAX_TURNS`** (see `readGrayRoomInterruptBudget()` in the same module).

## Transform: `$.llm.interrupt` → `$out.interrupt` — GR-S-13

- The **response** pipeline reads LLM markdown from disk as `input.llm.response` / `llm` wrapper (see [`runPromptsTransform`](../src/transform/pipeline/prompts.ts) and `response.md` staging in `gray-room-orchestrator` `runResponseTransform`).
- Transforms should copy or map `interrupt` onto the **same object** as `context` / `execute` after the pipeline (`copy` from `$.llm.interrupt` → `$.interrupt` when present). Shared baseline: [`prompts/transforms/server-transforms-response.json`](../prompts/transforms/server-transforms-response.json). LLM JSON pipelines that merge workbench/history also include the same step in [`agent-response.json`](../prompts/transforms/agent-response.json), [`dialog-response.json`](../prompts/transforms/dialog-response.json), [`dialog-llm-response.json`](../prompts/transforms/dialog-llm-response.json), and [`coder-response.json`](../prompts/transforms/coder-response.json) so `extractInterrupt` sees a top-level `interrupt` on transform output.

## Simulations and CI — GR-S-06

- Goldens: `N-sub-M/` folders (see [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md)); `sim-lint` / `sim-validate` with `--step-contract` enforce no-LLM transform rules (see `scripts/sim-contract/step-transform-rules.ts`).
- **CI:** `npm run sim:contract-report` prints structural validity + warning counts and step-contract **extra** warnings (JSON) for the GitHub Actions summary (informational; does not replace `sim:quality`).

## JSON schemas (reference)

| File | Role |
|------|------|
| [`interrupt-directive.schema.json`](../../docs/new-request-flow/json-schemas/interrupt-directive.schema.json) | `interrupt` object shape (GR-S-09); `sim-validate` validates `interrupt` when present on `response.json`. |
| [`server-interrupt-substep-request.schema.json`](../../docs/new-request-flow/json-schemas/server-interrupt-substep-request.schema.json) / [`server-interrupt-substep-response.schema.json`](../../docs/new-request-flow/json-schemas/server-interrupt-substep-response.schema.json) | Loose fixtures for `N-sub-M` (GR-S-10); optional future strict validation. |

## Observability (planned) — GR-S-14

- **Today:** logs + `interruptTrace` + **`grayRoom`** control envelope in `context.workbench.slots` for UI/ops.
- **Planned:** counters per `reason`, chain depth histogram, sidecar failure rate — tie to `/metrics` (beyond the static envelope).

## Why use it

- **History compression** — Summarize long `history` with an LLM instead of hard truncation.
- **Thinking step** — Store structured reasoning in `context.workbench.slots.thinking`, then run the main LLM again with that context.
- **RAG pagination** — `auto_rag_page` re-enters the main loop; optional **`@a2a/rag`** search when `data.query` and `A2A_RAG_PROJECT_PATH` / `data.projectPath` are set (see § Implemented `reason` values).
- **`auto_read_file` / `clarify` / `interrupt.schema`** — implemented in `applyInterrupt` / the loop (`maxTurns` clamping applies per § Loop limits).
- **Black Room algorithms** — `algorithm_invoke` routes deterministic tasks to local Local LLM upstream for cost-effective, consistent execution (see ADR-0058).

## Protocol: `interrupt` on transform output

The **response** transform must place `interrupt` on the same object that carries `context` and `execute` (i.e. `$out.interrupt` after transforms). The LLM may emit `interrupt` inside the JSON in `response.md`; transforms should copy `$.llm.interrupt` → `$.interrupt` when you enable this path.

```json
{
  "context": {},
  "execute": { "write-file": { "path": "...", "content": "..." } },
  "interrupt": {
    "reason": "compress_history",
    "maxTurns": 3,
    "schema": "optional-other-transform-schema",
    "context": {},
    "data": {}
  }
}
```

| Field | Type | Purpose |
|--------|------|---------|
| `reason` | string | **Required.** Selects handler in `applyInterrupt`. |
| `maxTurns` | number | Per-interrupt cap merged with the global budget: before each handled interrupt, `interruptBudget = min(remaining global budget, maxTurns)` when `maxTurns` is a non‑negative number. |
| `schema` | string | Optional alternate transform folder name for the **next** follow-up turn (`request.md` rebuild + next `response.md` transform) when `continueLoop` is true. |
| `context` | object | Shallow-merged over the current invoke context before the interrupt handler runs. |
| `data` | object | Handler-specific payload (e.g. merged into context for `auto_rag_page`). |
| `when` | object | Optional gates: **`historyMinLength`** / **`historyMaxLength`** vs current dialog history. If not satisfied, the server skips the interrupt (same as no `interrupt`); trace gets `interrupt_skipped`. |

## Implemented `reason` values

| `reason` | Behavior | `continueLoop` |
|----------|----------|----------------|
| `compress_history` | Calls AI Hub with a compress prompt when history is non-empty (optional skip: env **`A2A_COMPRESS_HISTORY_MIN_ENTRIES`** — if `> 0`, skip when `history.length <=` that value). On success replaces **top-level** `history` and `context.history`. | `false` — server returns **one** `ProcessResult` built from **updated context** and the **same** primary LLM `execute` / message. |
| `thinking` | Calls AI Hub; parsed JSON stored under `context.workbench.slots.thinking`. | `true` — runs **request transform → main LLM → response transform** again with updated context. |
| `auto_rag_page` | Merges `data`, sets `_interrupt_reason`, then **re-enters** the main loop (`continueLoop: true`). If **`data.query`** is non-empty and **`data.projectPath`** or env **`A2A_RAG_PROJECT_PATH`** is set, the server runs **`@a2a/rag`** (`createRAGClientService` → `initialize` → `search`), appends hits to **`context.ragResults`**, and adds **`context._server_rag_page`**. If query or path is missing, behavior is merge-only (no server search). | `true` |
| `auto_read_file` | Reads `data.filePath` or `data.path` via the workspace `read-file` handler; merges into `context.files`. | `false` — returns with updated context and the same primary `execute`. |
| `clarify` | Stores `data` under `context.workbench.slots.clarify`. | `false` — same as `auto_read_file` for loop semantics. |
| `algorithm_invoke` | Routes to **Black Room** (Algorithm Mode) for deterministic execution on local Local LLM upstream. Requires `interrupt.algorithmId` and merges results into `context.workbench.slots.blackRoomContext`. | `false` — returns with algorithm results merged into context. |
| *(anything else)* | Logged; loop stops; client gets current result **without** `interrupt` consumption beyond that. | `false` |

## Loop limits and truncation

- **`A2A_MAX_INTERRUPT_TURNS`** — Global cap (default `10`). Each time an `interrupt` is present and handled, the budget decrements **once** after `maxTurns` clamping (see above).
- **`interrupt.maxTurns`** — When set, tightens the remaining budget for that interrupt: `interruptBudget = min(interruptBudget, maxTurns)` before the usual decrement.
- When the budget hits **0** while an interrupt is still present, the server returns the current `ProcessResult` with **`context.interrupt_truncated: true`**.

## AI Hub / promises

- The **first** main LLM call for an invoke still registers `llmPromiseId` on the request via `requestService.updateLlmPromiseId`.
- **Interrupt** sub-calls use distinct `X-Server-Promise-Id` values (e.g. `${promiseId}-compress`, `${promiseId}-think`, `${promiseId}-intr-<n>`) and **do not** replace that mapping.
- Model: `LOCAL_LLM_MODEL` (default `qwen3:8b`); base URL: `AI_HUB_URL` (default `http://localhost:11434`).

## Simulations (goldens)

- Default goldens often show a **single** LLM turn (`response.md` without `interrupt`). That stays the sync contract baseline.
- Optional narrative: [`simulations/agent-auto-ai/6/interrupt.md`](../../simulations/agent-auto-ai/6/interrupt.md).
- Substep goldens in **`6-sub-1`** … **`6-sub-4`** (`N-sub-M`); trace lives in each folder’s **`response.json`** → `workbench.slots.interruptTrace`.
- [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) — `interrupt.md` and `N-sub-M/` folders (not full eight-file steps).
- To add a **full** golden with interrupts: extend `response.md` + `server-transforms-response.json` to emit `interrupt`, then set `response.json` / `received.json` to the **final** post-loop state.

## Example: `compress_history`

1. LLM JSON in `response.md` includes `"interrupt": { "reason": "compress_history" }`.
2. Response transform copies it to `$out.interrupt`.
3. Server runs the compress chat; replaces history arrays.
4. Client receives the usual `execute` (e.g. `write-file`) and **shortened** `history`.

## Example: `thinking` then second main turn

1. LLM emits `interrupt: { "reason": "thinking" }`.
2. Server fills `workbench.slots.thinking`, then rebuilds `request.md` and calls the main LLM again.
3. Final response transform has **no** `interrupt` → result returned to client.

## Client visibility: `interruptTrace`

Each completed dialog invoke may include **`context.workbench.slots.interruptTrace`**: an ordered array of [`ServerInterruptTraceEvent`](../src/transform/types.ts) objects (`llm_output`, `response_transform`, `interrupt_handler`, `request_rebuild`, `sidecar_llm`). The Web task-flow UI renders them as a collapsible **“Server LLM chain”** block (see `a2a-client/packages/web/js/task-flow/render.js`).

## Client visibility: `grayRoom` (GR-S-08)

Each invoke that runs [`GrayRoomOrchestrator.runLoop()`](../src/services/core/request-processor/gray-room-orchestrator.ts) merges **`context.workbench.slots.grayRoom`**: a [`GrayRoomControlEnvelope`](../src/transform/types.ts) (`enabled`, `planId`, `phase`, `maxTurns`, `turn`, `remainingBudget`, `status`, `lastReason`, `timestamps`, `traceRef`). Updated on every successful return from the loop (including `interrupt_truncated`). Failed paths (transform/LLM hard errors) do not write the slot. The Web task-flow UI renders a collapsible **Gray room** block via `buildGrayRoomHtml()` in [`a2a-client/packages/web/js/task-flow/render-layout.js`](../../a2a-client/packages/web/js/task-flow/render-layout.js) (alongside **Server LLM chain** / `interruptTrace`). Golden fixture: [`simulations/resilience-contract/6/response.json`](../../simulations/resilience-contract/6/response.json).

## Limitations (current code)

- Intermediate interrupt LLM text is **not** sent to the client — only structured trace rows and the final `execute` / context.
- **`interrupt.schema`** is applied only when the handler returns **`continueLoop: true`** (next rebuild uses the named transform pack).
- There is **no** separate guard that forbids repeating the same `reason`; only the global budget applies.

## See also

- [LLM-REQUEST-PREP.md](./LLM-REQUEST-PREP.md) — how `request.md` is built **before** the first LLM call.
- [TRANSFORM-OPS.md](./TRANSFORM-OPS.md) — response pipeline operations.
- [ADR-0029](../../docs/adr/ADR-0029-server-interrupt-loop.md) — decision record (summary).
- Legacy filename redirect: [SERVER-INTERRUPT-LOOP.md](./SERVER-INTERRUPT-LOOP.md) (points here).
