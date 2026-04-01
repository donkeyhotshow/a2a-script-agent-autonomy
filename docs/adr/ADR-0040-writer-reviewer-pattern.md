# ADR-0040: Writer/Reviewer Pattern for Session Integrity

## Status
**Proposed**  
**Date**: 2026-04-01  
**Author**: Alex Ribchinskiy  
**Impact**: Medium | **Complexity**: Low | **Risk**: Low  

---

## Context & Problem Statement
When the same agent session performs both the coding and the verification, it often ignores subtle bugs due to "confirmation bias." 

## Decision
Enforce a strict **Writer/Reviewer Pattern** at the session level.

### Implementation
1. **Writer Session**: Focuses on code generation and local unit tests.
2. **Reviewer Session**: Operates in a **Fresh Context** (no access to the Writer's internal thinking trace). It only sees the resulting code and the Living Spec.
3. **Feedback Loop**: Reviewer's findings are passed back to the Writer for a **Fix Session**. Execution only proceeds to the Validation Gate once the Reviewer issues a `PASS` signal.

## Consequences
- **Positive**: Bias reduction (-80%), significant increase in production-ready code quality.
- **Negative**: Adds 1-2 additional LLM calls per sub-task.

---
*Reference: [alexlavaee.me/blog/new-sdlc-agentic-engineering/](https://alexlavaee.me/blog/new-sdlc-agentic-engineering/)*
