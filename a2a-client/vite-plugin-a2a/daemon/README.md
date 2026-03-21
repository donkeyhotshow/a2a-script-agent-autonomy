# Client API Daemons

This directory contains background polling daemons for the Client API that handle asynchronous operations with the A2A Server.

## Overview

The Client API communicates with the A2A Server for long-running operations. Since the A2A Server processes requests asynchronously (returning a `promiseId`), the Client API must poll for results until completion, failure, or timeout.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌───────────┐ │
│  │   Browser   │      │ Client API  │      │ A2A Server  │      │AI Hub/LLM │ │
│  │   (Web UI)  │─────▶│  (Vite)     │─────▶│  (Port 3000)│─────▶│(Port 11435)│ │
│  └─────────────┘      └─────────────┘      └─────────────┘      └───────────┘ │
│         │                   │                    │                     │       │
│         │                   │                    │                     │       │
│         │                   ▼                    │                     │       │
│         │          ┌────────────────┐          │                     │       │
│         │          │ Polling Daemon │          │                     │       │
│         │          │                │          │                     │       │
│         │          │ 1. GET         │          │                     │       │
│         │          │    /requests/  │          │                     │       │
│         │          │    {id}/result │◀─────────│                     │       │
│         │          │                │          │                     │       │
│         │          │ 2. Check       │          │                     │       │
│         │          │    status      │          │                     │       │
│         │          │                │          │                     │       │
│         │          │ 3. Wait/Retry  │          │                     │       │
│         │          │    or Return   │          │                     │       │
│         │          └────────────────┘          │                     │       │
│         │                   │                    │                     │       │
│         └───────────────────┴────────────────────┴─────────────────────┘       │
│                                    Response Flow                                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Polling Loop

### Role

The polling daemon (`a2a-result-poll.js`) is responsible for:

1. **Polling A2A Server** - Repeatedly checking `/api/v1/requests/{promiseId}/result`
2. **Detecting completion** - Identifying when status is `completed`, `done`, or has `execute` data
3. **Handling failures** - Detecting `failed` or `error` status
4. **Managing timeouts** - Bounding the maximum wait time
5. **Error recovery** - Retrying on transient errors (connection issues, timeouts)

### Data Flow

```
User Action
    │
    ▼
┌─────────────────┐
│ POST /next      │ (Client API)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /invoke    │ (A2A Server)
│ (with context)  │
└────────┬────────┘
         │
    Returns promiseId
         │
         ▼
┌─────────────────────────────────────────────────┐
│ PollingDaemon.pollPromise(promiseId)           │
│                                                 │
│  for (i = 0; i < maxPolls; i++) {              │
│    GET /api/v1/requests/{id}/result             │
│    │                                            │
│    ├─▶ status === 'completed' ──► Return       │
│    ├─▶ status === 'failed' ──────► Return       │
│    ├─▶ transient error ──────────► Retry       │
│    └─▶ timeout ───────────────────► Return     │
│  }                                              │
└────────┬────────────────────────────────────────┘
         │
    Returns result
         │
         ▼
┌─────────────────┐
│ Response to UI  │
└─────────────────┘
```

## Parameters

### PollingDaemon Constructor Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `interval` | number | 1000 | Polling interval in milliseconds |
| `maxPolls` | number | 30 | Maximum number of polling attempts |
| `serverUrl` | string | 'http://localhost:3000' | A2A Server base URL |
| `maxRetries` | number | 3 | Maximum retry attempts for transient errors |
| `timeout` | number | 5000 | Request timeout in milliseconds |
| `headers` | object | {} | Additional headers for HTTP requests |
| `fetchImpl` | function | globalThis.fetch | Fetch implementation |

### Legacy Function Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `baseUrl` | string | 'http://localhost:3000' | A2A Server base URL |
| `maxPolls` | number | 30 | Maximum polling attempts |
| `intervalMs` | number | 1000 | Polling interval in milliseconds |
| `headers` | object | {} | HTTP headers |
| `fetchImpl` | function | globalThis.fetch | Fetch implementation |
| `onProgress` | function | undefined | Progress callback |

## Error Handling

### Transient Errors (Automatic Retry)

The daemon automatically retries on transient errors:

- **AbortError** - Request timeout
- **ECONNREFUSED** - Connection refused
- **ECONNRESET** - Connection reset
- **ENOTFOUND** - Server not found
- **Timeout** - Network timeout
- **Network errors** - General network issues

Retry strategy uses **exponential backoff**:
```
Retry 1: interval * 2^0 = interval
Retry 2: interval * 2^1 = interval * 2
Retry 3: interval * 2^2 = interval * 4
```

### Fatal Errors (No Retry)

The daemon stops polling and returns failure for:

- **HTTP 4xx errors** - Client errors (except 5xx)
- **Non-retryable exceptions** - Programming errors
- **Authentication errors** - 401 Unauthorized

### Terminal States

| State | Description | Return Value |
|-------|-------------|--------------|
| `completed` | Status is 'completed' or 'done', or has `execute` | `{ outcome: 'completed', data: ... }` |
| `failed` | Status is 'failed' or 'error` | `{ outcome: 'failed', data: ... }` |
| `timeout` | Max polls exhausted | `{ outcome: 'timeout' }` |

## Usage Examples

### Using PollingDaemon Class (Recommended)

```javascript
import { PollingDaemon } from './daemon/index.js';

// Create daemon with custom configuration
const daemon = new PollingDaemon({
    interval: 1000,        // Poll every 1 second
    maxPolls: 30,          // Maximum 30 attempts (30 seconds total)
    serverUrl: 'http://localhost:3000',
    maxRetries: 3,         // 3 retries per transient error
    timeout: 5000          // 5 second request timeout
});

// Poll for result
const result = await daemon.pollPromise(promiseId, (attempt, data, info) => {
    console.log(`Attempt ${info.attempt}/${info.maxPolls}, status: ${info.status}`);
});

if (result.outcome === 'completed') {
    console.log('Result:', result.data);
} else if (result.outcome === 'failed') {
    console.error('Failed:', result.data.error);
} else {
    console.warn('Polling timed out');
}

// Get statistics
const stats = daemon.getStats();
console.log('Stats:', {
    totalPolls: stats.totalPolls,
    totalRetries: stats.totalRetries,
    timeouts: stats.timeouts,
    errors: stats.errors
});
```

### Using Legacy Function API

```javascript
import { pollA2ARequestResult } from './daemon/index.js';

// Simple usage
const result = await pollA2ARequestResult(promiseId);

// With options
const result = await pollA2ARequestResult(promiseId, {
    baseUrl: 'http://localhost:3000',
    maxPolls: 30,
    intervalMs: 1000,
    headers: {
        'Authorization': 'Bearer token'
    },
    onProgress: (attempt, data) => {
        console.log(`Attempt ${attempt}:`, data?.status);
    }
});
```

### Integration with Step Routes

```javascript
// In stepRoutes.js
import { PollingDaemon } from '../daemon/index.js';

const daemon = new PollingDaemon({
    serverUrl: process.env.A2A_SERVER_URL || 'http://localhost:3000',
    interval: 1000,
    maxPolls: 30
});

// After receiving promiseId from A2A Server
if (a2aData.data?.promiseId) {
    const result = await daemon.pollPromise(
        a2aData.data.promiseId,
        (attempt, data, info) => {
            console.log(`[Daemon] Poll ${info.attempt}: ${data?.status || 'pending'}`);
        }
    );
    
    if (result.outcome === 'completed') {
        // Save server response
        await saveServerResponse(sessionId, step, result.data);
    }
}
```

## Files

| File | Description |
|------|-------------|
| `a2a-result-poll.js` | Main polling implementation with PollingDaemon class |
| `index.js` | Module exports |
| `README.md` | This documentation |

## Used By

- `routes/proxy/a2a-proxy.js` - Proxy requests to A2A Server
- `routes/stepRoutes.js` - Step processing and polling
- `routes/services/server-proxy.js` - Server-side proxy service

## Performance Considerations

- **Interval**: Smaller intervals = faster response but more load
- **Max polls**: Higher = longer timeout tolerance but longer potential wait
- **Retries**: More retries = better resilience but longer error recovery
- **Timeout**: Should be less than interval to avoid overlapping requests
