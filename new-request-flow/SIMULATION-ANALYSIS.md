# Анализ симуляции fix-vue-imports

## Расположение
`simulations/fix-vue-imports/`

> **Уточнение:** Эта симуляция показывает **Client → Server** взаимодействие, а не Web → Client!
> 
> У Client API может быть много эндпоинтов для разных задач.

## Что не так с симуляцией

### 1. НЕТ sessionId и projectId (КРИТИЧНО)

**Шаг 1 - request.json (Текущее - НЕПРАВИЛЬНО):**
```json
{
  "action": "task_request",
  "task": "виправити імпорти у vue компонентах"
}
```

**Проблемы:**
- ❌ НЕТ `sessionId` - сервер не знает какую сессию обновлять
- ❌ НЕТ `projectId` - непонятно для какого проекта
- ❌ НЕТ `context` - сервер stateless, но не получает контекст

**Как должно быть (ПРАВИЛЬНО):**
```json
{
  "context": {
    "sessionId": "sess_abc123",
    "projectId": "proj_vue_project",
    "action": "task_request",
    "task": "виправити імпорти у vue компонентах",
    "timestamp": "..."
  }
}
```

---

### 2. Контекст не передается явно (ИЗБЫТОЧНО)

**Шаг 2 - request.json (Текущее - НЕПРАВИЛЬНО):**
```json
{
  "selectedAction": { "actionId": "fix-vue-imports" },
  "context": { 
    "task": "виправити імпорти...",
    "action": "approve_action"  // action ВНУТРИ context!
  }
}
```

**Проблема:**
- ❌ `action`, `selectedAction` вне context - должны быть ВНУТРИ

**Как должно быть (ПРАВИЛЬНО):**
```json
{
  "context": {
    "sessionId": "sess_xxx",
    "projectId": "proj_xxx",
    "action": "approve_action",
    "selectedAction": { "actionId": "fix-vue-imports" }
  }
}
```

---

### 3. Избыточность в шагах (ИЗБЫТОЧНО)

**Шаг 2 - request.json:**
```json
{
  "action": "approve_action",
  "selectedAction": { "actionId": "fix-vue-imports" },
  "context": { "task": "виправити імпорти..." }
}
```

**Проблема:**
- ❌ `context` передается каждый раз - но сервер stateless!
- ❌ Контекст должен храниться на Client API, а не передаваться туда-обратно

---

**Шаг 3 - request.json (Текущее - НЕПРАВИЛЬНО):**
```json
{
  "action": "step_result",
  "stepId": "vue-import-detect",
  "result": { "broken_imports": [...] },
  "context": {
    "task": "виправити імпорти..."
  }
}
```

**Проблема:**
- ❌ `action`, `stepId`, `result` находятся вне context - должны быть ВНУТРИ

**Как должно быть (ПРАВИЛЬНО):**
```json
{
  "context": {
    "sessionId": "sess_xxx",
    "projectId": "proj_xxx",
    "action": "step_result",
    "stepId": "vue-import-detect",
    "result": { "broken_imports": [...] }
  }
}
```

---

### 4. Нет promiseId для асинхронных операций

Сервер возвращает результат синхронно в `server-response.json`. 

**В реальности:**
- Сервер должен возвращать `promiseId`
- Client API должен опрашивать `/api/v1/requests/:promiseId/status`
- Результат приходит через `/api/v1/requests/:promiseId/result`

---

### 5. response vs server-response - дублирование

В папке каждого шага есть:
- `response.json` - (предположительно) ответ для web
- `server-response.json` - ответ от сервера

**Проблема:** Они одинаковые! Должно быть:
- Client API получает от сервера
- Client API трансформирует для web
- Web получает упрощенный ответ

---

## Правильный поток (Client → Server)

### Шаг 1: task_request (Client → Server)

```
Client отправляет:
{
  "action": "task_request",
  "task": "виправити імпорти...",
  "context": {
    "sessionId": "sess_xxx",
    "projectId": "proj_xxx",
    "timestamp": "..."
  }
}

Server возвращает:
{
  "promiseId": "req_xxx",
  "status": "pending"
}
```

Client затем опрашивает /requests/:promiseId/status пока не получит result.

### Шаг 2: approve_action

```
Client отправляет:
{
  "action": "approve_action",
  "selectedAction": { "actionId": "fix-vue-imports" },
  "context": { "sessionId": "sess_xxx", "projectId": "proj_xxx" }
}
```

### Шаг 3: step_result

```
Client отправляет:
{
  "action": "step_result",
  "stepId": "vue-import-detect",
  "result": { "broken_imports": [...] },
  "context": { "sessionId": "sess_xxx", "projectId": "proj_xxx" }
}
```

---

## Что исправить в симуляции (Client → Server)

1. **Добавить context с sessionId и projectId** во все request.json
2. **Добавить promiseId** в server-response.json - показать асинхронность
3. **Разделить response.json и server-response.json** - это разные вещи

---

## Файлы для исправления

| Файл | Что не так | Исправление |
|------|------------|-------------|
| `1/request.json` | Нет sessionId, projectId | Добавить поля |
| `2/request.json` | Нет sessionId, лишний context | Исправить |
| `3/request.json` | Нет sessionId, избыточный context | Исправить |
| `4/request.json` | Нет sessionId | Исправить |
| `5/request.json` | Нет sessionId | Исправить |
