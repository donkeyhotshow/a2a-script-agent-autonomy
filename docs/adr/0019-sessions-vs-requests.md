# ADR 0019: Sessions vs Requests

## Status

accepted

## Date

2026-02-20

## Context

Two flows: session-based (projectId, WebSocket) and stateless Requests (project_path, polling).

## Decision

- **Sessions:** `projectId` (DB Project.id), CRUD, messages, WebSocket
- **Requests:** `project_path` (client path), no session, promiseId polling
- Sessions require `projectId`; Requests use `context.project_path`
- `/invoke`, `/message` → create Request (stateless)
- `/sessions` → Session CRUD (stateful, Prisma)

## Consequences

- Dual model; project_path ≠ projectId
- Sessions API may be for future full-stack flow; Requests is primary for agent
