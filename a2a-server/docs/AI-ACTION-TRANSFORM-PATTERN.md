# AI-Action Transform Pattern

## Overview

This document describes the canonical pattern for AI-actions (LLM-driven flows) in the A2A protocol.

## What is AI-Action?

AI-Action is a flow where the LLM dynamically decides the next step, rather than using hardcoded server actions. Examples:
- `auto-ai` — LLM controls code refactoring workflow
- `coder-smart` — LLM creates and executes tasks
- `analyze` — LLM analyzes architecture

## Canonical Response Format

All AI-action prompts MUST require the LLM to respond with:

```json
{
  "step": "step_name",
  "message": "user-visible explanation",
  "execute": {
    "<one_action>": { ...params }
  },
  "completed": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `step` | string | Semantic phase name (e.g., `plan`, `clarify`, `search`, `completed`) |
| `message` | string | User-visible explanation |
| `execute` | object | Action-key shape with **exactly one** key |
| `completed` | boolean | `true` only when task is fully done |

## Request Transform

**Before** the pipeline runs, the server prepares the invoke payload (see **[LLM-REQUEST-PREP.md](./LLM-REQUEST-PREP.md)**):

- `result` is merged into `context.history` (user + system lines), then cleared.
- `flowControlHint` is set from `context.execution.action` + `step` for `${flowControlHint}` in templates.

Canonical pipeline (no `append-to-array` for `result.message`):

```json
{
  "type": "pipeline",
  "steps": [
    { "op": "copy", "from": "$", "to": "$out" },
    { "op": "render-markdown", "templateRef": "a2a-server/prompts/YOUR-PROMPT.md", "data": "$out", "outputFile": "request.md" }
  ]
}
```

## Response Transform

```json
{
  "type": "pipeline",
  "steps": [
    { "op": "parse-json-from-md", "fromFile": "response.md", "jsonPath": "$", "to": "$llm" },
    { "op": "copy", "from": "$.context", "to": "$.context" },
    { "op": "set", "path": "$.context.execution.step", "value": "$.llm.step" },
    { "op": "append-to-array", "to": "$.context.history", "value": { "role": "assistant", "step": "$.llm.step", "message": "$.llm.message" }},
    { "op": "set", "path": "$.execute", "value": "$.llm.execute" },
    { "op": "set", "path": "$.result.completed", "value": "$.llm.completed" }
  ]
}
```

## How It Works

1. **Client sends request** → server applies request transform
2. **Request prep** ([LLM-REQUEST-PREP.md](./LLM-REQUEST-PREP.md)): materialize `result` → `history`, attach `flowControlHint`
3. **Request transform**: copy → render markdown prompt (`request.md` / `system.md`)
4. **LLM processes** the prompt and returns JSON
5. **Response transform**: parses JSON, updates `context.execution.step`, appends assistant message to history
6. **Client receives response** with `execute` action

## Context Fields

| Field | Managed By | Description |
|-------|------------|-------------|
| `context.execution.step` | Server (from LLM) | Current semantic step |
| `context.history` | Server (transforms) | Array of `{role, step?, message}` |
| `context.docVirtual` | Action-specific | Domain-specific state |
| `context.ragResults` | Action-specific | RAG search results |

## Examples

| Simulation | Prompt | Status |
|------------|--------|--------|
| `auto-ai` | `a2a-server/prompts/auto-ai-request.md` | ✅ Canonical |
| `coder-smart` | `a2a-server/prompts/coder-request.md` | ✅ Updated |
| `analyze` | `a2a-server/prompts/analyze-request.md` | ✅ Canonical |

## Transform JSON (canonical on server)

Location: **`a2a-server/prompts/transforms/`** (per-action `*-request.json` / `*-response.json`). The repo-root `templates/` tree was removed.

- Request pipeline — typically `copy`, `append-to-array` (history), `render-markdown` (hints: [LLM-REQUEST-PREP.md](./LLM-REQUEST-PREP.md))
- Response pipeline — `parse-json-from-md`, set step, append history, set `execute` / `completed`
- Golden examples: **`simulations/<task>/<step>/server-transforms-*.json`**

## Adding New AI-Action

1. Create prompt in `a2a-server/prompts/<name>-request.md`
2. Define step names in the prompt
3. Add transforms under `a2a-server/prompts/transforms/` (copy patterns from an existing action or from `simulations/`)
4. Point `templateRef` / pipeline `templateRef` at your prompt
