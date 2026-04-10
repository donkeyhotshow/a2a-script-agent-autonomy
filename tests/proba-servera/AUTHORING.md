# Authoring rules: `tests/proba-servera`

Use this when **adding** or **editing** a proba case. Implementation: [`validate.mts`](validate.mts).

## What a case is

- One **subfolder** under `tests/proba-servera/` whose name describes the scenario (kebab-case, e.g. `agent-tool-read-file`).
- Required: **`input.json`** + **`expected.json`** (otherwise the runner skips the folder).
- Generated on run: **`output.json`**, **`error-report.md`** (per case), **`REGRESSIONS.md`** (whole suite). Do not hand-edit `output.json` except to delete before a clean run if you rely on it for review.

## Preconditions

- Default run probes **`${AI_HUB_URL}/health`** (default base `http://localhost:11434`, trailing slash on `AI_HUB_URL` is stripped) and **`http://localhost:11435/api/tags`**, unless `PROBA_SERVERA_SKIP_STACK_CHECK=1`.
- **`a2a-server` HTTP (`http://localhost:3000/health`)** is probed only when `PROBA_SERVERA_USE_HTTP=1`. **Default mode** uses in-process `invoke()` (no HTTP to a2a-server); it still `chdir`s into `a2a-server` for config/registry.

## 1. `input.json` (invoke body)

The runner maps the file with `inputToInvokePayload` — only known fields are forwarded; everything else is dropped.

| Field | Required | Notes |
|--------|----------|--------|
| `context` | No | Always forwarded as `context` (value may be omitted / non-object); fixtures usually pass an object like live invoke bodies. |
| `task` | No | Top-level string → invoke `task`. |
| `message` | No | Top-level string → invoke `message`. |
| `result` | No | Object → invoke `result`; **one action key** (tool outcome or `message`), not multiple competing keys. |
| `action` | No | String. |
| `selectedAction` | No | Object. |
| `stepId` | No | String. |
| `stepResult` | No | Any. |
| `code_blocks` | No | Any. |

`invoke()` also accepts top-level **`llmModel`** (see `InvokeInput` in `invoke.service.ts`); **`validate.mts` does not forward it** — use only the fields above in `input.json`.

**Rules:**

1. **One invoke per case** — do not merge two logical steps into one file unless you are testing a single server turn.
2. **`context.execution`** — `action` / `step` must match what the server expects for that turn (e.g. `tool_read_file` when submitting `result.read-file`).
3. **`context.history`** — snapshot **before** this turn’s `result` is applied; align with the golden sim’s `request.json` / previous `response.json` when copying a chain from [`simulations/sync/`](../../simulations/sync/).
4. **`context.task`** — the **semantic check** applies only when **`context.history` is also a non-empty array** (see §3): then history must include a `role: user` entry.

Copy **`result` tool payloads** and **`context`** from the matching golden step where possible; keep [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) action-key rules.

**`result.completed` (LLM / Gray Room):** On live agent-class invokes, the server merges the model’s top-level **`completed`** into **`result.completed`** after response transforms. That flag gates **syndicate / SIEGE_REVIEW** when Gray Room exits without the interrupt loop — see [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) (*Optional `result` on `response.json`*). Proba **`expected.json`** does not need to assert `result` unless your case explicitly checks completion signaling.

**Request vs response:** `result` must be a **completed tool outcome** for the current `context.execution.step` (or `choice` / `message` where the golden does that). Do **not** paste **`execute.*`** shapes into `result` (e.g. `rag-search` with only `query`/`limit` and empty `results`/`files` when the step is “submit RAG results” — that belongs in [`simulations/sync/agent/5/request.json`](../../simulations/sync/agent/5/request.json), not a gate-only step). If the case targets “server asks for next tool”, copy the **prior** golden **`request.json`** (e.g. gate + `result.choice`, or the step that completes the previous tool).

## 2. `expected.json` (what we assert)

The runner compares **key structure**, not full JSON equality (`getKeyStructure` + `compareWithDiff`).

**Included in the normalized actual payload:**

- Always: `context` (may be empty object).
- Success: `execute` only if non-empty object.
- Failure: `outcome: "failed"` and optional `error` (no `execute` required the same way).

**Matching rules:**

1. Every **key path** present in `expected.json` must exist in the actual object with a **compatible nested shape** (object/array/primitive type).
2. **Primitives:** only **JSON type** must match — any string matches any string; do not assert exact LLM wording unless you also pin the model.
3. **Extra keys** on the actual side are **ignored** — you do not need to list `session_id`, full `workbench`, etc., unless you care about structure under those paths.
4. **Arrays:** `expected[0]` is the template; **every** element of the actual array is checked against that template. Keep templates minimal (only keys you need).

**`context.history` in `expected.json`**

- If **`input.json` has a non-empty `context.history`**, **`expected.json` must also include a non-empty `context.history`** (structure template).
- **Length:** **`actual.context.history.length` must equal the number of elements in `expected.context.history`** (not “one template repeated implicitly”). Repeat the same template object once per expected line (e.g. 9 lines in `expected.json` ⇒ the server must return exactly 9 history entries). Extra keys on each entry (`step`, etc.) are still allowed.
- **Structure:** Each actual line must still match the shape implied by `expected[0]` in the matcher (`role` + `message` minima when you use the usual template).
- Exception: **`"$proba": { "skipHistoryTemplate": true }`** when you intentionally omit `context.history` in `expected` (rare).
- Exception: **`"$proba": { "skipHistoryLengthCheck": true }`** when length is non-deterministic (rare; avoid if possible).

**Do not compare some fields (volatile / noisy)**

- Optional top-level **`$proba`** object:
  - **`ignorePaths`**: string array — dot/bracket paths **removed from both** the actual and expected clone before the structure compare (e.g. `"context.task"`, `"context.history[2].message"`).
  - **`skipHistoryTemplate`**: boolean — see above.
  - **`skipHistoryLengthCheck`**: boolean — skip the strict `context.history` length equality check.

Example:

```json
{
  "$proba": {
    "ignorePaths": ["context.task"]
  },
  "context": { "execution": { "action": "string", "step": "string" } },
  "execute": { }
}
```

**Directive objects (precise checks, optional)**

Use a JSON object whose **keys are only `$…`** to assert more than “any string”:

| Directive | Meaning |
|-----------|---------|
| `{ "$type": "string" }` | `typeof` must match (`string`, `number`, `boolean`, `object`, `array`, `null`). |
| `{ "$regex": "pattern", "$flags": "i" }` | String must match regex (`$flags` optional). |
| `{ "$enum": [ ... ] }` | Value must be strictly equal to one of the entries. |
| `{ "$minLength": n }` / `{ "$maxLength": n }` | For strings, length bounds (combined with `$regex` / `$type` in the same object). |

**Rules:** Only `$`-prefixed keys in that object. Combine directives in one object (e.g. `{ "$type": "string", "$regex": "^prefix" }`). The structure pass sees a placeholder; **directive checks run first** in the same tree walk as array length (except `*.history` length when `$proba.skipHistoryLengthCheck` is set).

Example: pin a message prefix without pinning the full LLM line:

```json
"context": {
  "history": [
    { "role": "user", "message": { "$regex": "^Знайди" } },
    { "role": "string", "message": "string" }
  ]
}
```

**Prefer asserting:**

- `context.execution` (step, action),
- stable parts of `execute` (e.g. `form`, action key name),
- `context.workbench` sections you care about,

not long free-text fields that change with the model.

## 3. Semantic check (automatic)

If **all** of the following hold, the case **fails** unless you fix history:

- `outcome !== "failed"`
- `context.task` is a non-empty string
- `context.history` is a non-empty array

→ then **`history` must include at least one entry with `role: "user"`** (case-insensitive).

**Fix:** add a user line to `context.history` in `input.json` that reflects the real user turn, or clear `task` / empty history if the scenario is intentionally not user-task-shaped (rare).

## 4. Workflow: add a new case

1. Pick a **golden reference** under `simulations/sync/` (e.g. [`agent-tool-loop/`](../../simulations/sync/agent-tool-loop/), [`agent-workspace-tools/`](../../simulations/sync/agent-workspace-tools/)) and the **step** you mirror.
2. Create the folder + **`input.json`** from that step’s invoke-shaped payload (`request.json` / prior state + `result`).
3. Run **`npm run validate:proba-servera`** from repo root (stack up, or `PROBA_SERVERA_SKIP_STACK_CHECK=1` if you accept flakiness).
4. Open **`output.json`** for the new case; trim to **`expected.json`** — only keys you want to lock (see §2).
5. Re-run until **PASS**; commit **`input.json`** + **`expected.json`**. **`output.json`** / **`error-report.md`**: commit only if the team uses them as artifacts; otherwise add to `.gitignore` locally or delete before commit (follow repo convention).

## 5. Workflow: edit an existing case

1. Change **`input.json`** or server behavior first; then adjust **`expected.json`** only if the **contract** you care about changed — not every incidental field in `output.json`.
2. If the failure is **semantic** (user missing in history), fix **`input.json` `context.history`** / `task`, not `expected.json`.
3. If the server **intentionally** changed shape, update **`expected.json`** to the new stable structure and document in the PR.

## 6. Common mistakes

| Mistake | Result |
|---------|--------|
| Wrong `context.execution.step` vs `result` action key | Wrong pipeline branch or failed invoke. |
| `expected.json` with exact LLM strings | Fragile; use type-level or structural checks. |
| Non-empty `context.task` but `context.history` empty | **No** semantic failure from this guard (check runs only when history is non-empty). |
| **`input.json` has non-empty `context.history` but `expected.json` omits it** | Runner fails immediately (unless `$proba.skipHistoryTemplate`). |
| **`actual.context.history.length` ≠ number of elements in `expected.context.history`** | Fails (unless `$proba.skipHistoryLengthCheck`). |
| Extra fields in `input.json` not listed in `inputToInvokePayload` | **Silently dropped** — not sent to `invoke`. |
| Expecting Client API **`received.json`** shape | Proba compares **server** normalized payload, not Web DTO. |

## 7. Related docs

- [README.md](README.md) — overview, env, artifacts.
- [`AGENTS.md`](../../AGENTS.md) — invoke / action-key rules.
- [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) — sync pipeline and contracts.
