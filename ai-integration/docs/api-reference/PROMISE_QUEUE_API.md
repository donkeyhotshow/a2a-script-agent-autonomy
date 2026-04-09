# REST Ticket Queue API Documentation

## Overview

The Promise Queue system provides asynchronous processing capabilities for the AI Integration proxy. It manages "tickets" (promises) that represent pending LLM requests, allowing for background processing, retry logic, and queue management.

## Core Concepts

### Promise Lifecycle

1. **Creation**: Promise created when request needs async processing
2. **Pending**: Waiting for execution
3. **Executing**: Currently being processed
4. **Done**: Successfully completed
5. **Error**: Failed with error

### Queue Management

- **Automatic Processing**: Daemon polls for pending promises
- **Manual Control**: API endpoints for manual intervention
- **Retry Logic**: Failed promises can be reset and retried
- **Expiration**: Promises automatically expire after TTL

## Promise Management Endpoints

### Core Promise Operations

#### `GET /promise/<promise_id>`

Get detailed status of a specific promise.

**Response Codes:**
- `200`: Promise status (pending/done/error)
- `404`: Promise not found
- `500`: Error with truncated message

**Response Format:**
```json
{
  "promiseId": "string",
  "status": "pending|done|error",
  "result_status_code": 200,
  "result_content_type": "application/json",
  "error": "error message (if status=error)"
}
```

**Query Parameters:**
- `detail=1`: Include full error text (default: truncated)

#### `DELETE /promise/<promise_id>`

Remove a promise from the system.

**Response Codes:**
- `200`: Successfully deleted
- `404`: Promise not found
- `500`: Delete operation failed

#### `POST /promise/<promise_id>/execute`

Execute a pending promise against the Local LLM upstream.

**Requirements:**
- Promise must be in `pending` status
- Local LLM upstream must be running and idle

**Response Codes:**
- `202`: Execution started in background
- `409`: Promise not in pending status
- `503`: Local LLM upstream not available

**Response Format:**
```json
{
  "promiseId": "string",
  "status": "executing",
  "message": "Request sent to LLM, processing in background"
}
```

#### `POST /promise/<promise_id>/answer`

Manually set the response for a promise (bypasses LLM execution).

**Request Body:**
```json
{
  "body": "response content",
  "status_code": 200,
  "content_type": "text/plain",
  "headers": {"key": "value"}
}
```

**Response Codes:**
- `200`: Answer set successfully
- `409`: Promise not in pending status

#### `POST /promise/<promise_id>/retry`

Reset an error/done promise back to pending status for re-execution.

**Response Codes:**
- `200`: Reset successful
- `404`: Promise not found

### Promise Inspection Endpoints

#### `GET /promise/<promise_id>/response`

Retrieve the final response body for a completed promise.

**Response Codes:**
- `200`: Raw response body
- `202`: Still pending
- `404`: Promise not found
- `500`: Response body missing

**Headers:**
- `X-Promise-Id`: Promise identifier
- `X-Promise-Status`: "done"

#### `GET /promise/<promise_id>/body_raw`

Get the raw provider JSON response (for successful executions).

**Response Codes:**
- `200`: Raw JSON response
- `404`: Promise not found or raw body not available

#### `GET /promise/<promise_id>/request`

Get the original request details.

**Response Format:**
```json
{
  "promiseId": "string",
  "method": "POST",
  "path": "/api/chat",
  "target_url": "http://localhost:11435/api/chat",
  "headers": {"Content-Type": "application/json"},
  "args": {},
  "body": "{\"model\": \"qwen3:8b\", \"messages\": [...]}",
  "body_base64": null
}
```

## Queue Management Endpoints

### Status Overview

#### `GET /promises/status`

Get unified status overview (completed promises only).

**Response Format:**
```json
{
  "ready": [
    {
      "promiseId": "string",
      "status": "done",
      "serverPromiseId": "srv_123",
      "updated_at": "2024-01-01T12:00:00.000Z",
      "updated_at_unix": 1704110400
    }
  ]
}
```

#### `GET /promises/ready`

List all completed (done) promises, sorted by update time (oldest first).

**Response Format:** Array of promise status objects (same as `/promises/status`)

#### `GET /promises/pending`

List all pending promises awaiting execution.

**Response Format:**
```json
[
  {
    "promiseId": "string",
    "status": "pending",
    "created_at": "2024-01-01T12:00:00.000Z",
    "created_at_unix": 1704110400,
    "method": "POST",
    "path": "/api/chat",
    "target_url": "http://localhost:11435/api/chat",
    "log_folder": "/path/to/logs"
  }
]
```

#### `GET /promises/errors`

List promises in error status.

**Query Parameters:**
- `detail=1`: Include full error messages

**Response Format:**
```json
[
  {
    "promiseId": "string",
    "status": "error",
    "error": "truncated error message",
    "error_truncated": true,
    "method": "POST",
    "path": "/api/chat",
    "target_url": "http://localhost:11435/api/chat",
    "updated_at": "2024-01-01T12:00:00.000Z",
    "updated_at_unix": 1704110400
  }
]
```

## Server Integration Endpoints

### `GET /promise/by-server-request/<server_promise_id>`

Lookup proxy promise ID by A2A server's promise ID.

**Use Case:** Recovery after proxy restart when server still has pending promises.

**Response Format:**
```json
{
  "promiseId": "proxy_promise_id",
  "status": "pending",
  "serverPromiseId": "srv_123"
}
```

## Daemon Integration

### Promise Queue Daemon

The `promise_queue_daemon.py` script provides automatic queue processing:

**Key Features:**
- Polls `/promises/pending` for work
- Automatically executes pending promises
- Handles Local LLM upstream availability checks
- Implements retry logic and error handling
- Configurable poll intervals and timeouts

**Operation Modes:**
- **Auto-approve**: Automatically execute pending promises
- **Report-only**: Monitor queue without execution
- **Dry-run**: Log execution without actual processing

**Configuration:**
```bash
promise_queue_daemon.py \
  --proxy-url http://localhost:11434 \
  --interval 4.0 \
  --timeout 15.0 \
  --response-attempts 5
```

## Storage and Persistence

### Promise Storage Structure

```
proxy_logs/promises/
├── {promise_id}/
│   ├── meta.json          # Promise metadata and status
│   ├── body_raw.json      # Raw LLM provider response
│   ├── body.md            # Processed response content
│   └── routing.json       # Provider routing decisions
```

### Metadata Fields

- `promise_id`: Unique identifier
- `status`: Current status (pending/executing/done/error)
- `created_at`: Unix timestamp when created
- `updated_at`: Unix timestamp when last modified
- `method`: HTTP method of original request
- `path`: Request path
- `target_url`: Upstream URL used
- `log_folder`: Path to log files
- `server_promise_id`: Linked A2A server promise ID

## Error Handling

### Common Error Scenarios

- **Promise not found**: 404 with `{"error": "promise_not_found"}`
- **Invalid status transitions**: 409 with `{"error": "promise_not_pending"}`
- **Upstream unavailable**: 503 with `{"error": "local_llm_upstream_not_running"}`
- **Execution conflicts**: 503 with `{"error": "local_llm_upstream_busy"}`

### Retry Mechanisms

- Failed promises can be manually reset with `/retry`
- Daemon implements automatic retry logic
- Rate limiting handled via provider failover

## Monitoring and Debugging

### Queue Health Checks

- Check pending queue size: `GET /promises/pending`
- Monitor error rates: `GET /promises/errors`
- Track completion rates: `GET /promises/ready`

### Request Inspection

- View original request: `GET /promise/{id}/request`
- Check execution logs in `log_folder`
- Review routing decisions in `routing.json`

### Performance Metrics

- Queue depth monitoring
- Execution latency tracking
- Error rate analysis
- Provider failover statistics

## Integration Patterns

### With A2A Server

1. A2A server creates promise via proxy
2. Returns `promiseId` to client immediately
3. Client polls A2A server status endpoint
4. A2A server polls proxy `/promise/{id}` internally
5. When complete, A2A server returns result to client

### With External Clients

1. Client submits request to proxy
2. Receives `promiseId` (HTTP 202)
3. Polls `/promise/{id}` for completion
4. Retrieves result via `/promise/{id}/response`

### With Daemon Processing

1. Daemon polls `/promises/pending`
2. Executes via `/promise/{id}/execute`
3. Monitors completion
4. Handles errors and retries automatically