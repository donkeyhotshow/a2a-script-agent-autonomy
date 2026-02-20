# ADR 0002: Stateless Requests API with polling

## Status

accepted

## Date

2026-02-20

## Context

Need async processing for requests that may take time (graph build, entity extraction). Client cannot hold a long-lived connection.

## Decision

- `POST /api/v1/requests` — create request, return `promiseId` (cuid)
- Client polls `GET /api/v1/requests/:promiseId/result` until `completed` or `failed`
- No server-side session; each request is independent
- PostgreSQL stores request state; RequestProcessor (timer, 5s) picks pending and processes

## Consequences

- Simple, scalable — no sticky sessions
- Client must poll; no push/WebSocket (yet)
- Result includes `outcome`, `question`, `context` (updated tasks)
