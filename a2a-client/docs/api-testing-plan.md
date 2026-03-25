# API Testing Plan — Full System Chain Verification

> **Purpose:** Guide for AI or automated testing to verify the entire data flow: Web Client API → Client API → a2a-server.
>
> **For AI:** Execute sections in order. Use curl commands as-is; replace `{SESSION_ID}` with actual id. Assert expected JSON shapes. Run section 7 one-shot script for quick validation.
>
> **Reference:** Golden layout matches `simulations/*/<N>/` — `client.json` (Web→Client API), `request.json` (Client API→Server), `received.json` (expected Web DTO). Router-only fixture: `simulations/agent/1/`; full agent coding chain: `simulations/agent-coder/`. See [api-client-server-logic.md](api-client-server-logic.md).

---

## 0. Client API Server — Responsibilities (Storage Files)

> **Утверждено:** 2026-03-12. Client API server управляет step-файлами в `a2a-client/storage/sessions/{SESSION_ID}/`, сохраняет `context`, `execute`, `messages` и обрабатывает async `promiseId`.

### 0.1 После client-result → request-to-server

1. `client-result.json` сохраняется в текущем шаге (`{N}/`) сразу после выборки/ввода пользователя (с `result: { "message": "..." }` или `result: { "choice": "..." }`).
2. Формируется `request-to-server.json` для следующего шага `{N+1}/`: `context.execution` получает `action` (task/action/continue) и `result` (в action-key формате), добавляется `session_id`.
3. Перед отправкой на A2A Server сохраняется `request-to-server.json` в `{N+1}/`.
4. Делается `POST $A2A_SERVER/api/v1/invoke` с подготовленным payload.

```
{N}/
├── client-result.json       ← пользователь (message/choice)
└── request-to-server.json   ← payload для шага N+1
```

### 0.2 Синхронный ответ от A2A Server

1. Когда ответ приходит без `promiseId`, `server-response.json` пишется в `{N+1}/` (тот же шаг, что и request-to-server).
2. `currentStep` обновляется на `N+1`, данные сохраняются в `server-response.json` и `messages.json`.
3. Web UI получает `execute` и, если нужно, ожидает `form.input`/`form.choices`.

### 0.3 Асинхронный ответ (promiseId)

1. Если A2A Server вернул `promiseId`, создаётся `server-promise.json` в `{N+1}/` (тот же шаг, что и запрос).
2. В `server-promise` хранятся `{ promiseId, status, submittedAt }`, `stepNum` остается `N+1`.
3. Web UI поллит `GET /api/sessions/:id/async` или `GET /api/sessions/:id/promise/:promiseId` до `completed`.
4. После завершения финальный `server-response.json` записывается в ту же папку `{N+1}/`.

### 0.4 Required files per step

| File | Когда | Папка |
|------|-------|-------|
| `client-result.json` | После ввода пользователя | `{SESSION_ID}/{N}/` |
| `request-to-server.json` | Перед запросом | `{SESSION_ID}/{N+1}/` |
| `server-response.json` | При sync-ответе | `{SESSION_ID}/{N+1}/` |
| `server-promise.json` | При async-ответе | `{SESSION_ID}/{N+1}/` |
| `messages.json` | История сообщений | `{SESSION_ID}/{N+1}/` |

**Windows/PowerShell:** Use single-quoted JSON for `-d` (e.g. `-d '{"title":"x"}'`). Avoid escaped quotes.

**С помощью Client API:** `X-Session-Id` (любой) или `SKIP_AUTH=1`. Async-ответ возвращает `promiseId`; опрашивайте `GET $A2A_SERVER/api/v1/requests/{promiseId}/result` (или через `/sessions/:id/promise/:promiseId`), пока статус `completed`.

---

## 1. Prerequisites

### 1.1 Services to Start (in order)

| Service       | Port | Start Command              | Health Check                    |
|---------------|------|----------------------------|---------------------------------|
| a2a-server    | 3000 | `npm run dev` (a2a-server) | `curl http://localhost:3000/health` |
| Client API    | 3001 | `npm run dev:api` (a2a-client) | `curl http://localhost:3001/health` |
| Web UI (Vite) | 5173 | `npm run dev` (a2a-client) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173` |

### 1.2 Base URLs

```
WEB_UI_BASE=http://localhost:5173
API_A2A_PREFIX=/api/a2a
CLIENT_API_BASE=http://localhost:3001
A2A_SERVER_BASE=http://localhost:3000
```

---

## 2. Web Client Sessions API (Vite Plugin)

All requests to Web UI. Header `X-Storage-Mode: storage` or `X-Storage-Mode: project`.

### 2.1 Create Session

```bash
curl -s -X POST "$WEB_UI_BASE/api/a2a/sessions" \
  -H "Content-Type: application/json" \
  -H "X-Storage-Mode: storage" \
  -d '{"title": "API Test Session"}'
```

**Expected:** `{"success": true, "session": {...}}`  
**Verify:** `session.id`, `session.execute.form.input`, `session.currentStep === 1`

### 2.2 List Sessions

```bash
curl -s "$WEB_UI_BASE/api/a2a/sessions" -H "X-Storage-Mode: storage"
```

**Expected:** `{"sessions": [...]}`

### 2.3 Get Session

```bash
curl -s "$WEB_UI_BASE/api/a2a/sessions/{SESSION_ID}" -H "X-Storage-Mode: storage"
```

**Expected:** `{"id":"...","title":"...","execute":{...}}` (session object, not wrapped)

### 2.4 Update Session

```bash
curl -s -X PUT "$WEB_UI_BASE/api/a2a/sessions/{SESSION_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Storage-Mode: storage" \
  -d '{"title": "Updated Title"}'
```

### 2.5 Delete Session

```bash
curl -s -X DELETE "$WEB_UI_BASE/api/a2a/sessions/{SESSION_ID}" -H "X-Storage-Mode: storage"
```

**Expected:** `{"success": true}`

---

## 3. Steps API (Storage Mode Only)

Requires `X-Storage-Mode: storage`. Project mode returns 404 for steps.

### 3.1 List Steps

```bash
curl -s "$WEB_UI_BASE/api/a2a/sessions/{SESSION_ID}/steps" -H "X-Storage-Mode: storage"
```

**Expected:** `{"steps": [1, 2, ...]}`

### 3.2 Get Step

```bash
curl -s "$WEB_UI_BASE/api/a2a/sessions/{SESSION_ID}/steps/1" -H "X-Storage-Mode: storage"
```

**Expected:** JSON with `step`, `execute`, `messages`, `stepText`

### 3.3 Create Step

```bash
curl -s -X POST "$WEB_UI_BASE/api/a2a/sessions/{SESSION_ID}/steps" \
  -H "Content-Type: application/json" \
  -H "X-Storage-Mode: storage" \
  -d '{
    "execute": {"form": {"input": {"value": "test task"}}},
    "messages": [{"role": "user", "content": "test task"}],
    "context": {}
  }'
```

**Expected:** `{"success": true, "step": 2}`

### 3.4 Get Latest Step

```bash
curl -s "$WEB_UI_BASE/api/a2a/sessions/{SESSION_ID}/latest" -H "X-Storage-Mode: storage"
```

**Expected:** `{"session": {...}, "latestStep": N, "stepData": {...}, "hasResponse": bool}`

### 3.5 Get History from Step

```bash
curl -s "$WEB_UI_BASE/api/a2a/sessions/{SESSION_ID}/history/1" -H "X-Storage-Mode: storage"
```

**Expected:** `{"history": [{"step": N, "data": {...}}, ...]}`

---

## 4. Storage Mode Toggle

### 4.1 Project Mode (`.a2a/sessions`)

```bash
curl -s -X POST "$WEB_UI_BASE/api/a2a/sessions" \
  -H "Content-Type: application/json" \
  -H "X-Storage-Mode: project" \
  -d '{"title": "Project Mode Test"}'
```

**Verify:** Session file at `{projectPath}/.a2a/sessions/{sessionId}.json`

### 4.2 Storage Mode (numbered folders)

```bash
curl -s -X POST "$WEB_UI_BASE/api/a2a/sessions" \
  -H "Content-Type: application/json" \
  -H "X-Storage-Mode: storage" \
  -d '{"title": "Storage Mode Test"}'
```

**Verify:** Directory `a2a-client/storage/sessions/{sessionId}/` with `1/server-response.json` and `1/messages.json`

---

## 4.5 Step Flow: server-response → client-result → request-to-server → new step

> **Подробнее:** см. [`api-client-server-logic.md`](api-client-server-logic.md#поток-обработки-шагов-step-flow)

После каждого server-response:

| File | Description | Source |
|------|-------------|--------|
| `server-response.json` | Ответ от сервера (execute, context, result) | Client API ← A2A Server |
| `messages.json` | История сообщений до текущего шага | sessionService |
| `client-result.json` | Данные от Web клиента | UI/form или авто-скрипт |
| `request-to-server.json` | Payload для следующего шага | Client API |
| `server-promise.json` | `promiseId`/`status` для async | Client API (если promiseId) |

**Flow:**
1. Step N уже содержит `server-response.json` и `messages.json`.
2. Client API сохраняет `client-result.json` из Web (`result.message` или `result.choice`).
3. Формирует `request-to-server.json` для шага `N+1` перемешивая context и result, адрес `execution.action`.
4. POST `/api/v1/invoke` отправляется, ответ сохраняется синхронно (`server-response.json` в `N+1`) или содержит `promiseId`.
5. При `promiseId` появляется `server-promise.json` в `N+1`; Web UI опрашивает `/async` и после `completed` использует `latest`/`step` для обновления ответа.

**Пример шага 1:**
```
1/
├── server-response.json   # execute.form.input (task prompt)
├── messages.json          # Chat messages (role, content)
├── client-result.json     # {"result":{"message":"my task"}}
└── request-to-server.json # payload для шага 2
```

**Async-пример:** когда первый request возвращает `promiseId`, в папке `2/` появится `server-promise.json`, пока `server-response.json` (с результатом) ждёт завершения promise.

---

## 5. Full Chain: Client API → a2a-server

Client API (3001) proxies to a2a-server (3000). Use Client API session endpoints.

### 5.1 Create Session with Task (one-shot to a2a-server)

```bash
  -d '{"title": "Full Chain Test", "task": "agent-task"}'
```

**Expected:** `{"success": true, "data": {...}, "serverResponse": {"data": {"promiseId": "..."}}}`  
Poll `GET $A2A_SERVER_BASE/api/v1/requests/{promiseId}/result` until `status: completed`. Result has `execute.form.choices`.

### 5.2 Submit Choice (if form.choices returned)

```bash
# Use sessionId from step 5.1 response (data.id)
curl -s -X POST "$CLIENT_API_BASE/api/sessions/{SESSION_ID}/action" \
  -H "Content-Type: application/json" \
  -d '{"choice": "dialog", "input": {}}'
```

**Expected:** `{"success": true, "execute": {...}, "promiseId": "..."}`

### 5.3 Continue Session (next step)

```bash
curl -s -X POST "$CLIENT_API_BASE/api/sessions/{SESSION_ID}/next" \
  -H "Content-Type: application/json" \
  -d '{"result": {"message": "continue"}}'
```

### 5.4 Combined: Web Sessions + Client API

1. Create session in Web storage: `POST $WEB_UI_BASE/api/a2a/sessions`
2. Create matching session in Client API with task: `POST $CLIENT_API_BASE/api/sessions` with same or new id
3. Or: use Client API session id for both (Client API generates UUID)

---

## 5.5 Protocol simulation flow (golden fixtures)

Client API maps each step’s `client.json` → `request.json` → a2a-server → `received.json`. **Router-only:** `simulations/agent/1`. **Dialog-style multi-step:** `simulations/dialog/N`. **Agent coding multi-step:** `simulations/agent-coder/N`.

**File mapping:** `simulations/<sim-name>/<N>/client.json` = Web payload; same folder’s `request.json` / `received.json` = server chain and expected Web DTO.

| Step | Example | client.json (Web→Client API) | received.json (expected) |
|------|---------|------------------------------|--------------------------|
| 1 | `dialog/1` | `result.message: "диалог"` | `execute.form.choices` (router) |
| 2 | `dialog/2` | `result.choice: "dialog"` | `execute.form.input` (text input) |
| 3 | `agent-coder/3` | `result.message` (user text) | per golden `received.json` |
| 4 | `agent-coder/6` | `result.message: "дякую!"` | per golden `received.json` |

### Step 1 — Task → Router

```bash
RESP=$(curl -s -X POST "$CLIENT_API_BASE/api/sessions" \
  -H "Content-Type: application/json" -H "X-Session-Id: test" \
  -d '{"title":"Agent Test","task":"agent-task"}')
SESSION_ID=$(echo "$RESP" | jq -r '.data.id')
PROMISE_ID=$(echo "$RESP" | jq -r '.serverResponse.data.promiseId')
# Poll until completed
until [ "$(curl -s "$A2A_SERVER_BASE/api/v1/requests/$PROMISE_ID/result" -H "x-skip-auth: true" | jq -r '.data.status')" = "completed" ]; do sleep 2; done
# Assert: execute.form.choices exists
curl -s "$A2A_SERVER_BASE/api/v1/requests/$PROMISE_ID/result" -H "x-skip-auth: true" | jq -e '.data.result.execute.form.choices | length > 0'
```

### Step 2 — Choice → Text Input

```bash
R2=$(curl -s -X POST "$CLIENT_API_BASE/api/sessions/$SESSION_ID/action" \
  -H "Content-Type: application/json" -H "X-Session-Id: test" \
  -d '{"choice":"dialog","input":{}}')
PROM2=$(echo "$R2" | jq -r '.promiseId')
# Poll until completed
until [ "$(curl -s "$A2A_SERVER_BASE/api/v1/requests/$PROM2/result" -H "x-skip-auth: true" | jq -r '.data.status')" = "completed" ]; do sleep 2; done
# Expected: execute.form.input
curl -s "$A2A_SERVER_BASE/api/v1/requests/$PROM2/result" -H "x-skip-auth: true" | jq '.data.result.execute.form.input'
```

### Step 3 — Message → LLM Response

```bash
# Matches simulations/agent-coder/3/client.json (user message step)
curl -s -X POST "$CLIENT_API_BASE/api/sessions/$SESSION_ID/next" \
  -H "Content-Type: application/json" \
  -d '{"result":{"message":"hello world"}}'
# Expected: execute.message + execute.form.input
```

### Step 4 — Final Message

```bash
# Matches simulations/agent-coder/6/client.json (follow-up message; shape example)
curl -s -X POST "$CLIENT_API_BASE/api/sessions/$SESSION_ID/next" \
  -H "Content-Type: application/json" \
  -d '{"result":{"message":"Дякую!"}}'
# Expected: execute.message or top-level result (e.g. completed)
```

### Full Agent Script (no mocks)

Each step returns `promiseId`; poll `GET $A2A_SERVER_BASE/api/v1/requests/{promiseId}/result` until `status: completed`.

```bash
H="Content-Type: application/json" H2="X-Session-Id: test"
R1=$(curl -s -X POST "$CLIENT_API_BASE/api/sessions" -H "$H" -H "$H2" -d '{"title":"Dialog","task":"диалог"}')
SESSION_ID=$(echo "$R1" | jq -r '.data.id')
P1=$(echo "$R1" | jq -r '.serverResponse.data.promiseId')
# ... poll P1, then:
R2=$(curl -s -X POST "$CLIENT_API_BASE/api/sessions/$SESSION_ID/action" -H "$H" -H "$H2" -d '{"choice":"dialog","input":{}}')
P2=$(echo "$R2" | jq -r '.promiseId')
# ... poll P2, then:
R3=$(curl -s -X POST "$CLIENT_API_BASE/api/sessions/$SESSION_ID/next" -H "$H" -H "$H2" -d '{"result":{"message":"hello world"}}')
# ... poll, then step 4
```

---

## 6. Storage Verification

### 6.1 Storage Mode Structure

```bash
# After creating session and submitting
ls -la a2a-client/storage/sessions/
ls -la a2a-client/storage/sessions/{SESSION_ID}/
ls -la a2a-client/storage/sessions/{SESSION_ID}/1/
cat a2a-client/storage/sessions/{SESSION_ID}/1/server-response.json
cat a2a-client/storage/sessions/{SESSION_ID}/1/messages.json
cat a2a-client/storage/sessions/{SESSION_ID}/1/messages.json
```

**Expected in step folder:**
- `request-to-server.json`: `context`, `result`, `execution` (matches `context.execution.action`)
- `client-result.json`: последний результат пользователя
- `server-response.json`: `step`, `timestamp`, `execute`, `context` (no `messages` — в `messages.json`)
- `server-promise.json`: `{ promiseId, status, submittedAt }` (если ответ async)
- `messages.json`: `[]` или `[{"role":"user","content":"..."}]`

### 6.2 Project Mode Structure

```bash
# Project path from storage/projects.json first project
cat {projectPath}/.a2a/sessions/{SESSION_ID}.json
```

### 6.3 Step file API

```bash
curl -s "$CLIENT_API_BASE/api/sessions/{SESSION_ID}/step/1/request-to-server.json"
curl -s "$CLIENT_API_BASE/api/sessions/{SESSION_ID}/step/2/server-response.json"
curl -s "$CLIENT_API_BASE/api/sessions/{SESSION_ID}/step/3/server-promise.json"
```

**Verify:** файлы доступны через `GET`, `PUT` и содержат ожидаемые поля (`request-to-server` — context/result, `server-promise` — promiseId/status).

### 6.4 Promise Status API

```bash
curl -s "$CLIENT_API_BASE/api/sessions/{SESSION_ID}/promise/{PROMISE_ID}"
```

**Verify:** Client API проксирует `GET $A2A_SERVER/api/v1/requests/{PROMISE_ID}/status` и возвращает `{ status }` (pending/completed/failed).
---

## 7. One-Shot Test Script

```bash
#!/bin/bash
WEB_UI_BASE="${WEB_UI_BASE:-http://localhost:5173}"
CLIENT_API_BASE="${CLIENT_API_BASE:-http://localhost:3001}"

# 1. Create session
RESP=$(curl -s -X POST "$WEB_UI_BASE/api/a2a/sessions" \
  -H "Content-Type: application/json" \
  -H "X-Storage-Mode: storage" \
  -d '{"title": "Chain Test"}')
SESSION_ID=$(echo "$RESP" | jq -r '.session.id')
[[ -z "$SESSION_ID" || "$SESSION_ID" == "null" ]] && { echo "FAIL: No session id"; exit 1; }
echo "OK: Created session $SESSION_ID"

# 2. List sessions
LIST=$(curl -s "$WEB_UI_BASE/api/a2a/sessions" -H "X-Storage-Mode: storage")
echo "$LIST" | jq -e '.sessions | map(select(.id == "'"$SESSION_ID"'")) | length > 0' >/dev/null || { echo "FAIL: Session not in list"; exit 1; }
echo "OK: Session in list"

# 3. Get session
curl -s "$WEB_UI_BASE/api/a2a/sessions/$SESSION_ID" -H "X-Storage-Mode: storage" | jq -e '.id' >/dev/null || { echo "FAIL: Get session"; exit 1; }
echo "OK: Get session"

# 4. Steps (storage mode)
STEPS=$(curl -s "$WEB_UI_BASE/api/a2a/sessions/$SESSION_ID/steps" -H "X-Storage-Mode: storage")
echo "$STEPS" | jq -e '.steps | length >= 1' >/dev/null || { echo "FAIL: Steps"; exit 1; }
echo "OK: Steps API"

# 5. Full chain: Client API session with task
CLIENT_RESP=$(curl -s -X POST "$CLIENT_API_BASE/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{"title":"Chain Test","task":"test"}')
echo "$CLIENT_RESP" | jq -e '.success and (.data or .serverResponse)' >/dev/null || { echo "FAIL: Client API session"; exit 1; }
echo "OK: Full chain (Client API -> a2a-server)"

# 6. Cleanup (Web session)
curl -s -X DELETE "$WEB_UI_BASE/api/a2a/sessions/$SESSION_ID" -H "X-Storage-Mode: storage" >/dev/null
echo "OK: Full chain verified"
```

### 7.1 PowerShell (Windows) — Web Client Only

```powershell
$WEB_UI_BASE = "http://localhost:5173"

# 1. Create session
$RESP = curl -s -X POST "$WEB_UI_BASE/api/a2a/sessions" -H "Content-Type: application/json" -H "X-Storage-Mode: storage" -d '{"title": "Chain Test"}'
$SESSION_ID = ($RESP | ConvertFrom-Json).session.id
if (-not $SESSION_ID) { Write-Error "FAIL: No session id"; exit 1 }
Write-Host "OK: Created session $SESSION_ID"

# 2. List sessions
$LIST = curl -s "$WEB_UI_BASE/api/a2a/sessions" -H "X-Storage-Mode: storage"
$sessions = ($LIST | ConvertFrom-Json).sessions
if ($sessions | Where-Object { $_.id -eq $SESSION_ID }) { Write-Host "OK: Session in list" } else { Write-Error "FAIL: Session not in list"; exit 1 }

# 3. Get session
$GET = curl -s "$WEB_UI_BASE/api/a2a/sessions/$SESSION_ID" -H "X-Storage-Mode: storage"
if (($GET | ConvertFrom-Json).id) { Write-Host "OK: Get session" } else { Write-Error "FAIL: Get session"; exit 1 }

# 4. Steps
$STEPS = curl -s "$WEB_UI_BASE/api/a2a/sessions/$SESSION_ID/steps" -H "X-Storage-Mode: storage"
if (($STEPS | ConvertFrom-Json).steps.Count -ge 1) { Write-Host "OK: Steps API" } else { Write-Error "FAIL: Steps"; exit 1 }

# 5. Cleanup
curl -s -X DELETE "$WEB_UI_BASE/api/a2a/sessions/$SESSION_ID" -H "X-Storage-Mode: storage" | Out-Null
Write-Host "OK: Full chain verified"
```

---

## 8. Checklist (Machine-Readable)

| # | Test | Command / Assertion | Pass |
|---|------|--------------------|------|
| 1 | Health: a2a-server | `curl -sf $A2A_SERVER_BASE/health` | [ ] |
| 2 | Health: Client API | `curl -sf $CLIENT_API_BASE/health` | [ ] |
| 3 | Health: Web UI | `curl -sf -o /dev/null $WEB_UI_BASE` | [ ] |
| 4 | POST /sessions (storage) | Returns session.id, execute.form.input | [ ] |
| 5 | GET /sessions | Returns sessions array | [ ] |
| 6 | GET /sessions/:id | Returns session object | [ ] |
| 7 | PUT /sessions/:id | Returns success | [ ] |
| 8 | GET /sessions/:id/steps | Returns steps array (storage mode) | [ ] |
| 9 | GET /sessions/:id/steps/1 | Returns step (server-response.json) with stepText | [ ] |
| 10 | POST /sessions/:id/steps | Returns step number | [ ] |
| 11 | GET /sessions/:id/latest | Returns latestStep, hasResponse | [ ] |
| 12 | GET /sessions/:id/history/1 | Returns history array | [ ] |
| 13 | DELETE /sessions/:id | Returns success | [ ] |
| 14 | POST /sessions (project) | Creates .a2a/sessions file | [ ] |
| 15 | POST /api/sessions (Client API, with task) | Returns serverResponse (execute/promiseId) | [ ] |
| 16 | Storage files exist | N/server-response.json, N/messages.json, N+1/server-promise.json (async) | [ ] |
| 17 | Request files exist | N/request-to-server.json, N/client-result.json | [ ] |
| 18 | Step file API works | `curl -s "$CLIENT_API_BASE/api/sessions/{SESSION_ID}/step/1/request-to-server.json"` (and `.../step/2/server-promise.json` when async) | [ ] |
| 19 | Dialog sim step 1 (task→choices) | serverResponse.execute.form.choices | [ ] |
| 20 | Dialog sim step 2 (choice→input) | execute.form.input | [ ] |
| 21 | Dialog sim step 3 (message→LLM) | execute.message + form.input | [ ] |
| 22 | Promise status API | `curl -s "$CLIENT_API_BASE/api/sessions/{SESSION_ID}/promise/{PROMISE_ID}"` returns `status` | [ ] |

---

## 9. Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| 404 on /api/a2a/sessions | Web UI not running | Start `npm run dev` in a2a-client |
| Empty sessions list | Wrong X-Storage-Mode | Use `storage` for numbered folders |
| 404 on /steps | Project mode | Use X-Storage-Mode: storage |
| Invoke timeout | a2a-server or Client API down | Start both services |
| CORS errors | Wrong origin | Use same origin (5173) for /api/a2a |
| Dialog sim: no form.choices | a2a-server not running or wrong task | Run `npm run test:sim` in simulations/dialog |
| Dialog sim: wrong execute shape | Server transform mismatch | Compare with simulations/dialog/*/received.json |
| No server-promise.json | Promise not saved | Saved in N+1/ after the async request step; see [`api-client-server-logic.md`](api-client-server-logic.md) |
| request-to-server.json missing | Client result not processed | Verify client-result.json exists before next step |
