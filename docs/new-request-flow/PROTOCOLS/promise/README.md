# Протокол Promise System

## Обзор

Система Promise используется для асинхронных операций в A2A протоколе. Когда AI Hub (compat_llm или другой LLM провайдер) не может ответить немедленно, сервер возвращает `promiseId`, который клиент использует для получения результата.

## Когда используется

- AI генерация ответа занимает время
- Длительная операция на сервере
- Внешний API вызов

## Архитектура

```
Client API          A2A Server           AI Hub (Local LLM upstream)
    │                    │                     │
    │─── request.json ──>│                     │
    │                    │─── prompt ─────────>│
    │                    │                     │
    │                    │<── promiseId ───────│
    │<── promiseId ──────│                     │
    │                    │                     │
    │─── poll ──────────>│                     │
    │                    │─── poll ──────────>│
    │                    │                     │
    │<── progress ────────│<── progress ───────│
    │                    │                     │
    │─── poll ──────────>│                     │
    │                    │─── poll ──────────>│
    │                    │                     │
    │<── result ──────────│<── result ────────│
    │                    │                     │
```

## Основные операции

### 1. Создание Promise

**Client → Server:**
```json
{
  "context": {
    "task": "проанализируй код"
  }
}
```

**Server → Client:**
```json
{
  "promiseId": "promise_abc123",
  "status": "pending"
}
```

### 2. Polling Promise

**Client → Server:**
```
GET /api/promises/promise_abc123
```

**Server → Client:**
```json
{
  "promiseId": "promise_abc123",
  "status": "pending",
  "progress": 45
}
```

### 3. Получение результата

**Server → Client:**
```json
{
  "promiseId": "promise_abc123",
  "status": "completed",
  "result": {
    "message": "Анализ завершен"
  }
}
```

## see also

- [PROMISE-WAITING.md](../../STAGES/simulations/PROMISE-WAITING.md)
- [pending state](../states/pending.md)
