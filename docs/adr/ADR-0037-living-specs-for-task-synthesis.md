# ADR-0037: Living Specs for Task Synthesis

## Status

**Proposed**  
**Date**: 2026-04-01  
**Author**: Alex Ribchinskiy  
**Impact**: High | **Complexity**: Medium | **Risk**: Low  

---

---

## Context & Problem Statement

Static specifications in `task.md` or `.agentLOGIC/` tend to drift during multi-file, multi-step agent executions. An agent might complete 80% of a task but fail on the last 20% because the original spec didn't account for emergent architectural constraints discovered mid-run.

## Decision

Implement **Living Specs** using a machine-readable `OpenSpec` format. The specification is no longer a static text file; it is an evolving artifact handled by the `TaskSynthesizer`.

### Key Components
1. **OpenSpec Format**:
   - `SHALL` requirements → converted to runtime assertions.
   - `GIVEN/WHEN/THEN` → mapped to automated validation tests.
   - `Design Decisions` → numbered and referenced in every `EXECUTION_DECISION`.
2. **Self-Updating Loop**:
   - As the agent performs `SCAN` and `REFLECT` cycles, it updates the `LivingSpec` artifact to reflect discovered constraints or refined goals.
   - Major spec changes trigger a mandatory **Confidence Gate** check.

## Consequences
- **Positive**: Reliability increase (+40%), rework reduction (-60%), 100% traceability from requirement to code.
- **Negative**: Requires a more complex `TaskSynthesizer` capable of managing stateful specifications.

---
*Reference: [vanja.io/spec-driven-agentic-development/](https://vanja.io/spec-driven-agentic-development/)*


---
