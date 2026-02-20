# ADR 0011: Timer-based request processor

## Status

accepted

## Date

2026-02-20

## Context

Process pending requests. Options: Bull/Redis queue, DB polling, event-driven.

## Decision

- `startRequestProcessor(intervalMs)` — setInterval every 5s (config)
- `getNextPending()` — `SELECT ... FOR UPDATE SKIP LOCKED`, one at a time
- Process: new_task→tasks, codeBlocks→graph, isGraphIncomplete→question
- No Bull, no Redis queue for requests

## Consequences

- Simple, no extra infra
- Single worker per instance; horizontal scaling needs distributed locking
- 5s latency between enqueue and start
