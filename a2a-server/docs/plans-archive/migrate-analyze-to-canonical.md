# Plan: Migrate analyze simulation to canonical AI-action pattern

## Current State
- `a2a-server/prompts/analyze-request.md` — использует старый формат `{ action, message, params }`
- transforms в симуляциях — используют switch по `action`

## Target State
- Промпт возвращает `{ step, message, execute, completed }`
- Transforms используют канонический паттерн

## Steps

### 1. Update prompt: analyze-request.md
Изменить формат ответа на:
```json
{
  "step": "search",
  "message": "...",
  "execute": { "rag-search": { "query": "..." }},
  "completed": false
}
```
Steps: `search`, `read`, `continue`, `save`, `completed`

### 2. Update transforms
- `simulations/analyze/3/server-transforms-request.json`
- `simulations/analyze/3/server-transforms-response.json`
- `simulations/analyze/4/` — аналогично
- `simulations/analyze/6/` — аналогично
- `simulations/analyze/7/` — аналогично

### 3. Apply canonical pattern
- Request: copy → append-to-history → render-markdown
- Response: parse-json → set step → append-to-history → set execute → set completed
