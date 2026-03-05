# Production Mode

## How to Run

### Prerequisites

- Node.js 20+
- PostgreSQL + pgvector
- Redis + BullMQ
- Ollama (running locally)

### Steps

1. **Start infrastructure**
   ```bash
   docker-compose up -d  # PostgreSQL, Redis
   ```

2. **Start Ollama**
   ```bash
   ollama serve
   ollama pull llama3
   ```

3. **Start a2a-server**
   ```bash
   cd a2a-server
   npm run dev
   ```

4. **Start a2a-client (Web UI)**
   ```bash
   cd a2a-client
   npm run dev
   ```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `OLLAMA_URL` | Ollama API URL |
| `SKIP_AUTH=1` | Disable auth (dev only) |
| `ENCRYPTION_KEY` | 32-char encryption key |

## Key Difference from Simulation

- Real LLM calls (Ollama)
- Real file I/O operations
- Actual WebSocket connections
- No mock data or replay

## Production Checklist

- [ ] PostgreSQL with pgvector extension
- [ ] Redis running
- [ ] Ollama with model loaded
- [ ] Environment variables configured
- [ ] a2a-server running on port 3000
- [ ] a2a-client running on port 5173
