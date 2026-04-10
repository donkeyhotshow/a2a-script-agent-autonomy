# Transform Operations Reference

**Canonical reference** for all pipeline operations in `a2a-server/src/transform/`.

Implementation: [`operations.ts`](../src/transform/operations.ts) · Types: [`types.ts`](../src/transform/types.ts) · Tests: [`tests/transform-runtime.test.ts`](../tests/transform-runtime.test.ts)

---

## All operations

| op | Purpose | Required params |
|----|---------|----------------|
| `copy` | Copy full input to `$out` | `from`, `to` |
| `set` | Set literal or JSONPath value | `path`, `value` or `valueFrom` |
| `append-to-array` | Append entry to array | `to`, `value` |
| `truncate-section` | Cap string length in field or shallow object | `path`, `maxChars` |
| `apply-scratchpad-ops` | Merge LLM `scratchpad_ops` into `context.scratchpad` | `from` |
| `merge-workbench-sections` | Shallow-merge `llm.workbench.sections` → `context.workbench.sections` | `from`, `to` |
| `apply-workbench-section-ops` | Apply LLM `workbench_ops` (set/append/remove; short keys `o`,`k`,`v`,`t`) | `from`, `sectionsPath?` |
| `pick-context` | Keep only listed fields under `context`, drop the rest | `include: string[]` |
| `drop` | Delete a JSONPath from `$out` | `path` |
| `truncate-history` | Keep only last N history entries | `keep: number` |
| `include-if` | Drop `path` when `condition` is falsy | `path`, `condition` |
| `pick-files` | Keep only specific paths in `context.files` | `paths: string[] \| "$result"` |
| `merge-files-to-context` | Fold `result["read-file"]` / `result["write-file"]` → `context.files[path]` | — |
| `summarize-files` | Truncate `context.files` values to first N lines | `maxLines?`, `only?: string[]` |
| `for-each` | Run sub-pipeline per element of an array | `arrayPath`, `as`, `steps` |
| `render-markdown` | Render prompt template → file | `templateRef`, `data`, `outputFile` |
| `parse-json-from-md` | Extract JSON from markdown file | `fromFile`, `to` |
| `switch` | Conditional branch by discriminator value | `discriminator`, `cases`, `default?` |

---

## Context optimization operations

These operations exist specifically to reduce tokens sent to the LLM.

### `pick-context`

Keeps only listed fields under `context`, drops everything else. Supports `"field:N"` shorthand for arrays.

```json
{ "op": "pick-context", "include": ["execution", "task", "history", "scratchpad"] }
```

- `"history:N"` — keeps last N entries of `context.history`
- Fields not in `include` are silently dropped
- Always run after `copy` as the first optimization step

### `drop`

Deletes a single JSONPath from `$out`. Use for targeted removal when `pick-context` is too broad.

```json
{ "op": "drop", "path": "$.context.files" }
```

### `truncate-history`

Keeps only the last N entries of `context.history`. Use when `pick-context` `history:N` shorthand is not available (e.g. inside `switch` cases that need different limits).

```json
{ "op": "truncate-history", "keep": 4 }
```

### `include-if`

Drops `path` from `$out` when `condition` resolves to falsy. Use for optional fields that are only relevant in certain states.

```json
{ "op": "include-if", "path": "$.context.workbench", "condition": "$.context.execution.step" }
```

### `pick-files`

Keeps only specific paths in `context.files`. Use after `pick-context` includes `files` to further narrow which files the LLM sees.

```json
{ "op": "pick-files", "paths": ["src/auth.js"] }
```

`"$result"` auto-picks from `result.*.files` array (e.g. from `rag-search` result):

```json
{ "op": "pick-files", "paths": "$result" }
```

### `merge-files-to-context`

Folds `result["read-file"].content` → `context.files[path]` and `result["write-file"].content` → `context.files[path]`. Merges into existing `context.files`, does not replace.

```json
{ "op": "merge-files-to-context" }
```

Custom keys via `from`:

```json
{ "op": "merge-files-to-context", "from": ["read-file"] }
```

### `summarize-files`

Truncates each file in `context.files` to first `maxLines` lines. Appends `// ... (N more lines)` comment when truncated. Use after `pick-context` includes `files`.

```json
{ "op": "summarize-files", "maxLines": 60 }
```

`only` prefix filter — only summarize files under matching paths:

```json
{ "op": "summarize-files", "maxLines": 40, "only": ["src/", "tests/"] }
```

---

## Batch / iteration operations

### `for-each`

Runs sub-pipeline steps for each element of an array. Injects current element as `$item` (or the value of `as`) into `$out`.

```json
{
  "op": "for-each",
  "arrayPath": "$.context.workbench.batch.items",
  "as": "$item",
  "steps": [
    { "op": "append-to-array", "to": "$.processed", "value": { "item": "${$item}" } }
  ]
}
```

---

## Context optimization matrix by step

The base transforms (`prompts/transforms/coder-request.json`, `auto-ai-request.json`) use `switch` on `execution.step` to apply the right profile automatically. Per-step `server-transforms-request.json` in simulations only need to override when the base profile is wrong.

| step | history | files | workbench | scratchpad |
|------|---------|-------|-----------|------------|
| `plan` / `clarify` / `research-plan` | :3 | ❌ dropped | ❌ | ❌ |
| `locate_code` / `inspect_structure` / `locate_tests` | :4 | ❌ dropped | ❌ | ✅ |
| `read_code` / `read_tests` | :5 | 120 lines | ❌ | ✅ |
| `edit_code` / `edit_tests` / `execute-item` | :6 | 60 lines | ❌ | ✅ |
| `checklist` / `write-doc` / `rag-research-plan` | :4 | ❌ dropped | ✅ 12k | ❌ |
| `write_report` / `final_review` | :8 | ❌ dropped | ✅ 12k | ✅ |
| `run_lint` / `run_tests` | :4–5 | ❌ dropped | ❌ | ✅ |
| `completed` | :3 | ❌ | ❌ | ❌ |
| *(default / unknown)* | :6 | ❌ dropped | ✅ 12k | ✅ |

---

## Canonical per-step pipeline pattern

```json
{
  "type": "pipeline",
  "steps": [
    { "op": "copy", "from": "$", "to": "$out" },
    { "op": "pick-context", "include": ["execution", "task", "history", "scratchpad", "files"] },
    { "op": "summarize-files", "maxLines": 80 },
    { "op": "render-markdown", "templateRef": "a2a-server/prompts/YOUR-PROMPT.md", "data": "$out", "outputFile": "request.md" }
  ]
}
```

Steps that don't need files:

```json
{ "op": "pick-context", "include": ["execution", "task", "history:4", "scratchpad"] }
```

Steps that need files from RAG result:

```json
{ "op": "pick-context", "include": ["execution", "task", "history:4", "scratchpad", "files"] },
{ "op": "pick-files", "paths": "$result" },
{ "op": "summarize-files", "maxLines": 120 }
```

Steps that need to persist a read file into context:

```json
{ "op": "merge-files-to-context" },
{ "op": "pick-context", "include": ["execution", "task", "history", "scratchpad", "files"] },
{ "op": "summarize-files", "maxLines": 80 }
```

---

## Response transform operations

Response transforms use a different subset of operations:

```json
{
  "type": "pipeline",
  "steps": [
    { "op": "parse-json-from-md", "fromFile": "response.md", "jsonPath": "$", "to": "$llm" },
    { "op": "copy", "from": "$.context", "to": "$.context" },
    { "op": "set", "path": "$.context.execution.step", "valueFrom": "$.llm.step" },
    { "op": "apply-scratchpad-ops", "from": "$.llm.scratchpad_ops" },
    { "op": "append-to-array", "to": "$.context.history", "value": { "role": "assistant", "step": "${$.llm.step}", "message": "${$.llm.message}" } },
    { "op": "set", "path": "$.execute", "valueFrom": "$.llm.execute" },
    { "op": "merge-workbench-sections", "from": "$.llm.workbench.sections", "to": "$.context.workbench.sections" },
    { "op": "apply-workbench-section-ops", "from": "$.llm.workbench_ops", "sectionsPath": "context.workbench.sections" },
    { "op": "set", "path": "$.result.completed", "valueFrom": "$.llm.completed" }
  ]
}
```

`apply-scratchpad-ops` should be added to all AI-action response transforms that use `scratchpad`.

`merge-workbench-sections` + `apply-workbench-section-ops` should be added when the prompt exposes `${workbench}` / `context.workbench` (auto-ai, coder, analyze base transforms).
