# ADR-0036: A2A Autonomous Agent Master Orchestration & Memory

## Status

**Proposed**  
**Date**: 2026-04-01  
**Author**: Alex Ribchinskiy  
**Reviewers**: [TBD]  
**Impact**: Critical | **Complexity**: High | **Risk**: Medium  
**Estimated Effort**: 10 weeks | **Priority**: P0 (blocks production autonomy)

---

## Context & Problem Statement

The current `a2a-script-agent` implements a **Gray Room Orchestrator** (`gray-room-orchestrator.ts`) with a basic interrupt loop and a static turn budget. This base loop lacks deterministic safety gating, memory-enriched planning, and autonomous lifecycle management. 

Beyond original memory/safety requirements, the **2026 Production Standards** demand:
1. **Living Specs**: Requirements that evolve alongside code.
2. **Multi-Agent Debate**: Architect/Reviewer patterns to eliminate bias.
3. **Registry-Based Scaling**: Moving beyond $N^2$ connectivity.
4. **Enterprise Guardrails**: Federated orchestration and tool trust states.

---

## Decision

Introduce a **phased implementation of the 38-feature Master Specification** extended with 2026 production enhancements.

### Target Implementation Roadmap (10 недель)

#### Phase 1 — Safety Signals (Weeks 1–2)
- **LoopDetector**: emit `LOOP_SIGNAL` on triple×3 repetition.
- **ConfidenceGate**: structural/semantic scoring; emit `CONFIDENCE_TRACE`.
- **Durable Waiting**: convert `clarify` into a checkpoint-backed `WAITING_STATE`.
- [ADR-0035](./ADR-0035-agentic-reasoning-safety-layer.md) integration.

#### Phase 2 — Memory & Integration (Weeks 3–4)
- **EpisodicStore**: index `EPISODIC_ENTRY`; query `EPISODIC_RECALL_RESULT`.
- **Lesson/Pattern Store**: detect recurring patterns; inject `MEMORY_INFLUENCE`.
- **Living Specs**: Implementation of [ADR-0037](./ADR-0037-living-specs-task-synthesis.md).

#### Phase 3 — Multi-Agent Autonomy (Weeks 5–8)
- **Supervisor Orchestrator**: Dynamic delegation per [ADR-0038](./ADR-0038-multi-agent-orchestrator.md).
- **Writer/Reviewer Pattern**: Session separation per [ADR-0040](./ADR-0040-writer-reviewer-pattern.md).
- **Donecriteria Gate**: Machine-verifiable validation blocking merge.
- **Auto-Branch Lifecycle**: Isolated delivery branches.

#### Phase 4 — Scale & Security (Weeks 9–10)
- **A2A Registry**: Stateless discovery per [ADR-0039](./ADR-0039-a2a-registry-layer.md).
- **Enterprise Guardrails**: Tool trust risk tiers and federated metrics.

---

## Consequences

### Positive
- **Reliability**: Living Specs and Reviewer Pattern eliminate logic drift and bias.
- **Scalability**: Registry-based discovery supports 100+ agents.
- **Safety**: Multi-level loop protection and confidence gating.

### Negative
- **Complexity**: Introduction of 38+ distinct artifact types.
- **Latency**: Additional agent "debates" (configurable thresholds).

---

## Related

- [A2A Master Specification](../../.agentLOGIC/A2A_Master_Specification_CLEAN.md) — Canonical reference.
- [ADR-0035: Safety](./ADR-0035-agentic-reasoning-safety-layer.md)
- [ADR-0037: Living Specs](./ADR-0037-living-specs-task-synthesis.md)
- [ADR-0038/0040: Multi-Agent](./ADR-0038-multi-agent-orchestrator.md)
- [ADR-0039: Registry](./ADR-0039-a2a-registry-layer.md)

---
*Version: 1.0 (Master) | Date: 2026-04-01*
