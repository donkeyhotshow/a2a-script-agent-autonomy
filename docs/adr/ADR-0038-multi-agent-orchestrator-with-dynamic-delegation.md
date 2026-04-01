# ADR-0038: Multi-Agent Orchestrator with Dynamic Delegation

## Status
**Proposed**  
**Date**: 2026-04-01  
**Author**: Alex Ribchinskiy  
**Impact**: Critical | **Complexity**: High | **Risk**: Medium  

---

## Context & Problem Statement
A single-entry orchestrator (`gray-room-orchestrator.ts`) can become a bottleneck and is prone to "bias" when it reviews its own work. Production-grade autonomy in 2026 requires a "debate" pattern where different specialized agents challenge designs and implementations.

## Decision
Transition the `OpportunityDetector` into a **Supervisor Orchestrator** that dynamically delegates sub-tasks to specialized agents.

### Specialized Agents
1. **Architect Agent**: Proposes design changes based on the Living Spec.
2. **Implementer Agent**: Executes the changes in an isolated worktree.
3. **Reviewer Agent**: Validates the implementation against the Architect's design and the Living Spec.
4. **MetaAgent**: Resolves conflicts and builds consensus between the Architect and Reviewer.

### Dynamic Workflow
- The Orchestrator uses **Dynamic Worktrees** to run multiple implementation attempts in parallel if the Reviewer consistently rejects the output.

## Consequences
- **Positive**: Parallel execution, significantly higher code quality (+30%), reduction in agent bias (-80%).
- **Negative**: Increased LLM token usage and system complexity.

---
*Reference: [dev.to/ridwan_sassman_3d07/the-2026-architects-dilemma-orchestrating-ai-agents-not-writing-code-the-paradigm-shift-from-219c](https://dev.to/ridwan_sassman_3d07/the-2026-architects-dilemma-orchestrating-ai-agents-not-writing-code-the-paradigm-shift-from-219c)*


---
