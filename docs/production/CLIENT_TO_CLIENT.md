# Client-to-Server-to-Client (Request-Response Cycle)

## Flow

```
Client (Web UI)
      │
      ▼ POST /api/requests
a2a-server
      │
      ▼ Save to DB + Queue
PostgreSQL + Redis
      │
      ▼ RequestProcessor (5 sec poll)
a2a-server
      │
      ▼ AI-Action Transform
Ollama (LLM)
      │
      ▼ Execute actions
a2a-server
      │
      ▼ WebSocket/HTTP Response
Client (Web UI) ← ТУТА ВОЗВРАТ
```

## Algorithm Steps

1. **Client** отправляет запрос через WebSocket или HTTP
2. **RequestService** сохраняет запрос в PostgreSQL (status: pending)
3. **RequestProcessor** опрашивает каждые 5 сек pending запросы
4. **NeuronActivator** активирует нужные нейроны
5. **AI-Action Transform** отправляет контекст в LLM (Ollama)
6. **LLM** контролирует выполнение через `context.execution.step`
7. **Actions** выполняются на сервере или клиенте (script, read-file, etc.)
8. **Result** возвращается обратно **Client** (тому же клиенту)

## Production Mode Characteristics

- **Режим**: Реальные HTTP/WebSocket запросы, реальные LLM вызовы
- **LLM**: Возвращает настоящие значения `step` (plan, clarify, research, execute, completed)
- **I/O**: Реальная работа с файлами, выполнение команд
- **WebSocket**: Настоящие сообщения клиенту
- **Нет**: моков, реплея, тестовых данных

## Key Difference from Simulation

| Feature | Production | Simulation |
|---------|------------|------------|
| HTTP/WebSocket | Real | Mocked |
| LLM Calls | Real Ollama | Mock/Replay |
| Data | Real DB | Test fixtures |
| Results | Actual execution | Deterministic |

## Что значит "от клиента до клиента"

Это классический цикл запрос-ответ:
- Клиент шлёт запрос на сервер
- Сервер обрабатывает (AI-Action, LLM, actions)
- Сервер возвращает результат обратно тому же клиенту

Это НЕ коммуникация между двумя разными клиентами.
