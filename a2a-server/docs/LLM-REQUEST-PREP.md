# LLM request preparation

This document describes what happens **on the server** after the client invoke payload is accepted and **before** the LLM receives `request.md` (and optional `system.md`).

Relevant code:

- [`runPromptsTransform`](../src/transform/pipeline.ts) — entry: clones request transforms input, runs prep, runs pipeline.
- [`prepareInvokePayloadForLlmPrompt`](../src/transform/materialize-result-for-llm.ts) — folds `result` into `context.history`, clears `result`.
- [`attachFlowControlHintToInvokePayload`](../src/prompts/flow-control-hints.ts) — sets `flowControlHint` from `execution.action` + `execution.step`.

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
| `prompts/coder-context.md` | “Flow for this turn” (second markdown file in coder pipeline) |

### Extending hints

Edit **`BY_ACTION_STEP`** in [`src/prompts/flow-control-hints.ts`](../src/prompts/flow-control-hints.ts). Use stable `action` / `step` values that your client and response transform actually persist in `context.execution`.

Custom simulation-only markdown (e.g. under `simulations/.../request.md` templates) must include **`${flowControlHint}`** manually if you want the same behavior.

---

## 3. Request transform pipeline (after prep)

Standard pipeline (e.g. [`prompts/transforms/server-transforms-request.json`](../prompts/transforms/server-transforms-request.json)):

1. **`copy`** `$` → `$out` (includes `context`, `flowControlHint`, empty `result`, etc.).
2. **`render-markdown`** (and for coder, a second render for `system.md` + `request.md`).

The old **`append-to-array`** step that pushed `result.message` into history is **removed** from canonical transforms; materialization replaces it.

---

## 4. Tests

| Test file | Covers |
|-----------|--------|
| [`tests/unit/materialize-result-for-llm.test.ts`](../tests/unit/materialize-result-for-llm.test.ts) | User fold, dedupe, RAG/grep formatting |
| [`tests/unit/flow-control-hints.test.ts`](../tests/unit/flow-control-hints.test.ts) | Resolution and `attachFlowControlHintToInvokePayload` |
| [`tests/transform-runtime.test.ts`](../tests/transform-runtime.test.ts) | End-to-end transform pipelines |

---

## 5. Related docs

- [`ADR-0026-server-llm-request-prep.md`](../../docs/adr/ADR-0026-server-llm-request-prep.md) — architecture decision (this behavior).
- [`AI-ACTION-TRANSFORM-PATTERN.md`](./AI-ACTION-TRANSFORM-PATTERN.md) — LLM JSON shape, response transforms, simulations.
- Planning mirror (repo root): [`docs/planning/LLM-REQUEST-PREP.md`](../../docs/planning/LLM-REQUEST-PREP.md) — same topic for roadmap / simulations planning.
