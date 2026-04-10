# Tester Integration (Current Scope)

Integration testing focuses on one flow only:

1. Submit user/tool input
2. Observe ack-first response
3. Poll async if pending
4. Verify finalized session rebuild

## Integration Sequence

1. Create session (`POST /api/a2a/sessions`)
2. Send turn (`POST /api/a2a/sessions/{id}/next`)
3. If `asyncPending=true`, poll (`GET /api/a2a/sessions/{id}/async`)
4. Read session (`GET /api/a2a/sessions/{id}`)
5. Verify step artifacts on disk

## Red-Room Sequence

1. Session state includes tool `execute`
2. Client/test harness submits tool result as next turn
3. Server finalizes next step via normal lifecycle
4. Session reflects the completed red-room step

## Pass Conditions

- No artifact gaps between turns
- No stale session state after async completion
- Reload-safe recovery from persisted step files
