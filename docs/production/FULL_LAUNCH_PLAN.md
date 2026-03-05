# План полного запуска продакшн режима

## Полный цикл: Client → Server → AI → Response (туда и обратно)

---

## 1. Предварительные требования

### 1.1 Установленные компоненты
- Docker + Docker Compose
- Node.js 18+ (для a2a-server и a2a-client)
- Python 3.9+ (для ai-integration прокси)
- Ollama с установленными моделями

### 1.2 Требуемые порты (должны быть свободны)
| Порт | Компонент | Описание |
|------|-----------|----------|
| 5432 | PostgreSQL | База данных |
| 6379 | Redis | Очереди и кэш |
| 5672 | RabbitMQ | AMQP брокер |
| 11434 | Ollama | LLM сервер |
| 3000 | a2a-server | A2A API сервер |
| 3001 | a2a-client | Client API |
| 5173 | Vite Dev | Web UI |

---

## 2. Последовательность запуска

### ЭТАП 1: Запуск инфраструктуры

```bash
# Запуск PostgreSQL, Redis, RabbitMQ
cd a2a-script-agent
docker-compose up -d postgres redis rabbitmq

# Проверка готовности
docker ps
```

**Ожидаемый результат:** 3 контейнера работают (postgres, redis, rabbitmq)

### ЭТАП 2: Запуск Ollama

```bash
# Запуск Ollama
docker run -d -v ollama_data:/root/.ollama -p 11434:11434 --name ollama ollama/ollama:latest

# Установка модели (обязательно)
docker exec ollama ollama pull llama3.2

# Проверка
curl http://localhost:11434/api/tags
```

**Ожидаемый ответ:**
```json
{
  "models": [
    {
      "name": "llama3.2:latest",
      "size": ...,
      "modified_at": "..."
    }
  ]
}
```

> ⚠️ **КРИТИЧНО:** Без модели дальнейший запуск невозможен!

### ЭТАП 3: Настройка переменных окружения

```bash
# Основные переменные для продакшна
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/a2a_server"
export REDIS_URL="redis://localhost:6379"
export RABBITMQ_URL="amqp://guest:guest@localhost:5672"
export OLLAMA_URL="http://localhost:11434"
export OLLAMA_MODEL="llama3.2"
export SKIP_AUTH="1"  # Только для dev!
export ENCRYPTION_KEY="12345678901234567890123456789012"  # 32 символа
```

### ЭТАП 4: Запуск a2a-server

```bash
cd a2a-server

# Установка зависимостей
npm install

# Запуск в продакшн режиме
NODE_ENV=production npm run start
# Или dev режим с hot reload
npm run dev
```

**Проверка:**
```bash
curl http://localhost:3000/health
```

### ЭТАП 5: Запуск ai-integration прокси

```bash
cd ai-integration
python -m proxy
```

**Проверка:**
```bash
curl http://localhost:5000/api/tags
```

### ЭТАП 6: Запуск a2a-client

```bash
cd a2a-client

# Установка зависимостей
npm install

# Сборка
npm run build

# Запуск
npm run dev
```

**Проверка:** Открыть http://localhost:5173 в браузере

---

## 3. Проверка сквозного цикла

### 3.1 Быстрый тест через curl

```bash
# Создание сессии
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"projectId": "test-prod"}'

# Отправка задачи (симуляция первого клиента)
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<session_id>",
    "content": "Hello, this is production test",
    "mode": "production"
  }'
```

### 3.2 Тест через WebSocket

```bash
# Подключение к WebSocket
wscat -c ws://localhost:3000/ws?sessionId=<session_id>

# Отправка сообщения
{"type": "message", "content": "Привет"}
```

---

## 4. Режимы работы

### 4.1 Simulation Mode (по умолчанию)
- Использует мок данные
- Быстрые ответы
- Для разработки и тестирования UI

### 4.2 Production Mode (реальный стек)
- Реальные вызовы LLM
- Настоящие файловые операции
- Полный цикл: Client → Server → PostgreSQL → BullMQ → Ollama → Response

**Активация:** Установить `OLLAMA_URL` и использовать реальные endpoints

---

## 5. Troubleshooting

### Проблема: Ollama не отвечает
```bash
# Проверка логов
docker logs ollama

# Перезапуск
docker restart ollama
```

### Проблема: PostgreSQL не подключается
```bash
# Проверка статуса
docker ps | grep postgres

# Логи
docker logs <postgres_container_id>
```

### Проблема: 500 ошибки в ai-integration
```bash
# Проверка прокси
curl -v http://localhost:5000/api/tags

# Логи Python
# Смотри Terminal 1 output
```

---

## 6. Команды для мониторинга

```bash
# Статус всех сервисов
docker ps

# Логи a2a-server
docker logs a2a-server -f

# Логи Redis
docker exec redis redis-cli INFO

# Тест Ollama
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Hello",
  "stream": false
}'
```

---

## 7. Стоп/Старт

```bash
# Остановка всей системы
docker-compose down
docker stop ollama

# Чистый старт (удалить все volumes!)
docker-compose down -v
docker volume rm a2a-script-agent_ollama_data
```

---

## 8. Production чеклист

- [ ] Все порты свободны
- [ ] PostgreSQL запущена и таблицы созданы
- [ ] Redis работает
- [ ] RabbitMQ работает  
- [ ] Ollama запущена с моделью llama3.2
- [ ] a2a-server запущен на порту 3000
- [ ] ai-integration прокси работает
- [ ] a2a-client запущен на порту 5173
- [ ] Health checks проходят
- [ ] Первый тестовый запрос проходит

---

## 9. Архитектура потока данных

```
┌─────────┐     ┌────────────┐     ┌───────────┐     ┌─────────┐
│  Client │────▶│ a2a-server │────▶│ PostgreSQL│     │         │
│  (5173) │     │  (3000)    │     │ (5432)    │     │         │
└─────────┘     └─────┬──────┘     └───────────┘     │         │
                     │                                  │         │
                     ▼                                  ▼         │
              ┌────────────┐                    ┌───────────┐    │
              │  BullMQ    │                    │  RabbitMQ │◀───┘
              │  (Redis)   │                    │  (5672)   │
              └─────┬──────┘                    └───────────┘
                    │
                    ▼
              ┌────────────┐     ┌───────────┐
              │   Ollama   │◀────│ ai-integ  │
              │ (11434)    │     │ (proxy)   │
              └────────────┘     └───────────┘
```

**Полный цикл:**
1. Клиент отправляет запрос на a2a-server
2. Server сохраняет в PostgreSQL
3. BullMQ ставит в очередь
4. ai-integration прокси вызывает Ollama
5. Ollama обрабатывает (реальный LLM!)
6. Response возвращается обратно клиенту
