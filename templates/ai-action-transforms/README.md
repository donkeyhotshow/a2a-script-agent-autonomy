# AI-Action Transform Template

## Как применить канонический паттерн

### 1. Prompt (LLM должен вернуть)

```json
{
  "step": "step_name",
  "message": "user-visible message",
  "execute": { "<action>": { ...params } },
  "completed": false
}
```

### 2. Request Transform

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

### 3. Response Transform

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

## Файлы

| Файл | Назначение |
|------|------------|
| `server-transforms-request.json` | Шаблон для request |
| `server-transforms-response.json` | Шаблон для response |

## Что менять

В обоих шаблонах заменить:
- `YOUR-PROMPT.md` — имя вашего промпта (без пути)
