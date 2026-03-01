# Simulation Workflow

## Overview

Симуляции находятся в папке `simulations/`. Каждая симуляция представляет собой сценарий взаимодействия Client ↔ Server ↔ LLM.

## Structure

```
simulations/
├── dialog/                 # Симуляция диалога
│   ├── 1/
│   │   ├── request.json    # Client → Server
│   │   └── response.json  # Server → Client
│   ├── 2/
│   │   ├── request.json
│   │   └── response.json
│   ├── 3/
│   │   ├── request.json
│   │   ├── request.md     # Server → LLM (Complex prompt format!)
│   │   ├── response.json
│   │   └── response.md    # LLM → Server
│   ├── 4/
│   │   ├── request.json
│   │   ├── request.md
│   │   ├── response.json
│   │   └── response.md
│   └── ...
├── fix-vue-imports/        # Симуляция fix-vue-imports
├── analyze-architecture/   # Симуляция анализа архитектуры
└── ...
```

## File Types

Каждый шаг симуляции содержит:

| File | Direction | Description |
|------|-----------|-------------|
| `request.json` | Client → Server | Что клиент отправляет на сервер |
| `request.md` | Server → LLM | Что сервер отправляет в External AI Hub |
| `response.md` | LLM → Server | Что LLM возвращает серверу |
| `response.json` | Server → Client | Что сервер возвращает клиенту |

**ВАЖНО:** Не все шаги содержат все 4 файла. Шаги с LLM содержат .md файлы, остальные только .json.

## Flow

```
Client              Server              LLM
  │                   │                   │
  │ request.json      │                   │
  │──────────────────>│                   │
  │                   │                   │
  │                   │ request.md        │
  │                   │──────────────────>│
  │                   │                   │
  │                   │ response.md       │
  │                   │<──────────────────│
  │                   │                   │
  │ response.json     │                   │
  │<──────────────────│                   │
```

## Dialog Simulation - Форматы файлов

### request.json (Client → Server)

```json
{
  "context": {
    "task": "dialog"
  },
  "input": {
    "messages": [
      {
        "content": "user message"
      }
    ]
  }
}
```

**Ключевые моменты:**
- `input.messages` содержит content БЕЗ role (сервер добавляет role)
- history передается через context.history

### request.md (Server → LLM) - Complex Prompt!

```markdown
## System Prompt

продолжи диалог в json . ответь обновленным json 

```json
{
  "context": {
    "task": "dialog",
    "execution": {
      "action": "dialog",
      "step": "llm-request"
    },
    "history": [
      {
        "role": "user",
        "message": "hello world"
      }
    ]
  }
}
```
```

**Ключевые моменты:**
- ЭТО MARKDOWN С SYSTEM PROMPT!
- Не JSON!
- LLM должен ответить JSON с обновленным context
- НЕ используется оптимизированный формат (model, messages)
- Это сложный промпт который требует трансформации

### response.md (LLM → Server)

```json
{
  "context": {
    "task": "dialog",
    "execution": {
      "action": "dialog",
      "step": "llm-request"
    },
    "history": [
      { "role": "user", "message": "hello world" },
      { "role": "assistant", "message": "hello world" }
    ]
  }
}
```

**Ключевые моменты:**
- Содержит context с обновленным history
- LLM вернул JSON с историей

### response.json (Server → Client)

```json
{
  "context": {
    "task": "dialog",
    "execution": {
      "action": "dialog",
      "step": "llm-request"
    },
    "history": [
      { "role": "user", "message": "hello world" },
      { "role": "assistant", "message": "hello world" }
    ]
  },
  "execute": {
    "form": {
      "input": {},
      "output": "message",
      "required": ["messages"]
    }
  }
}
```

**Ключевые моменты:**
- К response.md добавляется поле execute
- execute.form - для продолжения диалога
- execute.result - для завершения

## Пошаговый Flow

### Шаг 1: Initial Request
- Client: отправляет task
- Server: возвращает form для первого сообщения

### Шаг 2: Client Provides Input
- Client: отправляет message content
- Server: готовится вызвать LLM

### Шаг 3: First LLM Call (No History) - ЕСТЬ .md ФАЙЛЫ!
- Server → LLM (request.md): system prompt + user message в markdown
- LLM → Server (response.md): JSON с history
- Server → Client (response.json): history + form

### Шаг 4+: Subsequent Turns - ЕСТЬ .md ФАЙЛЫ!
- Client: отправляет result message + server имеет history
- Server → LLM (request.md): system + history + new message
- LLM → Server (response.md): JSON с updated history
- Server → Client (response.json): updated history + form/result

## Главные правила

1. **request.md - это MARKDOWN с system prompt**, не просто JSON с model/messages
2. **Client отправляет content без role** - сервер добавляет role при построении history
3. **response.md возвращает context с history** - это что будет отправлено LLM в следующем запросе
4. **response.json = response.md + execute** - сервер добавляет execute.form или execute.result
