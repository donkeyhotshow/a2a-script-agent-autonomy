# ADR 0016: BullMQ planned, not implemented

## Status

proposed

## Date

2026-02-20

## Context

Queue for indexing, tasks, webhooks. Request processor uses DB polling.

## Decision

- `queue/index.ts`: BullMQ stubs — `INDEXING`, `TASKS`, `WEBHOOKS` queues
- `initQueues()`, `addJob()`, `getQueueStats()` — all throw "not implemented"
- Request processing: timer + `getNextPending()` (no Bull)
- Config: `queueConcurrency`, `indexingConcurrency`

## Consequences

- Indexing workers, task workers not active
- Request flow independent of queue
