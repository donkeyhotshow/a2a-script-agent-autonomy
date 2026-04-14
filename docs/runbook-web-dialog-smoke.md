# Runbook: полный smoke‑тест веб‑диалога (SIMULATION)

## Цель (измеримая)
За ≤2–3 минуты получить **PASS/FAIL** по критериям:
- стек поднят (`start-all.bat`)
- hub действительно в режиме симуляции (`11434/health` → `simulation_enabled: true`)
- web‑диалог через **Client API** работает end‑to‑end: `POST /api/a2a/sessions` → `POST /next` → poll `GET /async` → финальный snapshot

## Предусловия
- Открыть **cmd.exe** (важно для `set VAR=...` и корректной работы `.bat`).
- Перейти в корень репозитория:

```bat
cd /d C:\Users\Administrator\Documents\dev\a\a2a-script-agent
```

## Вариант A (рекомендуется): одна команда (батник)

```bat
scripts\testing\web-dialog-smoke.bat
```

### Что делает батник
- останавливает стек (`kill-all.bat`, строго port‑based)
- запускает стек с `SIMULATION_ENABLED=true` (через `start-all.bat`)
- проверяет health:
  - **gate hub**: ждёт `11434` (сначала LISTENING, затем `GET /health`) и проверяет **`simulation_enabled=true`**
  - `http://127.0.0.1:3000/health`
  - `http://127.0.0.1:5173/`
- прогоняет E2E диалог:
  - `POST http://127.0.0.1:5173/api/a2a/sessions` (создание сессии)
  - `POST http://127.0.0.1:5173/api/a2a/sessions/{id}/next` с top‑level `task`
  - poll `GET http://127.0.0.1:5173/api/a2a/sessions/{id}/async` до `asyncPending:false`
  - `GET http://127.0.0.1:5173/api/a2a/sessions/{id}` (гидратация снапшота)
- печатает `PASS` или `FAIL`, затем останавливает стек

### Ожидаемый результат
- **PASS**: в консоли видно подтверждение `simulation_enabled=true`, `SID=...`, затем `asyncPending=false`.
- **FAIL**: печатается шаг, на котором упало, и остаются временные файлы ответа (в `%TEMP%\a2a-smoke-*`). Для hub‑падений батник дополнительно выводит диагностику и хвост логов.

### Где смотреть логи hub при FAIL
- **uvicorn stdout/stderr capture**: `a2a-ai-hub\\logs\\ai-integration.log`
- **приложение hub (rotating file handler)**: `a2a-ai-hub\\logs\\a2a-ai-hub.log`

## Вариант B: ручной полный сценарий (curl, E2E)

### 1) Полный запуск стека с симуляцией
Остановить всё:

```bat
.\kill-all.bat
```

Запустить стек с включённой симуляцией в hub:

```bat
cmd /c "set SIMULATION_ENABLED=true&& set A2A_START_NONINTERACTIVE=1&& .\start-all.bat"
```

### 2) Health-check всех сервисов

```bat
curl.exe -sS http://localhost:11434/health
curl.exe -sS http://127.0.0.1:3000/health
curl.exe -sS http://127.0.0.1:5173/
```

В `11434/health` должно быть:
- `"status":"running"`
- **`"simulation_enabled": true`**

### 3) Создать сессию (Client API под UI origin)

```bat
curl.exe -sS -X POST http://127.0.0.1:5173/api/a2a/sessions ^
  -H "Content-Type: application/json" ^
  -d "{}"
```

Из ответа достать `session.id` (или `id`/`sessionId`, если форма отличается) и задать:

```bat
set SID=<SESSION_ID>
```

### 4) Проверить снапшот сессии

```bat
curl.exe -sS http://127.0.0.1:5173/api/a2a/sessions/%SID%
```

### 5) Первый удар: отправить task (важно: top-level `task`)

```bat
curl.exe -sS -X POST http://127.0.0.1:5173/api/a2a/sessions/%SID%/next ^
  -H "Content-Type: application/json" ^
  -d "{\"task\":\"SIMULATE: hello\"}"
```

Примечание: `POST .../next` — **ack‑only**. Факт завершения смотрим через `/async`.

### 6) Poll `/async` до terminal/idle
Сделайте 5–30 опросов (зависит от машины/очереди):

```bat
curl.exe -sS http://127.0.0.1:5173/api/a2a/sessions/%SID%/async
```

Критерий завершения:
- `asyncPending:false` (и обычно `status:"idle"` и/или `completed:true`)

### 7) Гидратация после завершения

```bat
curl.exe -sS http://127.0.0.1:5173/api/a2a/sessions/%SID%
```

Ожидаемо: обновлены `messages` и/или появилось `execute` следующего шага (часто `execute.form.choices` в router‑flow).

### 8) (опционально) «Два удара»: choices → `result.choice`
Этот шаг имеет смысл, **если** в снапшоте сессии появился `execute.form.choices`.

1) Найдите `choices[0].id` и задайте:

```bat
set CH=<CHOICE_ID>
```

2) Отправьте выбор (канон: `result.choice`):

```bat
curl.exe -sS -X POST http://127.0.0.1:5173/api/a2a/sessions/%SID%/next ^
  -H "Content-Type: application/json" ^
  -d "{\"result\":{\"choice\":\"%CH%\"}}"
```

3) Дождитесь завершения через `/async`, затем снова возьмите снапшот.

### 9) Завершение

```bat
.\kill-all.bat
```

