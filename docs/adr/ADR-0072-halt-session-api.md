# ADR-0072: Halt/Delete Session API

## Status
Approved

## Context
In a production environment, operators need the ability to immediately stop runaway agents or zombie sessions that are wasting compute or performing unwanted actions. The current API lacks a formal "kill switch" for active sessions.

## Decision
Add a standard `DELETE /api/a2a/sessions/:id/halt` endpoint to the Client API. This endpoint will trigger a graceful but immediate stop of the underlying `GrayRoomOrchestrator` loop for that session and mark the session as interrupted.

## Implementation
1. **Client API**: Add `DELETE` route in `session-routes.js`.
2. **Server**: Implement `RequestProcessorService.haltSession(sessionId)`.
3. **Orchestrator**: Use an `AbortController` or cancellation token inside the `runLoop`.

## Consequences
- Enhanced operator control and safety.
- Prevention of resource exhaustion by runaway agents.
