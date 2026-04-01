# ADR-0049: Negative Memory & Semantic Error Split

## Status
**Proposed**  
**Date**: 2026-04-01  

## Decision
1. Store rejected strategies along with failure reasons in `REJECTED_PATH_ENTRY` inside `MEMORY_INFLUENCE`.
2. Institute a **Transient vs Semantic error split** in `SELF_CORRECTION`:
   - *Transient errors* (network, timeout) → Infrastructure Retry with exponential backoff.
   - *Semantic errors* (logic flaw, test failure) → Algorithmic `BACKTRACK → SWITCH → REFINE`.

---
