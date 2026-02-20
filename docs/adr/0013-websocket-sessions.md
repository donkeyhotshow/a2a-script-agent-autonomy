# ADR 0013: WebSocket for sessions

## Status

accepted

## Date

2026-02-20

## Context

Real-time updates for session-based flows. Options: polling, SSE, WebSocket.

## Decision

- `ws://host/ws/sessions/:sessionId?token=`
- Upgrade on HTTP server; path must start with `/ws/sessions/`
- `sessionId` + `token` required; invalid → socket destroyed
- `sessionConnections` Map: sessionId → Set<WebSocket>
- Ping/pong every 30s; `isAlive=false` → terminate
- `sendToSession(sessionId, message)` — broadcast to session clients

## Consequences

- Session-scoped; not used by stateless Requests API
- Token validation placeholder; full auth TBD
