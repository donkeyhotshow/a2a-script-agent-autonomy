# Port Management System

## Overview

The A2A Port Management System provides automated port allocation, conflict detection, and health gating for all services in the development stack.

## Features

- **Dynamic Port Allocation**: Automatically finds free ports if defaults are busy
- **Port Reservation System**: File-based locks prevent port conflicts between processes
- **Health Gating Automation**: Services wait for dependencies with exponential backoff
- **Port Conflict Detection**: Pre-start validation with suggestions for alternatives
- **Environment Integration**: Automatic `.env.local` updates with allocated ports

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Orchestrator  │────▶│   Port Manager   │────▶│   Port Checks   │
│                 │     │                  │     │                 │
│ - Health gating │     │ - Allocation     │     │ - isPortFree()  │
│ - Service order │     │ - Reservation    │     │ - Conflict det. │
│ - Env updates   │     │ - Release        │     │ - Suggestions   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│   Services      │                           │   Lock Files    │
│                 │                           │                 │
│ - Server: 3000  │                           │ ~/.a2a/port-    │
│ - Client: 3001  │                           │   locks/        │
│ - Web: 5173     │                           │ - port-{n}.lock │
│ - ...           │                           │ - port-{n}.json │
└─────────────────┘                           └─────────────────┘
```

## Configuration

### Default Ports (`config/ports.ts`)

| Service | Default Port | Range | Priority | Category |
|---------|-------------|-------|----------|----------|
| PostgreSQL | 5432 | 5432-5442 | 0 | Infrastructure |
| Redis | 6379 | 6379-6389 | 0 | Infrastructure |
| A2A Server | 3000 | 3000-3010 | 1 | Core |
| Client API | 3001 | 3001-3011 | 2 | Client |
| Web UI | 5173 | 5173-5183 | 3 | Client |
| AI Proxy | 11434 | 11434-11444 | 4 | AI |
| Ollama | 11435 | 11435-11445 | 5 | AI |

### Port Ranges by Category

- **Core**: 3000-3099
- **Client**: 5173-5272
- **AI**: 11434-11533
- **Infrastructure**: 5432-5531

## Usage

### Orchestrator Commands

```bash
# Start all services (with dynamic port allocation)
npm run dev

# Start server only
node scripts/orchestrator.js server

# Start client only
node scripts/orchestrator.js client

# Start with AI proxy
node scripts/orchestrator.js full

# Check service status
node scripts/orchestrator.js status
```

### Port Manager CLI

```bash
# Check if a port is free
node scripts/port-manager.js check 3000

# Allocate port for a service
node scripts/port-manager.js allocate server

# Release a reserved port
node scripts/port-manager.js release 3000

# Detect port conflicts
node scripts/port-manager.js conflicts

# List reserved ports
node scripts/port-manager.js list
```

### Programmatic API

```javascript
import { 
  allocatePort, 
  detectPortConflicts, 
  isPortFree,
  reservePort,
  releasePort 
} from './scripts/port-manager.js';

// Check if port is free
const free = await isPortFree(3000);

// Allocate port for service
const allocation = await allocatePort('server');
console.log(allocation.port);  // 3000 or alternative

// Detect conflicts
const { conflicts, suggestions } = await detectPortConflicts();
```

## Health Gating

### Exponential Backoff Configuration

```javascript
const HEALTH_CHECK_CONFIG = {
  maxAttempts: 30,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 1.5,
  timeoutMs: 60000,
};
```

### Retry Pattern

| Attempt | Delay (ms) | Total Time (ms) |
|---------|-----------|-----------------|
| 1 | 500 | 500 |
| 2 | 750 | 1,250 |
| 3 | 1,125 | 2,375 |
| 4 | 1,688 | 4,063 |
| 5 | 2,531 | 6,594 |
| ... | ... | ... |
| 30 | 10,000 | ~197,500 |

### Dependency Chain

```
postgres, redis → server → clientApi → web
ollama → proxy
```

Each service waits for its dependencies to be healthy before starting.

## Port Lock Files

### Location

```
~/.a2a/port-locks/
├── port-3000.lock      # Lock file (contains PID)
├── port-3000.json      # Metadata
├── port-3001.lock
└── port-3001.json
```

### Metadata Format

```json
{
  "port": 3000,
  "serviceName": "server",
  "pid": 12345,
  "reservedAt": "2026-03-03T19:30:00.000Z"
}
```

### Auto-Cleanup

Stale locks are automatically detected and removed when:
- The owning process no longer exists
- Port Manager checks reserved status
- Orchestrator shuts down

## Environment Variables

### Input (from .env)

```bash
SERVER_PORT=3000        # Preferred port
CLIENT_API_PORT=3001
WEB_PORT=5173
# ... etc
```

### Output (to .env.local)

```bash
# Auto-generated port allocations
# Generated at 2026-03-03T19:30:00.000Z
SERVER_PORT=3000
CLIENT_API_PORT=3002    # Alternative allocated
WEB_PORT=5173
```

## Troubleshooting

### Port Already in Use

```
❌ Conflicts:
  server: Port 3000 for server is already in use

💡 Suggestions:
  server: 3000 → 3002
```

**Solution**: The orchestrator will automatically use port 3002. Check `.env.local` for actual assignments.

### Health Check Timeout

```
[SERVER] ✗ Health check failed after 30 attempts
```

**Solutions**:
1. Increase `timeoutMs` in health check config
2. Check service logs for errors
3. Verify dependencies are healthy

### Stale Lock Files

```bash
# List all reserved ports
node scripts/port-manager.js list

# Release specific port
node scripts/port-manager.js release 3000

# Clear all locks (use with caution)
rm -rf ~/.a2a/port-locks/*
```

## Integration with Docker Compose

Ports defined in `docker-compose.yml` should match the default configuration:

```yaml
services:
  postgres:
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
  
  redis:
    ports:
      - "${REDIS_PORT:-6379}:6379"
```

## Best Practices

1. **Always use orchestrator**: Don't start services manually to ensure proper port allocation
2. **Check `.env.local`**: After start, verify actual port assignments
3. **Reserve early**: Services should reserve ports before starting
4. **Release on exit**: Always cleanup port reservations on shutdown
5. **Monitor conflicts**: Run `port-manager conflicts` before starting if you suspect issues

## Migration from Static Ports

### Before

```javascript
// Hardcoded in orchestrator
const SERVER_PORT = 3000;
```

### After

```javascript
// Dynamic allocation
const allocation = await allocatePort('server');
const SERVER_PORT = allocation.port;  // 3000 or alternative
```

## API Reference

### Port Manager Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `isPortFree(port)` | Check if port is available | `Promise<boolean>` |
| `isPortReserved(port)` | Check if port is locked | `boolean` |
| `allocatePort(service)` | Get/allocate port for service | `Promise<PortAllocation>` |
| `reservePort(port, service)` | Lock a port | `boolean` |
| `releasePort(port)` | Unlock a port | `boolean` |
| `detectPortConflicts()` | Find all conflicts | `Promise<ConflictReport>` |
| `getPortSuggestions(conflicts)` | Get alternatives | `Promise<PortSuggestion[]>` |
| `releaseAllPorts()` | Release process locks | `number` |

### Orchestrator Functions

| Function | Description |
|----------|-------------|
| `checkHealth(service, config)` | Check with exponential backoff |
| `waitForDependencies(service)` | Health gating for dependencies |
| `initializePorts()` | Allocate all service ports |
| `savePortAllocations()` | Write to `.env.local` |
