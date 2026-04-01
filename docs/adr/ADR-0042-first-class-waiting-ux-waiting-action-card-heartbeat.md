# ADR-0042: First-Class Waiting UX (Waiting Action Card & Heartbeat)

## Status
**Proposed**  
**Date**: 2026-04-01  
**Impact**: High | **Complexity**: Medium | **Risk**: Low  

## Context & Problem Statement
Currently, a paused or waiting agent is indistinguishable from a crashed or silently hanging agent. UI needs to compactly show why the agent paused, what is required to resume, and whether it is "thinking" or dead.

## Decision
1. Introduce **Waiting Action Card** in the UI to display pause reason, expiry timestamp, `required_inputs`, `resume_target`, and policy outcome.
2. Inject a **Heartbeat** `heartbeat_timestamp` into `WAITING_STATE`. This allows the UI to differentiate an active wait from a dead process.

## Consequences
- **Positive:** Operators never stare at dead sessions. Clear visualization of blocker conditions.

---
