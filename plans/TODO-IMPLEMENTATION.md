# Что не хватает для реализации

## 1. JSON Схемы (требуют code mode)

### Необходимо создать:
- `schemas/ui-command.schema.json` - схема UI команд
- `schemas/execute.schema.json` - обновленная схема execute с ui
- `schemas/response.schema.json` - обновленная схема ответа

### Существующие файлы для обновления:
- `docs/new-request-flow/json-schemas/server-invoke-response-execute.schema.json`
- `docs/new-request-flow/json-schemas/server-invoke-response-pending.schema.json`

---

## 2. Реализация на Server

### a2a-server изменения:
- Добавить генерацию `execute.ui` при async запросах
- Интегрировать с Promise системой
- Обновить transforms для добавления UI команд

### Файлы для изменения:
- `a2a-server/src/services/request-processor.ts`
- `a2a-server/src/prompts/transforms/`

---

## 3. Реализация на Client API

### Необходимо:
- Прокидывать `execute.ui` в Web без изменений
- Добавить mapping для разных UI состояний

### Файлы для изменения:
- `a2a-client/packages/sdk/src/server/index.ts`
- `a2a-client/packages/sdk/src/server/routes/sessions.ts`

---

## 4. Реализация на Web UI

### Необходимо:
- Слушать `execute.ui` от Client API
- Убрать собственные loading/spinner логики
- Добавить обработку `ui.state`

### Файлы для изменения:
- `a2a-client/web/js/session-store.js`
- `a2a-client/web/js/adapters/session-manager-adapter.js`
- `a2a-client/web/js/components/`

---

## 5. Тестирование

### Необходимо:
- Обновить симуляции с `execute.ui`
- Добавить e2e тесты для UI команд
- Протестировать Promise flow

### Файлы:
- `simulations/dialog/` - добавить ui в response
- `simulations/coder/` - добавить ui в response

---

## 6. Примеры (симуляции)

### Dialog с UI командами:

**Шаг 1 (response.json):**
```json
{
  "context": { "task": "диалог" },
  "execute": {
    "ui": { "state": "idle" },
    "form": { "choices": [...] }
  }
}
```

**Шаг 3 (response.json с waiting):**
```json
{
  "context": { "task": "диалог", "execution": { "action": "dialog", "step": "llm-request" } },
  "execute": {
    "ui": { "state": "waiting", "message": "AI обрабатывает...", "spinner": true },
    "form": { "input": [...] }
  }
}
```

---

## Приоритеты реализации

| Приоритет | Задача | Сложность |
|-----------|--------|-----------|
| 1 | Server: добавить execute.ui | Средняя |
| 2 | Client API: прокидывать ui | Низкая |
| 3 | Web: слушать execute.ui | Средняя |
| 4 | JSON схемы | Низкая |
| 5 | Тестирование | Высокая |

---

## Готовность

| Компонент | Готовность |
|-----------|-----------|
| Документация | ✅ Готово |
| Планы | ✅ Готово |
| JSON Схемы | ❌ Нужно создать |
| Server реализация | ❌ Нужно реализовать |
| Client API реализация | ❌ Нужно реализовать |
| Web UI реализация | ❌ Нужно реализовать |
| Тестирование | ❌ Нужно создать |
