# System Startup Guide

## Architecture

| Component | Port | Role |
|-----------|------|------|
| Web Browser | 5173 | UI |
| a2a-client SDK | 3001 | Client API |
| a2a-server | 3000 | Main Server |
| ai-integration | 11434 | AI Proxy |
| Ollama | 11435 | LLM |

---

## Quick Start

### Windows
```bash
start-all.bat    # Start all services
kill-all.ps1     # Stop all services
```

### Linux/Mac
```bash
bash start-all.sh    # Start all services
```

---

## Manual Startup (Sequential)

### 1. Ollama (LLM)

```bash
# Запуск Ollama
set OLLAMA_HOST=0.0.0.0:11435
ollama serve

# Или через Docker
docker run -d -v ollama:/root/.ollama -p 11435:11435 --name ollama ollama/ollama
```

### 2. ai-integration (AI Proxy)

```bash
cd ai-integration

# Установка зависимостей
pip install -r requirements.txt

# Запуск
set OLLAMA_HOST=http://localhost:11435
python -m uvicorn proxy.asgi:application --host 0.0.0.0 --port 11434
```

### 3. a2a-server

```bash
cd a2a-server

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Или без авторизации
npm run dev:no-auth
```

### 4. a2a-client (SDK) - Client Server

```bash
cd a2a-client/packages/sdk

# Установка зависимостей
npm install

# Запуск
npm run dev
```

### 5. Web UI

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

### Тестовый запрос

```bash
# Создание сессии
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"projectId": "test"}'

# Отправка задачи
curl -X POST http://localhost:3001/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess_xxx",
    "message": {
      "role": "user",
      "parts": [{"type": "text", "text": "Привет"}]
    }
  }'
```

## Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `OLLAMA_HOST` | URL Ollama | http://localhost:11435 |
| `AI_HUB_URL` | URL ai-integration | http://localhost:11434 |
| `LLM_PROVIDER` | Провайдер LLM | ollama |
| `ENCRYPTION_KEY` | Ключ шифрования (32 символа) | - |
| `JWT_SECRET` | Секрет JWT (мин. 32 символа) | - |
| `SKIP_AUTH` | Пропустить авторизацию | 1 (dev) |

### Портовая схема

| Сервис | Порт |
|--------|------|
| Ollama | 11435 |
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

# Ollama
tail -f ~/.ollama/logs/server.log
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
