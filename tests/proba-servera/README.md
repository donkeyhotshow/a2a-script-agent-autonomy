# Proba-servera (`tests/proba-servera`)

**Authoring (add/edit cases):** [`AUTHORING.md`](AUTHORING.md)

**Purpose:** One folder per case (`input.json` + `expected.json`). Each run exercises the same **invoke body** shape as **`POST /api/v1/invoke`**, then compares a **key-structure subset** of the terminal payload to `expected.json`.

**Normative contract:** **[`simulations/`](../../simulations/)** (per-step `request.json` / `response.json`, plus [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md)) is the **source of truth** for payload shape, action-key rules, and golden flows. Proba is a **regression harness** (in-process invoke + optional `$proba` helpers); it does **not** define a parallel schema. If proba and a golden sim disagree, **fix proba** (or extend the sim first, then align proba).

**Default mode (no HTTP to a2a-server):** `validate.mts` loads a2a-server config/registry, calls **`invoke()`** in-process (`a2a-server/src/services/utils/invoke.service.js`), waits until the stored request row is **completed** or **failed** (same `promiseId` polling idea as production — **no poll deadline**), and normalizes the result to `{ context, execute?, outcome?, error? }`.

**Optional HTTP mode:** `PROBA_SERVERA_USE_HTTP=1` — `POST http://localhost:3000/api/v1/invoke` and poll `http://localhost:3000/api/v1/requests/{promiseId}/result` until terminal (no wall-clock cap on that poll loop).

**Stack (not optional unless you skip the gate):** These cases hit the **real** dialog/agent/LLM path (Gray Room, etc.). By default the runner **exits before any case** unless **`${AI_HUB_URL}/health`** is OK (default base `http://localhost:11434`, trailing slash stripped) **and** **`http://localhost:11435/api/tags`** is OK. **`http://localhost:3000/health`** (a2a-server) is probed **only** when `PROBA_SERVERA_USE_HTTP=1`. To skip only this preflight: `PROBA_SERVERA_SKIP_STACK_CHECK=1` (CI/offline) — invokes may still **fail or be meaningless** if the LLM stack is down.

**Checks:** (1) **Key-structure subset** on `expected.json` (minus top-level `$proba`); optional **`$proba.ignorePaths`**; **`$…` directive objects** (`$regex`, `$type`, `$enum`, length bounds) for precise checks before structure normalization. (2) If **`input.json` has non-empty `context.history`**, **`expected.json` must declare `context.history`** unless `$proba.skipHistoryTemplate`. **Array lengths** in `expected` must match `actual` (including `context.history`) unless `$proba.skipHistoryLengthCheck`. (3) **Semantic** — if `outcome !== 'failed'`, `context.task` is set, and `context.history` is non-empty, at least one entry must have `role: user`.

## Source of truth (fixtures)

Same as **normative contract** above: copy beats from **`simulations/sync/...`** step folders; do not invent fields that are not present in the matching golden unless the server truly emits them and you document why (prefer extending the sim golden first).

| Use | Path |
|-----|------|
| Multi-step agent tool loop | [`simulations/sync/agent-tool-loop/`](../../simulations/sync/agent-tool-loop/) |
| Workspace tools (grep, file-exists, …) | [`simulations/sync/agent-workspace-tools/`](../../simulations/sync/agent-workspace-tools/) |
| Action-key contract | [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) |

Align **`context` / `result`** with the matching golden step where you copied a chain; relax only fields that legitimately vary (e.g. LLM copy), not the action-key rule.

## `input.json` rules

1. **One case = one invoke.** Mapped by `inputToInvokePayload` in `validate.mts`: includes **`context`** from the file (omit → `undefined`; `invoke()` still builds a minimal context). Optional top-level: **`task`**, **`message`**, **`result`**, **`action`**, **`selectedAction`**, **`stepId`**, **`stepResult`**, **`code_blocks`**. Other invoke fields (e.g. **`llmModel`**) are **not** forwarded — they are dropped.
2. **`context.task`** — keep consistent with the golden sim when mirroring a flow.
3. **`context.history`** — state **before** this invoke’s `result`, consistent with that step’s `request.json` / prior `response.json` in the golden folder.
4. **`context.execution.step`** — must match the step where the tool result applies (e.g. `tool_read_file` when sending `result.read-file`).
5. **`result`** — one action key (`read-file`, `grep-search`, …) with the tool outcome; not a duplicate of the pending `execute` request.

## `expected.json` rules

1. **Structural template** — not full JSON equality. For primitives, only the **JSON type** must match (any string matches any string; same for number/boolean/null).
2. **Extra keys in actual** are ignored.
3. **Arrays:** the first element of the array in `expected.json` defines the template; **each** actual element is checked against it.
4. Prefer expectations on **`context.execution`**, **`workbench`**, and one **`execute.<action-key>`** subtree where applicable; terminal steps may follow golden `response.json` shapes.

## Runner

- From repo root: **`npm run validate:proba-servera`** (`package.json` → `tsx tests/proba-servera/validate.mts`).
- **`PROBA_STACK_PROBE_MS`** — per-probe timeout (default 4000 ms).
- **`PROBA_SERVERA_ONLY`** — run one folder only (e.g. `PROBA_SERVERA_ONLY=script-select`).

## Artifacts

- **`output.json`** — last normalized terminal payload for the case.
- **`error-report.md`** — structure diffs and/or thrown error; may include the semantic history note.
- **`REGRESSIONS.md`** — summary written at the end of a full run.

## Related docs

- [`AGENTS.md`](../../AGENTS.md) — invoke / action-key rules.
- [`PAPA-MAMA.md`](../../PAPA-MAMA.md) — proba-servera is under the “Mama” (depth/invoke) bucket vs Client API “Papa” tests; see that file for orchestration (`test:gang`, etc.).
