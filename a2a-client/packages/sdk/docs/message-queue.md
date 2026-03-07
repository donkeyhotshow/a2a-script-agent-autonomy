# Message Queue Implementation

## Problem
The SDK was sending messages immediately to the server without local persistence. On crash/restart, unsent messages were lost.

## Solution: "Save First, Then Pedal" Pattern

### Flow
1. **Save locally** - Message is persisted to disk with 'pending' status
2. **Return immediately** - Client gets 202 Accepted with queue ID
3. **Pedal asynchronously** - Background process sends to server
4. **Retry with backoff** - Failed messages retry with exponential backoff
5. **Resume on startup** - Detects unserved messages and continues pedaling

### Files Added/Modified

#### New: `src/message-queue.ts`
- `MessageQueue` class - Core queue implementation
- `QueuedMessage` interface - Message structure with status tracking
- Persistence to `.a2a/message-queue/` directory
- Exponential backoff retry logic

#### Modified: `src/server/index.ts`
- Added queue initialization on startup
- Modified `POST /sessions/:id/result` to use queue by default
- Added legacy mode (set `?queue=false` to bypass queue)
- Added sender function that calls server `/invoke` endpoint
- Startup recovery: `messageQueue.resumeOnStartup()`

#### New API Endpoints
- `GET /api/queue/stats` - Queue statistics
- `GET /api/queue/messages?sessionId=` - List unserved messages
- `POST /api/queue/retry/:messageId` - Retry failed message
- `POST /api/queue/pedal/:sessionId` - Force pedal session

#### Modified: `src/index.ts`
- Exported MessageQueue classes and types

### Usage

#### Default Behavior (Queue Enabled)
```bash
POST /api/sessions/:id/result
Body: { result: { message: "Hello" } }

Response (202 Accepted):
{
  "success": true,
  "data": {
    "queued": true,
    "messageId": "uuid",
    "status": "pending",
    "message": "Message queued for delivery"
  }
}
```

#### Bypass Queue (Legacy Mode)
```bash
POST /api/sessions/:id/result?queue=false
# or set environment variable DISABLE_MESSAGE_QUEUE=1
```

#### Check Queue Status
```bash
GET /api/queue/stats

Response:
{
  "success": true,
  "data": {
    "pending": 3,
    "sending": 1,
    "sent": 45,
    "failed": 0,
    "total": 49
  }
}
```

### Startup Recovery
On server restart, the queue automatically:
1. Scans `.a2a/message-queue/` for unserved messages
2. Starts the pedaler
3. Resumes sending pending messages

Console output:
```
[MessageQueue] Resumed 5 unserved messages
```

### Configuration
Environment variables:
- `DISABLE_MESSAGE_QUEUE=1` - Disable queue, use immediate send

Query parameters:
- `?queue=false` - Bypass queue for single request

### Message Lifecycle
```
[pending] → [sending] → [sent] → (cleanup)
   ↓
[retrying] ← [failed] (after max retries)
```

### Storage Structure
```
.a2a/message-queue/
├── {messageId}.json          # Main queue files
└── by-session/
    └── {sessionId}/
        └── {messageId}.json  # Session-indexed copies
```

### Retry Strategy
- Max retries: 5
- Initial delay: 1000ms
- Backoff multiplier: 2
- Max delay: 30000ms

Delays: 1s, 2s, 4s, 8s, 16s between retries
