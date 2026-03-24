# План: Вернуть промпты в соответствие с симуляциями и поправить схемы трансформации

## Проблема

Промпты и трансформации в `a2a-server/prompts/` не соответствуют симуляциям в `simulations/`.

### Пример: dialog

**Симуляция** (`simulations/dialog/3/request.md`):
```json
{
  "message": "your reply to the user"
}
```

**Сервер** (`a2a-server/prompts/dialog-request.md`):
```json
{
  "step": "response",
  "message": "...",
  "execute": { "message": "...", "form": {...} },
  "completed": false
}
```

### Пример: transforms

**Симуляция** (`simulations/dialog/3/server-transforms-response.json`):
- parse-json-from-md
- append-to-array для history

**Сервер** (`a2a-server/prompts/transforms/dialog-response.json`):
- Простой copy/set
- Нет history
- Нет parse-json-from-md

## Задачи

### Фаза 1: Анализ соответствия

Для каждого типа action сравнить:

| Action | Prompts файл | Симуляция | Статус |
|--------|--------------|-----------|--------|
| dialog | dialog-request.md | dialog/ | ❌ Не соответствует |
| coder | coder-request.md | coder/ | ❌ Не соответствует |
| auto-ai | auto-ai-request.md | auto-ai/ | ❌ Не соответствует |
| analyze | analyze-request.md | analyze/ | ❌ Не соответствует |

### Фаза 2: Обновление промптов

Привести промпты к формату симуляций:

1. **Упростить Response Format** - как в симуляциях
2. **Сохранить только необходимые поля**
3. **Ушние параметры**

### Фбрать лиаза 3: Обновление трансформаций

Добавить операции как в симуляциях:

1. **parse-json-from-md** - парсинг JSON из markdown
2. **append-to-array** - добавление в историю
3. **context copy** - копирование контекста

## Действия

### 1. Сравнить все промпты с симуляциями

```
a2a-server/prompts/
├── dialog-request.md        ↔ simulations/dialog/
├── coder-request.md         ↔ simulations/coder/
├── auto-ai-request.md      ↔ simulations/auto-ai/
├── analyze-request.md       ↔ simulations/analyze/
```

### 2. Обновить каждый промпт

- Использовать формат симуляции
- Сохранить основную логику
- Убрать несоответствия

### 3. Обновить трансформации

```
a2a-server/prompts/transforms/
├── dialog-response.json     ↔ simulations/dialog/*/server-transforms-response.json
├── coder-response.json      ↔ simulations/coder/*/server-transforms-response.json
└── ...
```

## Формат симуляций (эталон)

### request.md (эталон)
```markdown
## System Prompt
...

## Response Format
```json
{
  "message": "your reply"
}
```

## Current State
```json
{
  "context": {...},
  "result": {...},
  "docVirtual": null,
  "ragResults": null
}
```
```

### server-transforms-response.json (эталон)
```json
{
  "type": "pipeline",
  "steps": [
    {
      "op": "parse-json-from-md",
      "fromFile": "response.md",
      "jsonPath": "$",
      "to": "$llm"
    },
    {
      "op": "copy",
      "from": "$.context",
      "to": "$.context"
    },
    {
      "op": "append-to-array",
      "to": "$.context.history",
      "value": {...}
    },
    ...
  ]
}
```

## Приоритеты

1. **dialog** - основной тестовый сценарий
2. **coder** - второй по важности
3. **auto-ai** - AI генерация
4. **analyze** - анализ

## Зависимости

- [`simulations/dialog/`](../../../simulations/dialog/) - эталон для dialog
- [`simulations/coder/`](../../../simulations/coder/) - эталон для coder
- [`simulations/auto-ai/`](../../../simulations/auto-ai/) - эталон для auto-ai
- [`simulations/analyze/`](../../../simulations/analyze/) - эталон для analyze
