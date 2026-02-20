# A2A — Agent Instructions

---

## Knowledge Graph

### Структура

Граф знаний — граф сущностей и связей по проекту. Хранится in-memory по `projectId`.

**Сущности (entities):** распознаются из кода (entity-recognizer)
- Типы: `model`, `controller`, `service`, `repository`, `middleware`, `request`, `policy`, `vue-component`, `vue-page`, `factory`, `seeder`, …
- Метаданные: `namespace`, `extends`, `implements`, `methods`, `relationships`, `imports`, …

**Связи (relations):**
| Тип | Описание |
|-----|----------|
| `uses` | A использует B (import) |
| `extends` | A наследует B |
| `implements` | A реализует B |
| `has-many`, `belongs-to`, `belongs-to-many`, `has-one` | Eloquent |
| `handles` | Controller обрабатывает |
| `validates` | Request валидирует Model |
| `renders` | Vue рендерит компонент |

**Неполный граф:** нет графа для `projectId` ИЛИ пустые `entities` и `relations` → сервер генерирует вопрос.

---

### Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Client: POST /requests { context: { projectId }, message, codeBlocks }│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Server: сохраняет в очередь (pending)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Request Processor (timer 5s): getNextPending() → processing           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────────────┐
│ Граф неполный                │    │ Граф есть (entities + relations)      │
│ → question                   │    │ → нейроны, контекст, external AI     │
│ → result: graph_incomplete    │    │ → result: completed                  │
│ → остановка таймера          │    │ → следующий tick                      │
└──────────────────────────────┘    └──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. Client: poll /status → /result                                       │
│    При graph_incomplete: ответить на question (codeBlocks, context)     │
│    → итерация 2                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Этажи (из абстракции):**
- Этаж 1: кодовая база, индексы, граф
- Этаж 2: сервер — поднимает данные, нейроны, если нет связей → вопрос
- Этаж 3: external AI — когда задача готова, обрабатывает и возвращает

---

## API Client: Manual Task Input for Knowledge Graph Training

Use the Requests API to feed tasks manually and train the knowledge graph. At least 2 iterations recommended.

**Base URL:** `http://localhost:3000/api/v1`  
**Auth:** `Authorization: Bearer <A2A_SERVER_PASSWORD>` (or `SKIP_AUTH=1` in dev)

---

### Iteration 1: First Request

```bash
# 1. Create request
curl -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a2a_dev_password" \
  -d '{
    "context": {
      "projectId": "proj_my_project",
      "projectName": "My Laravel App",
      "projectType": "laravel"
    },
    "message": "Add email validation to User registration"
  }'

# Response: { "success": true, "data": { "promiseId": "prm_xxx", "requestId": "req_xxx" } }
```

```bash
# 2. Poll status (every 5 sec)
curl http://localhost:3000/api/v1/requests/PRM_ID/status \
  -H "Authorization: Bearer a2a_dev_password"

# 3. Get result when status=completed or failed
curl http://localhost:3000/api/v1/requests/PRM_ID/result \
  -H "Authorization: Bearer a2a_dev_password"
```

**If `result.outcome === "graph_incomplete"`:** Server generated a question. Check `result.question`. Answer it in the next request (provide more context, e.g. codeBlocks).

---

### Iteration 2: Answer Question / Add Context

```bash
# Send follow-up with code blocks to enrich graph
curl -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a2a_dev_password" \
  -d '{
    "context": {
      "projectId": "proj_my_project",
      "projectName": "My Laravel App"
    },
    "message": "UserService.php handles registration",
    "codeBlocks": [
      {
        "path": "app/Services/UserService.php",
        "content": "<?php\n\nclass UserService { public function register(array $data) { ... } }"
      }
    ]
  }'
```

Repeat poll → result. If still `graph_incomplete`, add more files in `codeBlocks` or adjust `context`.

---

### Request Body Schema

| Field | Required | Description |
|-------|----------|-------------|
| `context` | yes | JSON object. Must include `projectId` for graph. |
| `message` | no | Task description |
| `codeBlocks` | no | `[{ path, content }]` — files for graph indexing |
| `sessionId` | no | Optional session link |
| `priority` | no | 0 = default, higher = sooner |

### Result Outcomes

| `result.outcome` | Meaning |
|------------------|---------|
| `completed` | Processed successfully |
| `graph_incomplete` | Graph missing/empty. `result.question` has the question. Add context and retry. |
| (failed) | `error` object with code/message |

---

### Minimal Training Script (2 iterations)

```bash
# Iteration 1
P1=$(curl -s -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a2a_dev_password" \
  -d '{"context":{"projectId":"proj_1"},"message":"Task 1"}' | jq -r '.data.promiseId')

# Wait + poll
sleep 6
curl -s "http://localhost:3000/api/v1/requests/$P1/result" -H "Authorization: Bearer a2a_dev_password" | jq

# Iteration 2 (with codeBlocks if graph_incomplete)
P2=$(curl -s -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a2a_dev_password" \
  -d '{"context":{"projectId":"proj_1"},"message":"Task 2","codeBlocks":[{"path":"app/User.php","content":"<?php\nclass User {}"}]}' | jq -r '.data.promiseId')

sleep 6
curl -s "http://localhost:3000/api/v1/requests/$P2/result" -H "Authorization: Bearer a2a_dev_password" | jq
```

---

### Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/requests | Create request → promiseId |
| GET | /api/v1/requests/:promiseId/status | Poll status |
| GET | /api/v1/requests/:promiseId/result | Get result (when ready) |
| DELETE | /api/v1/requests/:promiseId | Cancel pending |
| GET | /api/v1/requests/queue/stats | Queue length |
