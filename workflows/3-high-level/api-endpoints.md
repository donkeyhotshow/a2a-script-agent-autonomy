# API Endpoints Reference

> **Complete reference for all API endpoints across services**

## A2A Server (Port 3000)

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness probe |
| GET | `/api/v1/health` | Detailed health check |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api/v1/queue/metrics` | Queue metrics |
| GET | `/api/v1/polling/metrics` | Polling optimizer metrics |
| GET | `/api/v1/pipeline/metrics` | Pipeline metrics |

### Core API

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/api/v1/requests` | Create new request | `{message, context, sessionId}` |
| GET | `/api/v1/requests/:promiseId/status` | Get request status | - |
| POST | `/api/v1/invoke` | Universal invoke endpoint | `{task, context?}` |

### Storage API

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| PUT | `/api/v1/storage/:namespace/:key` | Store data | JSON data with timestamp |
| GET | `/api/v1/storage/:namespace/:key` | Retrieve data | - |
| DELETE | `/api/v1/storage/:namespace/:key` | Delete data | - |
| DELETE | `/api/v1/storage/:namespace` | Clear namespace | - |
| GET | `/api/v1/storage/:namespace/keys` | List keys | - |

**Storage Notes:**
- Automatic cleanup after 30 days
- Size limit: 10MB per file
- JSON validation required
- Namespaces: `logs`, `sessions`, `temp`, etc.

### CLI Testing Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/api/v1/tester/command` | Send command to web client | Tester command payload |
| GET | `/api/v1/tester/status` | Get tester API status | - |
| GET | `/api/v1/tester/sessions` | List active sessions | - |
| POST | `/api/v1/tester/broadcast` | Broadcast to all sessions | Command payload |

## Client API (Port 3001)

### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/api/tester/status` | Tester API status |

### Session Management

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/sessions` | Create new session | `{message, context, sessionId}` |
| POST | `/result` | Submit action result | `{sessionId, choice, result}` |

### Tester API

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/api/tester/command` | Send tester command | `{type, command, data, sessionId}` |

## AI Integration Proxy (Port 11435)

### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Proxy health check |
| GET | `/health/ollama` | Ollama availability |
| GET | `/daemon/status` | Daemon status |

### Promise Management

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/api/generate` | Generate with promise | `{model, prompt, stream?, promise?}` |
| GET | `/promises/pending` | Get pending promises | - |
| GET | `/promise/:id` | Get promise status | - |
| POST | `/promise/:id/execute` | Execute promise | - |
| GET | `/promise/:id/response` | Get promise response | - |

### Daemon Control

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/daemon/start` | Start daemon | - |

### Cleanup API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cleanup/stats` | Storage statistics |
| POST | `/cleanup/run` | Run cleanup manually |

## Web UI (Port 5173)

The Web UI serves static files and proxies API calls to the Client API (port 3001).

### Proxy Routes

| Route | Target | Purpose |
|-------|--------|---------|
| `/api/*` | `http://localhost:3001/api/*` | API proxy |
| `/*` | Static files | Web interface |

## Example Usage

### Creating a Request

```bash
curl -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -H "x-skip-auth: true" \
  -d '{
    "message": "Hello world",
    "context": {},
    "sessionId": "test-session"
  }'
```

### Checking Request Status

```bash
curl http://localhost:3000/api/v1/requests/cmmevccg90004ra5advcazuex/status \
  -H "x-skip-auth: true"
```

### Using Storage API

```bash
# Store data
curl -X PUT http://localhost:3000/api/v1/storage/logs/session-123 \
  -H "Content-Type: application/json" \
  -d '{
    "data": {"message": "test"},
    "timestamp": "2026-03-06T12:00:00Z"
  }'

# Retrieve data
curl http://localhost:3000/api/v1/storage/logs/session-123
```

### CLI Testing Commands

```bash
# Send ping via CLI
node cli.js send ping --api-url http://localhost:3001 --session test-session

# Monitor events
node cli.js monitor --filter tester_command --api-url http://localhost:3001

# Get status
node cli.js status --api-url http://localhost:3001
```

### Promise Workflow

```bash
# Create promise request
curl -X POST http://localhost:11435/api/generate \
  -H "Content-Type: application/json" \
  -H "X-Promise: true" \
  -d '{"model":"qwen3:8b","prompt":"test message"}'

# Check status
curl http://localhost:11435/promise/{promiseId}

# Get response
curl http://localhost:11435/promise/{promiseId}/response
```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `NOT_FOUND` | Resource not found |
| `TIMEOUT` | Request timed out |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

## Rate Limiting

- **Default limit:** 200 requests per minute
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Configurable:** Via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`

## Authentication

- **Development:** Use `SKIP_AUTH=1` or `x-skip-auth: true` header
- **Production:** JWT tokens required
- **Session validation:** Automatic for web UI requests

## Monitoring

### Metrics Endpoints

- Prometheus: `/metrics`
- Queue stats: `/api/v1/queue/metrics`
- Storage cleanup: `/cleanup/stats`

### Log Files

- **Server:** `a2a-server/logs/a2a.log` (single consolidated server log)
- **Client:** `a2a-client/packages/sdk/logs/`
- **AI Integration:** `ai-integration/proxy/logs/`

### Health Checks

```bash
# All services health check
curl -f http://localhost:3000/health && \
curl -f http://localhost:3001/health && \
curl -f http://localhost:11435/health && \
echo "All services healthy"
```
