# GR-S-01: Gray Room Concept Boundary

## Problem
Need to fix gray room = series of planned LLM sub-requests executed on server after main step, without new client steps.

## Solution
1. Document that gray room is overlay on existing interrupt loop in DialogRequestProcessor
2. Clarify that it works only through `context.workbench`/`context.history` and follows Action-Key Shape
3. Add documentation to docs/GRAY-ROOM.md

## Where
- File: `a2a-server/docs/GRAY-ROOM.md`
- Implementation: `a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts`

## Verification
Check docs/GRAY-ROOM.md has concept boundary section.
