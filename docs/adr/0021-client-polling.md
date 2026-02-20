# ADR 0021: Client polling

## Status

accepted

## Date

2026-02-20

## Context

Async-client must wait for request result. Polling interval and timeout.

## Decision

- `PromisePoller`: interval 5s, maxAttempts 720 (1h)
- `start(promiseId, { onComplete, onError, onStatus })`
- Poll `getRequestStatus`; on completed/failed → `getRequestResult`, stop
- `onStatus` called each poll for progress

## Consequences

- Matches server 5s processor interval
- 1h max wait; long tasks may need longer or streaming
