# ADR-0050: Intent Preservation Gate

## Status
**Proposed**  
**Date**: 2026-04-01  

## Decision
Record the active task intent in an `INTENT_LOCK` artifact for long-running processes. Before every major transition, the drift from the original intent is checked, ensuring the agent doesn't silently pivot entirely off-task.

---
