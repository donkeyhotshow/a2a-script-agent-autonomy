# Вариант 3: Уточнение Promise System и Gray Room

> **Статус**: Предложение (альтернативное)
> **Дата**: 2026-03-28
> **Автор**: Architect

> **Важно:** После проверки кода обнаружено, что `server-promise.json` **активно используется** в `a2a-client`:
> - [`vite-plugin-a2a/storage/promise-status.js`](a2a-client/vite-plugin-a2a/storage/promise-status.js) — определения состояний
> - [`vite-plugin-a2a/storage/newSessions.js:266`](a2a-client/vite-plugin-a2a/storage/newSessions.js:266) — сохранение/загрузка/удаление
> - Тесты проверяют поведение `server-promise.json`

## Текущее состояние Promise System

```
Client           Server           AI Hub (Ollama)
  │                │                    │
  │── invoke ─────>│                    │
  │                │── promiseId ──────>│
  │                │<── llmPromiseId ────│
  │<─ promiseId ───│                    │
  │                │   polling...      │
  │                │<── status check ──│
  │                │── response ───────>│
  │<─ result ─────│                    │
```

### Где используется server-promise.json

1. **Клиент (a2a-client)**:
   - `newSessions.js`: Сохраняет `server-promise.json` при асинхронном ответе
   - `promise-status.js`: Определяет валидные состояния
   - `step-routes-async-flow.js`: Polling daemon

2. **Сервер (a2a-server)**:
   - `request.service.ts`: Создает/хранит promiseId
   - `gray-room-orchestrator.ts`: Вложенные promise вызовы

## Что можно улучшить (без радикальной замены)

### 1. Упрощение Gray Room

Текущая концепция Gray Room (серой комнаты) непонятна. Предложение:

- **Доresponse** — сервер обрабатывает request и шлет в AI Hub
- **После Response** — сервер может продолжить обработку (это и есть "серая комната")
  - Сжатие контекста
  - Дополнительные LLM вызовы для "размышления"

### 2. Sub-steps (подэтапы)

Вместо "серой комнаты" использовать явные подэтапы:

```
 Этап 1          Этап 2           Этап 3
  │               │                │
 execute ─────> LLM call ──────> result
     │              │               │
     v              v               v
  main step    sub-step-1     sub-step-2
```

### 3. Разделение симуляций

Симуляции с Promise/async vs sync:

```
simulations/
├── sync/           # Все synchronous
│   ├── dialog-simple.json
│   └── form-submit.json
├── async/         # Только Promise
│   ├── llm-processing.json
│   └── gray-room/
└── legacy/       # Старые, не использовать
```

## Плюсы этого варианта

1. **Обратная совместимость** — ничего не ломаем
2. **Постепенность** — можно улучшать частями
3. **Понятность** — меньше магии

## Минусы

1. Техдолг остается
2. Сложная логика сохраняется
3. Не полное решение проблемы

## Реализация

### Этап 1: Разделение симуляций

```
a2a-server/simulations/
├── sync/           # Все synchronous
│   ├── dialog-simple/
│   └── form-submit/
├── async/         # Только Promise
│   └── llm-processing/
└── legacy/       # Старые, не использовать
    └── old-gray-room/
```

### Этап 2: Документация Gray Room

**Файл:** [`GLOSSARY.md`](../GLOSSARY.md)


```markdown
### Gray Room (устарел)
→ Использовать: Post-processing loop

Это этап после получения ответа от LLM, где сервер может:
- Сжимать контекст
- Добавлять метаданные
- Выполнять дополнительные проверки
```

### Этап 3: Sub-steps

**Новые поля:**
```json
{
  "execute": {
    "script": {...},
    "substeps": [
      {"action": "compress"},
      {"action": "validate"}
    ]
  }
}
```

### Roadmap

| Этап | Задача | Файлы | Статус |
|------|--------|-------|--------|
| 1 | Разделить симуляции | simulations/ | TODO |
| 2 | Обновить GLOSSARY | GLOSSARY.md | TODO |
| 3 | Sub-steps docs | SCHEMA.md | TODO |