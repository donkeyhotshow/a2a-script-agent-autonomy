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

```json
{
  "type": "pipeline",
  "steps": [
    { "op": "copy", "from": "$", "to": "$out" },
    { "op": "append-to-array", "to": "$.context.history", "value": { "role": "user", "message": "$.result.message" }},
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
2. **Request transform**: copies request, appends user message to history, renders markdown prompt
3. **LLM processes** the prompt and returns JSON
4. **Response transform**: parses JSON, updates `context.execution.step`, appends assistant message to history
5. **Client receives response** with `execute` action

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
| `analyze` | `a2a-server/prompts/analyze-request.md` | ⚠️ Needs update |

## Templates

Location: `templates/ai-action-transforms/`

- `server-transforms-request.json` — copy, append-to-history, render-markdown
- `server-transforms-response.json` — parse-json, set-step, append-history, set-execute, set-completed
- `README.md` — quick reference

## Adding New AI-Action

1. Create prompt in `a2a-server/prompts/<name>-request.md`
2. Define step names in the prompt
3. Copy transforms from templates
4. Update `templateRef` to point to your prompt
