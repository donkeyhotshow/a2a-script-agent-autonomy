# ADR-0046: Structured Decision Packets & Idempotency Key

## Status
**Proposed**  
**Date**: 2026-04-01  

## Decision
1. Formalize the `DECISION_PACKET` contract containing `hypothesis`, `evidence`, `alternatives`, and `chosen_action` before any execution sequence.
2. Enforce a task-level **Idempotency Key** inside `EXECUTION_DECISION`. When retrying a task or recovering from a crash, the key guarantees the agent won't duplicate previously successful sub-steps.

---
