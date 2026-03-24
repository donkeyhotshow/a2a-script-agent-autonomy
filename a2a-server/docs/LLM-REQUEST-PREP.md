# LLM request preparation

This document describes what happens **on the server** after the client invoke payload is accepted and **before** the LLM receives `request.md` (and optional `system.md`).

Relevant code:

- [`runPromptsTransform`](../src/transform/pipeline.ts) — entry: clones request transforms input, runs prep, runs pipeline.
- [`prepareInvokePayloadForLlmPrompt`](../src/transform/materialize-result-for-llm.ts) — folds `result` into `context.history`, clears `result`.
- [`attachFlowControlHintToInvokePayload`](../src/prompts/flow-control-hints.ts) — sets `flowControlHint` from `execution.action` + `execution.step`.
- [`attachWorkbenchForLlmPrompt`](../src/transform/workbench-normalize.ts) — canonical `context.workbench`, root `workbench` for templates; strips stray `docVirtual` after folding into `sections`.

---

## 1. `result` → `history` (not sent as `result` to the model)

For **`type === 'request'`** only, `runPromptsTransform` builds a **deep clone** of the invoke-shaped object, then runs `prepareInvokePayloadForLlmPrompt`.

| Source | Becomes |
|--------|---------|
| `result.message` (non-empty string) | `context.history[]` entry `{ role: "user", message }` (skipped if an identical user line already exists). |
| Every **other** key on `result` (tool / action-key payloads) | `context.history[]` entry `{ role: "system", message }` with a **short one-line summary** (see `formatToolResultForHistory`). |
| Duplicate system line (exact same `message` as an existing system entry) | Not appended again. |

After that, **`result` is set to `{}`** for template rendering. Request markdown templates **do not** include a `result` block anymore; tool outcomes are only visible to the model via **history**.

Supported summaries include: `rag-search`, `list-directory`, `read-file`, `write-file`, `grep-search`, `execute-command`; other keys fall back to truncated JSON.

The **original** object passed into `runPromptsTransform` is not mutated by this step (the pipeline uses the clone).

---

## 2. Flow-control hints (`action` + `step`)

Still on the **request** clone, **`attachFlowControlHintToInvokePayload`** sets a root-level string:

```text
flowControlHint
```

Templates inject it with **`${flowControlHint}`** (see `render-markdown` / `renderTemplateSimple`).

### How the key is chosen

1. Read **`context.execution.action`** and **`context.execution.step`** (trimmed strings).
2. If `execution.action` is missing, fall back to top-level **`action`**.
3. Missing or empty step is treated as **`*`**.
4. Lookup order: **`action:step`** → **`action:*`** → **`*:step`** → default paragraph (`DEFAULT_HINT` in [`flow-control-hints.ts`](../src/prompts/flow-control-hints.ts)).

### Where it appears in prompts

| Template | Section |
|----------|---------|
| `prompts/auto-ai-request.md` | “Flow for this turn” |
| `prompts/dialog-request.md` | “Flow for this turn” |
| `prompts/coder-request.md` | “Flow for this turn” |
| `prompts/analyze-request.md` | “Flow for this turn” |

### Extending hints

Edit **`BY_ACTION_STEP`** in [`src/prompts/flow-control-hints.ts`](../src/prompts/flow-control-hints.ts). Use stable `action` / `step` values that your client and response transform actually persist in `context.execution`.

Custom simulation-only markdown (e.g. under `simulations/.../request.md` templates) must include **`${flowControlHint}`** manually if you want the same behavior.

---

## 2b. `context.workbench` (structured working state)

After flow hints, **`attachWorkbenchForLlmPrompt`** runs (see [`src/transform/workbench-normalize.ts`](../src/transform/workbench-normalize.ts)) on the same request clone.

| Shape | Behavior |
|-------|----------|
| `context.workbench` | Copied through; merged with any stray `context.docVirtual` into `sections` if `sections` was missing. |
| Only `context.docVirtual` (old clients) | Folded into `workbench.sections`, then **`docVirtual` is removed** from the clone so the model never sees both. |
| Root for templates | **`workbench`** only (`${workbench}`). |

**`workbench`** may include **`sections`**, **`batch`**, **`slots`**. Do not send `docVirtual` in new integrations.

### 2c. Persisting `workbench.sections` from the LLM (response transform)

After `response.md` is parsed into `$llm`, base pipelines for **auto-ai**, **coder**, and **analyze** run:

1. **`merge-workbench-sections`** — `$.llm.workbench.sections` shallow-merged into `$.context.workbench.sections` (optional bulk update).
2. **`apply-workbench-section-ops`** — `$.llm.workbench_ops` applied in order (`set` / `append` / `remove`, with short aliases `o` / `k` / `v` / `t`). Runs **after** merge so ops win on the same key.

Prompt contract and examples: [`prompts/auto-ai-request.md`](../prompts/auto-ai-request.md) (Auto-AI), [`prompts/coder-request.md`](../prompts/coder-request.md) (Coder). **Dialog** LLM responses use [`prompts/transforms/dialog-llm-response.json`](../prompts/transforms/dialog-llm-response.json) (before the generic `server-transforms-response.json` fallback) so `workbench` merges apply; see [`prompts/dialog-request.md`](../prompts/dialog-request.md) for optional RAG / file tools. Full op reference: [`TRANSFORM-OPS.md`](./TRANSFORM-OPS.md).

---

## 3. Request transform pipeline (after prep)

Standard pipeline now uses **context optimization operations** before rendering. Base transforms (`prompts/transforms/coder-request.json`, `auto-ai-request.json`) apply `switch` on `execution.step` to select the right `pick-context` profile automatically.

Full operations reference: **[`TRANSFORM-OPS.md`](./TRANSFORM-OPS.md)**

### Optimization operations (request pipeline only)

| op | When to use |
|----|-------------|
| `pick-context` | Always — first op after `copy`. Drops fields not needed for this step. |
| `drop` | Targeted removal of a single path when `pick-context` is too broad. |
| `truncate-history` | When history limit differs from `pick-context` shorthand. |
| `include-if` | Optional fields (e.g. `workbench` only when non-empty). |
| `pick-files` | After `pick-context` includes `files` — narrow to relevant paths only. |
| `merge-files-to-context` | Before `pick-context` — fold `result["read-file"]` into `context.files`. |
| `summarize-files` | After `pick-context` includes `files` — truncate to N lines per file. |
| `for-each` | Batch processing of `workbench.batch.items`. |

**Response pipeline (typical AI-action):** after `parse-json-from-md` → `set` step / `append-to-array` history / `set` execute → add **`merge-workbench-sections`** and **`apply-workbench-section-ops`** when the action uses `context.workbench` (see `auto-ai-response.json`, `coder-response.json`, `analyze-response.json`).

### Canonical per-step pattern

```json
{
  "type": "pipeline",
  "steps": [
    { "op": "copy", "from": "$", "to": "$out" },
    { "op": "pick-context", "include": ["execution", "task", "history", "scratchpad"] },
    { "op": "render-markdown", "templateRef": "a2a-server/prompts/YOUR-PROMPT.md", "data": "$out", "outputFile": "request.md" }
  ]
}
```

The old **`append-to-array`** step that pushed `result.message` into history is **removed** from canonical transforms; materialization replaces it.

---

## 4. Tests

| Test file | Covers |
|-----------|--------|
| [`tests/unit/materialize-result-for-llm.test.ts`](../tests/unit/materialize-result-for-llm.test.ts) | User fold, dedupe, RAG/grep formatting |
| [`tests/unit/flow-control-hints.test.ts`](../tests/unit/flow-control-hints.test.ts) | Resolution and `attachFlowControlHintToInvokePayload` |
| [`tests/transform-runtime.test.ts`](../tests/transform-runtime.test.ts) | End-to-end transform pipelines (all registered `op`s, including workbench merge + ops) |

---

## 5. Related docs

- **[`EXTENDING-LLM-ACTIONS.md`](./EXTENDING-LLM-ACTIONS.md)** — playbook for new tools, RAG modes, transforms, and goldens.
- **[`TRANSFORM-OPS.md`](./TRANSFORM-OPS.md)** — full operations reference with context optimization matrix.
- [`ADR-0026-server-llm-request-prep.md`](../../docs/adr/ADR-0026-server-llm-request-prep.md) — architecture decision.
- [`AI-ACTION-TRANSFORM-PATTERN.md`](./AI-ACTION-TRANSFORM-PATTERN.md) — LLM JSON shape, response transforms, simulations.
- Planning mirror: [`planning/LLM-REQUEST-PREP.md`](./planning/LLM-REQUEST-PREP.md).
