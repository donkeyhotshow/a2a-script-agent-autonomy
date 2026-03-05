# Stack Behavior

## Expected Behavior

### PostgreSQL + pgvector
- Stores requests, sessions, messages, vector embeddings
- pgvector for similarity search in RAG
- Connection via DATABASE_URL

### Redis + BullMQ
- Message queues for async task processing
- BullMQ manages job lifecycle
- Connection via REDIS_URL

### Ollama (LLM)
- Local LLM inference
- Handles AI-action prompts
- Must be running with model loaded
- Endpoint: OLLAMA_URL (default http://localhost:11434)

### a2a-server (Port 3000)
- HTTP API server
- Request processor polls every 5s
- Transforms request → LLM → response
- WebSocket for real-time updates

### a2a-client (Port 5173)
- Web UI (Vue-based)
- Communicates with server via HTTP + WebSocket

## Flow

1. Client sends request to server (port 3000)
2. Server saves to PostgreSQL, queues job via BullMQ
3. RequestProcessor polls queue, processes job
4. AI-actions call Ollama for LLM responses
5. Results stored, pushed to client via WebSocket

## Key Configuration

| Service | Port | Env Variable |
|---------|------|--------------|
| Server | 3000 | - |
| Client | 5173 | - |
| PostgreSQL | 5432 | DATABASE_URL |
| Redis | 6379 | REDIS_URL |
| Ollama | 11434 | OLLAMA_URL |
