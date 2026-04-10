# ADR-0003: Stateless Architecture (Revised)

Status: accepted (revised 2026-03-07)
Date: 2026-03-03
Original: PostgreSQL + Prisma
Revised: In-memory stateless

## Context

The A2A Server was originally designed with PostgreSQL for persistence. However, this added operational complexity:
- Database setup and maintenance
- Connection management
- Migration complexity
- Redis dependency for queues

The new design principle: **Server is completely stateless**.

## Decision

Use **in-memory storage only** - no database required.

### 1. Storage Architecture

**Server: Stateless**
- No persistent storage
- All data stored in memory only
- Data lost on restart (by design)
- No external dependencies

**Client API: File-based storage**
- Sessions stored in JSON files
- Projects configuration in local files
- State persists on client side

### 2. Core Services (In-Memory)

**Request Service:**
```typescript
// In-memory Map
const requests = new Map<string, RequestResult>();
```

**Message Service:**
```typescript
// In-memory Map
const messages = new Map<string, Message>();
```

**Client Repository:**
```typescript
// In-memory Map
const clients = new Map<string, Client>();
```

**Task Queue:**
```typescript
// Simple in-memory array
const queue: QueueJobData[] = [];
```

### 3. Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Web UI    │────▶│  Client API  │────▶│ a2a-server  │
│  (port 5173)│     │ (port 3001)  │     │ (port 3000) │
└─────────────┘     └──────────────┘     └─────────────┘
     │                    │                    │
     │                    │                    │
     │           ┌────────┴────────┐           │
     │           │  JSON files     │           │
     │           │  (sessions)     │           │
     │           └─────────────────┘           │
     │                                         │
     └─────────── State persisted here         │
                                               │
                          No storage here ────┘
```

### 4. Rationale

**Why Stateless?**
- Simpler deployment - just run `npm start`
- No database to configure or maintain
- No connection issues
- No migrations
- Horizontal scaling without database coordination
- Session state naturally belongs to client

**Where is state stored?**
- Client API (a2a-client) stores sessions in JSON files
- Web UI maintains UI state
- Server only processes, doesn't store

## Consequences

### Positive

- **Simplicity**: No database setup required
- **Reliability**: No database connection failures
- **Portability**: Run anywhere, no external deps
- **Speed**: In-memory operations are fast
- **Cost**: No database infrastructure needed

### Trade-offs

- **Data Loss**: Requests lost on server restart (acceptable for short-lived requests)
- **No Querying**: Can't query historical data on server (Client API handles this)
- **Single Instance**: Each request must complete on same server instance (no load balancing mid-request)

## Migration from Database

### Removed Components
- PostgreSQL database
- Prisma ORM
- Redis (for queues)
- Database migrations
- Connection pooling

### Updated Services
- `request.service.ts` - Map instead of Prisma
- `message.service.ts` - Map instead of Prisma
- `client.repository.ts` - Map instead of Prisma
- `request-queue.service.ts` - Array instead of BullMQ
- `database.ts` - No-op stub

### Package.json Changes
```json
// Removed:
- @prisma/client
- prisma
- pg
- @types/pg
- bullmq
- ioredis
```

## Environment Variables

**Before:**
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

**After:**
```
# No database variables needed
PORT=3000
JWT_SECRET=...
SKIP_AUTH=1
```

## Notes

- Server restart clears all pending requests
- Client API handles session persistence
- Queue is in-memory only (no persistence)
- Health check removed `/api/v1/health/database` endpoint
