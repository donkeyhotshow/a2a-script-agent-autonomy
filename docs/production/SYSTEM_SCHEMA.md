# System Schema

## Components

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  a2a-server │────▶│   AI/LLM    │
│  (Web UI)   │◀────│  (Node.js)  │◀────│  (Ollama)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ PostgreSQL   │
                    │ + pgvector   │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Redis+BullMQ│
                    │ (queues)    │
                    └─────────────┘
```

## Tech Stack

- **a2a-server**: Node.js 20+, TypeScript, Express
- **Database**: PostgreSQL + pgvector
- **Queue**: Redis + BullMQ  
- **AI**: Ollama (local LLM)
- **Client**: Browser WebSocket

## Ports

- 3000: a2a-server HTTP
- 3001: Client API  
- 5173: Web UI
- 5432: PostgreSQL
- 6379: Redis

## Key Services

- `RequestService` - обрабатывает входящие запросы
- `MessageService` - управляет сообщениями
- `NeuronActivator` - активирует нейроны
- `RequestProcessor` - таймерный опрос (5 сек)

## Mode: Production

Production mode = real client requests, no simulations. LLM controls execution flow via `context.execution.step`.
