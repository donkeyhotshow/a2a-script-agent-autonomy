# Proxy Routes and Promise Workflow Documentation

## Overview

The AI Integration proxy implements a comprehensive routing and async processing system for handling LLM requests. It supports multiple providers, promise-based async execution, simulation modes, and extensive logging.

## Architecture

### Core Components

- **Routes Handler**: Main entry point for all HTTP requests (`routes.py`)
- **Proxy Handler**: Core request processing logic (`proxy_handler.py`)
- **Promise System**: Async request management (`promises.py`, `promise_*.py`)
- **Router Manager**: Provider and model resolution (`router_manager.py`)
- **Rule Engine**: Request transformation and processing (`rule_engine.py`)

### Request Flow

```
Client Request → Routes → Proxy Handler → Router Resolution → Promise Creation
                       ↓
               Promise ID returned immediately (202)
                       ↓
               Background processing via Promise Executor
                       ↓
               Response stored → Client polls for completion
```

## Route Categories

### 1. Main Proxy Routes (`routes.py`)

#### High-Level AI API (v1)
- `POST /api/v1/generate` - Text generation with normalized response
- `POST /api/v1/embed` - Embedding generation with normalized response

#### Static File Serving
- `GET /web/<path>` - Serve static files from `web/` folder
- `GET /queue` - Queue management web interface

#### Main Proxy Handler
- `GET|POST|PUT|DELETE|PATCH /<path>` - Catch-all proxy handler

### 2. Promise Management Routes (`promise_routes.py`)

#### Core Promise API (`promise_api_routes.py`)
- `GET /promise/by-server-request/<server_promise_id>` - Lookup by server promise ID
- `GET|DELETE /promise/<promise_id>` - Get status or delete promise
- `GET /promise/<promise_id>/response` - Get final response body
- `GET /promise/<promise_id>/body_raw` - Get raw provider JSON response
- `GET /promise/<promise_id>/request` - Get original request details
- `POST /promise/<promise_id>/answer` - Manually set promise response
- `POST /promise/<promise_id>/execute` - Execute request to Local LLM upstream
- `POST /promise/<promise_id>/retry` - Reset promise to pending for retry

#### UI Routes (`promise_ui_routes.py`)
- Web interface endpoints for promise management

#### Management Routes (`promise_management_routes.py`)
- Administrative endpoints for queue monitoring

### 3. Health and Monitoring Routes

#### Health Checks (`health_routes.py`)
- `GET /health` - Basic health check
- `GET /health/compat_llm` - Local LLM upstream health
- `GET /health/ready` - Readiness check

#### Metrics (`metrics_routes.py`)
- `GET /metrics` - Prometheus metrics

### 4. Local LLM Management (`local_llm_routes.py`)
- `GET /compat_llm/status` - Get Local LLM upstream status
- `POST /compat_llm/start` - Start Local LLM upstream
- `POST /compat_llm/stop` - Stop Local LLM upstream
- `POST /compat_llm/restart` - Restart Local LLM upstream

### 5. Daemon Management (`daemon_routes.py`)
- `GET /daemon/status` - Get daemon status
- `POST /daemon/start` - Start background daemon
- `POST /daemon/stop` - Stop background daemon

### 6. Cleanup Operations (`cleanup_routes.py`)
- Storage cleanup and maintenance endpoints

## Promise Workflow

### Promise Lifecycle

1. **Creation**: Client request triggers promise creation
2. **Pending**: Promise ID returned immediately (HTTP 202)
3. **Processing**: Background execution via daemon or manual trigger
4. **Completion**: Response stored, client polls for result
5. **Cleanup**: Automatic expiration after TTL

### Promise States

- `pending` - Waiting for execution
- `executing` - Currently processing
- `done` - Successfully completed
- `error` - Failed with error

### Storage Structure

```
proxy_logs/promises/
├── {promise_id}/
│   ├── meta.json          # Promise metadata
│   ├── body_raw.json      # Raw provider response
│   ├── body.md            # Processed content
│   └── routing.json       # Routing decisions
└── requests/              # Request snapshots
    └── {timestamp}/
        └── request.json
```

### Async Execution Flow

1. **Client Request** → Proxy receives request
2. **Promise Creation** → `create_promise()` assigns ID
3. **Immediate Response** → Return `promiseId` (HTTP 202)
4. **Background Processing**:
   - Daemon monitors pending promises
   - Manual trigger via `POST /promise/{id}/execute`
   - Request forwarded to Local LLM upstream
5. **Response Handling**:
   - Raw response stored in `body_raw.json`
   - Content extracted to `body.md`
   - Promise marked as `done`
6. **Client Polling**:
   - `GET /promise/{id}` for status
   - `GET /promise/{id}/response` for final result

### Error Handling

- **Timeout**: Promises expire after `PROMISE_TTL_SECONDS`
- **Retry Logic**: Failed promises can be reset via `/retry` endpoint
- **Manual Override**: `/answer` endpoint allows manual response injection
- **Rate Limiting**: Automatic failover between API keys

## Provider Routing

### Router Resolution Process

1. **Model Resolution** → Extract model from request
2. **Provider Matching** → Find provider supporting the model
3. **API Key Selection** → Choose from provider's key pool
4. **URL Construction** → Build upstream URL
5. **Request Forwarding** → Send to provider with authentication

### Supported Providers

- **z_ai**: Primary provider with key failover
- **compat_llm**: Local LLM upstream (no auth)
- **openrouter**: Multi-provider aggregator
- **groq**: Fast inference provider
- **mistral_codestral**: Code-focused models
- **together**: Community models
- **cerebras**: High-performance models
- **cohere**: Enterprise LLM provider
- **qwen_dashscope**: Alibaba Qwen models
- **huggingface**: Open-source models

### Fallback Chain

Configured `fallback_chain` enables automatic provider switching on failures:
```
z_ai → groq → openrouter → qwen_dashscope → mistral_codestral → together → cerebras → cohere → compat_llm
```

## Simulation and Testing

### Simulation Mode
- `SIMULATION_ENABLED=true` enables mock responses
- Uses `simulation_handler.py` for generating fake responses
- Virtual models supported via `ai_hub_config.py`

### Virtual Models
- Custom model definitions in AI Hub config
- Support for canned responses and transformations
- Useful for testing without real API calls

## Logging and Monitoring

### Request Logging
- All requests saved to `proxy_logs/requests/`
- Includes headers, body, and metadata
- Automatic cleanup via TTL

### Promise Logging
- Execution traces in promise folders
- Routing decisions logged
- Error details preserved

### Metrics
- Prometheus-compatible metrics endpoint
- Request counts, latencies, error rates
- Provider-specific statistics

## Configuration Integration

### Environment Variables
- `PROMISE_TTL_SECONDS`: Promise expiration time
- `PROMISE_MAX_WORKERS`: Concurrent execution limit
- `PROVIDER_TIMEOUT`: Upstream timeout
- `ENABLE_FALLBACK`: Provider failover enable

### Provider Configuration
- Loaded from `config/providers.json`
- Supports environment variable substitution
- Key pooling and priority management

## Error Scenarios

### Common Issues
- **Local LLM upstream not running**: Check `/compat_llm/status`
- **Promise timeout**: Increase `PROMISE_TTL_SECONDS`
- **Rate limiting**: Verify API keys and failover configuration
- **Provider errors**: Check routing logs and fallback chain

### Debugging
- Use `/promise/{id}/request` to inspect original requests
- Check `/promise/{id}/response` for final results
- Review `routing.json` for provider decisions
- Monitor `/metrics` for system health

## Performance Considerations

- **Promise TTL**: Balance between cleanup and retry windows
- **Worker Limits**: Prevent resource exhaustion
- **Caching**: Enabled for `/api/v1/*` endpoints
- **Connection Pooling**: Reuse HTTP connections to upstreams

## Security

- API keys stored securely (gitignored)
- Request sanitization before forwarding
- Header filtering for sensitive information
- Automatic key rotation on failures