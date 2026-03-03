# Configuration Management

---
doc:
  id: configuration-management
  type: spec
  machine_readable: true
  tags: [config, env, zod, pydantic, orchestrator]
  references:
    - docs/DOCUMENTATION-MACHINE-READABLE.md
---

Centralized configuration management for the A2A Orchestrator using Zod (TypeScript) and Pydantic (Python) validation.

## Overview

All services share a unified `.env` file at the project root with type-safe validation:

- **Root Config** (`config/`): Zod schemas and validation for all services
- **A2A Server**: Uses Zod validation with fail-fast startup
- **AI Proxy**: Uses Pydantic validation with fail-fast startup

## Quick Start

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values

3. Validate configuration:
   ```bash
   npm run validate:config
   ```

## Validation

### Root Configuration Validation

```bash
# Validate and exit with error code on failure
npm run validate:config

# Validate without exiting (returns exit code 1 but doesn't crash)
npm run validate:config -- --safe

# Output as JSON
npm run validate:config -- --json

# Quiet mode (only exit code)
npm run validate:config -- --quiet
```

### Service Startup Validation

Both services validate configuration at startup and exit immediately if invalid:

- **A2A Server**: Validates on `npm run dev` or `npm start`
- **AI Proxy**: Validates on `python -m proxy`

## Environment Variables

### Service Ports

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | 3000 | A2A Server API port (Node.js) |
| `CLIENT_API_PORT` | 3001 | Client API Server port (Node.js) |
| `WEB_PORT` | 5173 | Web UI Development Server port (Vite) |
| `PROXY_PORT` | 11434 | AI Proxy port (Python Flask) |
| `OLLAMA_PORT` | 11435 | Ollama Docker port |
| `POSTGRES_PORT` | 5432 | PostgreSQL port |
| `REDIS_PORT` | 6379 | Redis port |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | *required* | PostgreSQL connection URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `POSTGRES_USER` | `a2a` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `a2a_secret` | PostgreSQL password |
| `POSTGRES_DB` | `a2a_server` | PostgreSQL database name |

### AI / LLM Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11435` | Ollama host URL |
| `OLLAMA_MODEL` | `llama3` | Default Ollama model |
| `OLLAMA_TIMEOUT` | 60 | Ollama request timeout (seconds) |
| `OLLAMA_MODELS` | `~/.ollama` | Path to Ollama models |
| `OLLAMA_KEEP_ALIVE` | `5m` | keep_alive duration for models |
| `OLLAMA_IDLE_TIMEOUT` | 300 | Seconds until Ollama stops when idle |
| `OLLAMA_AUTO_START` | `true` | Auto-start Ollama on demand |
| `LLM_PROVIDER` | *(auto)* | LLM provider: `ollama`, `openai`, or empty for auto |
| `USE_OLLAMA` | `false` | Flag to use Ollama |
| `AI_HUB_URL` | `http://localhost:11434` | AI Hub / Proxy URL |
| `POLL_INTERVAL_MS` | 2000 | Polling interval for async operations |
| `POLL_TIMEOUT_MS` | 120000 | Polling timeout for async operations |
| `OPENAI_API_KEY` | *optional* | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |

### Security

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | *required* | JWT secret (min 32 characters) |
| `JWT_EXPIRES_IN` | `1h` | JWT token expiration |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | JWT refresh token expiration |
| `ENCRYPTION_KEY` | *optional* | Encryption key for sensitive data (32 chars) |
| `SKIP_AUTH` | `false` | Skip authentication (development only!) |
| `API_KEY_PREFIX` | `sk_a2a_` | API key prefix |

**⚠️ Security Warnings:**
- `JWT_SECRET` must be at least 32 characters in production
- `ENCRYPTION_KEY` must be exactly 32 characters if set
- `SKIP_AUTH=1` should **never** be used in production

### A2A Server

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Node environment: `development`, `production`, `test` |
| `HOST` | `localhost` | Server host binding |
| `A2A_DEFAULT_EMAIL` | `dev@localhost` | Default dev user email |
| `A2A_DEFAULT_PASSWORD` | `dev` | Default dev user password |

### AI Proxy

| Variable | Default | Description |
|----------|---------|-------------|
| `PROXY_HOST` | `0.0.0.0` | Proxy host binding |
| `STORAGE_DIR` | `proxy_logs` | Directory for logs and data |
| `PROMISES_DIR` | *(computed)* | Promise queue directory (defaults to `STORAGE_DIR/promises`) |
| `FORWARD_TIMEOUT_SECONDS` | 60 | Request forwarding timeout |
| `PROMISE_TTL_SECONDS` | 86400 | Promise time-to-live (24 hours) |
| `PROMISE_MAX_WORKERS` | 8 | Max concurrent promise workers |
| `AI_HUB_CONFIG` | *optional* | Path to AI Hub JSON config |
| `OLLAMA_SERVER_HEADER` | `ollama` | Ollama server header value |
| `SIMULATION_ENABLED` | `false` | Enable simulation mode |
| `SIMULATION_DATA_PATH` | `simulation_data` | Simulation data directory |
| `HEALTH_CHECK_INTERVAL` | 5 | Seconds between health checks |
| `HEALTH_CHECK_TIMEOUT` | 5 | Health check timeout |

### Storage & Paths

| Variable | Default | Description |
|----------|---------|-------------|
| `GIT_SSH_KEY_PATH` | `./ssh_keys` | Git SSH keys directory |
| `GIT_CLONE_BASE_PATH` | `./repos` | Base path for git clones |
| `FILE_CACHE_PATH` | `./file_cache` | File cache directory |
| `MAX_FILE_SIZE_MB` | 10 | Maximum file size in MB |

### Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level: `error`, `warn`, `info`, `debug` |
| `LOG_FORMAT` | `json` | Log format: `json`, `pretty`, `text` |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window (milliseconds) |
| `RATE_LIMIT_MAX_REQUESTS` | 200 | Max requests per window |

### Queue (BullMQ)

| Variable | Default | Description |
|----------|---------|-------------|
| `QUEUE_CONCURRENCY` | 5 | Queue processing concurrency |
| `INDEXING_CONCURRENCY` | 2 | Indexing concurrency |

### ML / Embeddings

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_DIMENSION` | 768 | Embedding vector dimension |
| `CHUNK_MAX_TOKENS` | 512 | Max tokens per chunk |
| `CHUNK_OVERLAP_TOKENS` | 50 | Overlap tokens between chunks |

### Session

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_TIMEOUT_MS` | 3600000 | Session timeout (1 hour) |
| `SESSION_MAX_INACTIVE_MS` | 1800000 | Max inactive time (30 min) |

### WebSocket

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_PORT` | 3001 | WebSocket server port |
| `WS_HEARTBEAT_INTERVAL_MS` | 30000 | WebSocket heartbeat interval |

### Request Processor

| Variable | Default | Description |
|----------|---------|-------------|
| `REQUEST_PROCESSOR_INTERVAL_MS` | 5000 | Timer interval for request processing |

### Plexe ML

| Variable | Default | Description |
|----------|---------|-------------|
| `PLEXE_API_URL` | *optional* | Plexe API URL |
| `PLEXE_API_KEY` | *optional* | Plexe API key |

## TypeScript Usage

### Import Root Configuration

```typescript
import {config, validateConfig} from '../config/index.js';

// Access validated config
const port = config.ports.serverPort;
const dbUrl = config.database.databaseUrl;

// Validate programmatically
try {
  validateConfig();
  console.log('Configuration is valid');
} catch (error) {
  console.error('Invalid configuration:', error.message);
}
```

### Import Individual Sections

```typescript
import {
  validatePorts,
  validateDatabase,
  validateSecurity,
  validateAI,
} from '../config/index.js';

// Validate specific sections
const ports = validatePorts();
const db = validateDatabase();
```

### Safe Validation (No Exceptions)

```typescript
import {validateConfigSafe} from '../config/index.js';

const result = validateConfigSafe();

if (result.success) {
  console.log('Config:', result.config);
} else {
  console.error('Errors:', result.errors);
}
```

## Python Usage

### Import AI Proxy Settings

```python
from proxy.config import settings

# Access validated settings
port = settings.proxy_port
ollama_host = settings.ollama_host

# Or use legacy-style constants
from proxy.config import PROXY_PORT, OLLAMA_HOST
```

### Validate Configuration

```python
from proxy.config import validate_config

if validate_config():
    print("Configuration is valid")
else:
    print("Configuration is invalid")
```

### Print Configuration

```python
from proxy.config import print_config

print_config()
```

## Validation Rules

### Port Numbers
- Must be integers between 1 and 65535
- Common defaults: 3000 (server), 3001 (client), 5173 (web), 11434 (proxy)

### URLs
- Must be valid URLs with protocol (http:// or https://)
- Examples: `DATABASE_URL`, `REDIS_URL`, `OLLAMA_HOST`

### Boolean Values
Accepted case-insensitive values:
- `true`, `1`, `yes`, `y`, `on`, `t` → `true`
- Anything else → `false`

### String Lengths
- `JWT_SECRET`: Minimum 32 characters
- `ENCRYPTION_KEY`: Exactly 32 characters (if set)

### Integer Ranges
- Ports: 1-65535
- Timeouts: 1-3600 seconds
- Concurrency: 1-100
- Intervals: Positive integers

## Environment-Specific Configuration

### Development

```env
NODE_ENV=development
SKIP_AUTH=1
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

### Production

```env
NODE_ENV=production
SKIP_AUTH=0
LOG_LEVEL=warn
LOG_FORMAT=json
JWT_SECRET=your-super-secret-32-char-min-key
ENCRYPTION_KEY=your-32-char-encryption-key
```

### Testing

```env
NODE_ENV=test
DATABASE_URL="postgresql://a2a:a2a_secret@localhost:5432/a2a_test?schema=public"
SKIP_AUTH=1
```

## Troubleshooting

### Validation Errors

If you see errors like:
```
Configuration validation failed:
  - database.databaseUrl: Invalid url
  - security.jwtSecret: String must contain at least 32 character(s)
```

1. Check your `.env` file exists: `ls -la .env`
2. Verify required variables are set
3. Run validation: `npm run validate:config`

### Port Conflicts

If ports are already in use:
```bash
# Kill processes on common ports
npm run dev:kill-ports
```

### Database Connection

Verify database URL format:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

## Architecture

```
.env
  ↓
config/index.ts (Zod validation)
  ↓
├── A2A Server (TypeScript)
│   └── src/config/index.ts
└── AI Proxy (Python)
    └── proxy/config.py (Pydantic validation)
```

All services share the same `.env` file at the project root, ensuring consistency across the entire stack.
