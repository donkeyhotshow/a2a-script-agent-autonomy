# AI Actions Integration Guide

AI actions are applied only on panels within sessions.

---

# A2A Protocol

## Action-Key Shape (Mandatory)

All `result` and `execute` objects must use action-key shape:

```json
// Correct:
{ "result": { "script": { "output": "..." } } }
{ "execute": { "read-file": { "path": "..." } } }

// Incorrect:
{ "result": { "content": "..." } }
{ "execute": { "action": "read-file", "file": "..." } }
```

## Two Action Types

| Type | Steps | LLM | Examples |
|------|-------|-----|----------|
| **Actions** | Hardcoded | No | fix-vue-imports, phpunit-deprecations |
| **AI-Actions** | Dynamic | Yes | dialog, coder, auto-ai |

## Flow

```
request.json → server-transforms → request.md → [LLM] → response.md → server-transforms → response.json
```

## Canonical Format

```json
{
  "step": "step_name",
  "message": "user-visible explanation",
  "execute": { "<action_type>": { ...params } },
  "completed": false
}
```

## Endpoints

- `POST /api/sessions` - Create session
- `POST /api/v1/invoke` - Execute action
- `GET /promise/<id>` - Check async status

See full protocol: `docs/new-request-flow/PROTOCOL.md`
