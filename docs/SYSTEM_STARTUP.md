# System Startup Guide

## Machine-Read Contract

### Inputs

- OS: Windows for `.bat` commands; Linux/macOS for `.sh` commands.
- Required binaries: `node`, `npm`, `python`, `curl`.
- Required repositories/files: repo root, `start-all.bat` or `start-all.sh`.
- Required runtime config for server calls: `a2a-server/.env` with valid `ENCRYPTION_KEY` (32 chars), `JWT_SECRET` (>=32 chars), and upstream model config.

### Outputs

- Running services on configured ports.
- Valid health responses from `a2a-server`, `ai-integration`, and Client API.
- Client API session flow accepts `POST /api/a2a/sessions`, `POST /next`, and `GET /async`.

### Side Effects

- Starts or stops local processes.
- Binds service ports (`5173`, `3001`, `3000`, `11434` by default).
- Writes logs and runtime artifacts under module directories.
- Mutates local dependency state when running install commands.

### Assumptions

- Ports are available or can be released by operator action.
- Local model/upstream service is reachable for AI requests.
- Commands are executed from repository root unless explicitly stated otherwise.

### Constraints

- Default path for restart is `start-all.bat` (Windows) or `start-all.sh` (Linux/macOS).
- Per-service manual startup is debug-only and not default operation.
- Async session flow must be polled; do not treat `POST /next` ack as terminal result.

### Ambiguities and Chosen Interpretation

- Interpretation A: "manual startup" is daily operational path.
- Interpretation B: "manual startup" is exception path for debugging/isolation.
- Chosen: **B**, because repository policy defines `start-all` as canonical restart path and manual steps as exception flow.

## Architecture

| Component | Port | Role |
|-----------|------|------|
| Web Browser | 5173 | UI |
| a2a-client SDK | 3001 | Client API |
| a2a-server | 3000 | Main Server |
| ai-integration | 11434 | AI Proxy |

---

## Quick Start

### Windows
```bash
start-all.bat    # Start all services
kill-all.ps1     # Stop all services
```

**Hot-reload default (normative):** after normal code changes, **do not restart the whole stack**. Services reload automatically in dev mode:
- `a2a-server` → `tsx watch`
- Client API (`a2a-client/packages/sdk`) → `tsx watch`
- Web UI (`a2a-client`) → `vite` HMR
- `ai-integration` → `uvicorn --reload`
- promise queue daemon → dev watch wrapper (`scripts/promise_queue_daemon_watch.py`)

**When to use `start-all.bat` again:** only for full bootstrap/reset or process-level faults (stuck ports, broken process tree, env/config changes requiring restart, dead Vite/Client API process, stale `.pids.txt`). `start-all.bat` is the canonical full reset path (calls `kill-all.bat`, verifies ports, starts services, starts promise queue daemon). See [`AGENTS.md`](../AGENTS.md).

**LLM / hub busy:** If a Client API session is waiting on the LLM (`asyncPending` / server `processing`), **confirm** your configured upstream (per `ai-integration` / `providers.json`) is actually working **before** killing or restarting the stack. Normative wording: [`OPERATOR-CURL.md`](OPERATOR-CURL.md).

### Linux/Mac
```bash
bash start-all.sh    # Start all services
```

---

## Manual Startup (Sequential)

For day-to-day restarts on Windows, use `start-all.bat` only. Steps below are exception-only for debugging or intentional single-component isolation.

### 1. ai-integration (AI Proxy)

```bash
cd ai-integration

# Установка зависимостей
pip install -r requirements.txt

# Запуск (routing: config/providers.json + env — see ai-integration README)
python -m uvicorn proxy.asgi:application --host 0.0.0.0 --port 11434
```

### 2. a2a-server

Copy `a2a-server/.env.example` to `a2a-server/.env`. Set **`AI_HUB_URL`**, **`LLM_MODEL`** / **`Z_AI_MODEL`** (or keys for your hub providers) so dialog/agent calls succeed.

```bash
cd a2a-server

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Или без авторизации
npm run dev:no-auth
```

### 3. a2a-client (SDK) - Client Server

```bash
cd a2a-client/packages/sdk

# Установка зависимостей
npm install

# Запуск
npm run dev
```

### 4. Web UI

```bash
cd a2a-client

# Запуск dev сервера
npm run dev

# Открыть в браузере
# http://localhost:5173
```

## Проверка работы

### Health checks

```bash
# a2a-server
curl http://localhost:3000/health

# ai-integration
curl http://localhost:11434/health

# a2a-client SDK
curl http://localhost:3001/health
```

### Тестовый запрос (Client API session flow)

```bash
# 1) Create session via Client API (same surface as Web UI)
curl -X POST http://localhost:5173/api/a2a/sessions ^
  -H "Content-Type: application/json" ^
  -d "{\"projectId\":\"test\",\"mode\":\"agent\",\"task\":\"Say hello\"}"

# 2) Advance one turn (ack-only), then poll async until settled
# (replace SESSION_ID with the returned session.id)
curl -X POST http://localhost:5173/api/a2a/sessions/SESSION_ID/next ^
  -H "Content-Type: application/json" ^
  -d "{\"task\":\"Say hello\"}"

curl http://localhost:5173/api/a2a/sessions/SESSION_ID/async
```

## Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `AI_HUB_URL` | URL ai-integration | http://localhost:11434 |
| `LLM_MODEL` / `Z_AI_MODEL` | Model id sent to hub (a2a-server) | см. `a2a-server/.env.example` |
| `ENCRYPTION_KEY` | Ключ шифрования (32 символа) | - |
| `JWT_SECRET` | Секрет JWT (мин. 32 символа) | - |
| `SKIP_AUTH` | Пропустить авторизацию | 1 (dev) |

### Портовая схема

| Сервис | Порт |
|--------|------|
| ai-integration | 11434 |
| a2a-server | 3000 |
| a2a-client SDK | 3001 |
| Web UI (Vite) | 5173 |

## Устранение проблем

### Порты заняты

```bash
# Windows - найти процесс на порту
netstat -ano | findstr :3000

# Windows - убить процесс
taskkill /F /PID <PID>
```

### Логи

```bash
# a2a-server
tail -f a2a-server.log

# ai-integration
tail -f ai-integration.log

```

### Очистка и перезапуск

```bash
# Остановить все
kill-all.bat

# Очистить кэш
rm -rf a2a-server/node_modules/.cache
rm -rf a2a-client/node_modules/.cache

# Переустановить зависимости
cd a2a-server && npm install
cd a2a-client && npm install

# Запустить заново
start-all.bat
```

## Структура проекта

```
a2a-script-agent/
├── a2a-server/          # Основной сервер (Node.js)
├── a2a-client/         # Web клиент и SDK
│   ├── web/            # UI приложение
│   └── packages/       # NPM пакеты
│       └── sdk/        # Client SDK
├── ai-integration/     # AI прокси (Python)
├── config/             # Конфигурация
└── docs/              # Документация
```
