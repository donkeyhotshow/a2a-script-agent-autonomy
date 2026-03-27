# GR-S-02: Gray Room Trigger Contract

## Problem
Need to describe how gray room is triggered: (a) explicit flag in context.execution, (b) policy for request types, (c) env toggles - should not break existing interrupt behavior without flag.

## Solution
1. Define trigger flags: flowControlHint: "gray-room" or context.execution.grayRoomRequested
2. Define env toggles: A2A_GRAY_ROOM_ENABLED, A2A_GRAY_ROOM_MAX_TURNS
3. Default off, backwards compatible

## Where
- File: `a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts`
- Config: `.env.example`

## Implementation
```typescript
// Check if gray room should run
const grayRoomEnabled = process.env.A2A_GRAY_ROOM_ENABLED === '1';
const flowControlHint = ctx.execution?.flowControlHint;

if (grayRoomEnabled || flowControlHint === 'gray-room') {
  // Run gray room loop
}
```

## Verification
```bash
# Test with disabled gray room
A2A_GRAY_ROOM_ENABLED=0 curl http://localhost:3000/api/v1/invoke

# Test with enabled
A2A_GRAY_ROOM_ENABLED=1 curl http://localhost:3000/api/v1/invoke
```
