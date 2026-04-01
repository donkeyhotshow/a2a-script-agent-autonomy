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
- [ADR-0035](#adr-0035-agentic-reasoning-safety-layer) integration.

#### Phase 2 — Memory & Integration (Weeks 3–4)
- **EpisodicStore**: index `EPISODIC_ENTRY`; query `EPISODIC_RECALL_RESULT`.
- **Lesson/Pattern Store**: detect recurring patterns; inject `MEMORY_INFLUENCE`.
- **Living Specs**: Implementation of [ADR-0037](#adr-0037-living-specs-for-task-synthesis).

#### Phase 3 — Multi-Agent Autonomy (Weeks 5–8)
- **Supervisor Orchestrator**: Dynamic delegation per [ADR-0038](#adr-0038-multi-agent-orchestrator-with-dynamic-delegation).
- **Writer/Reviewer Pattern**: Session separation per [ADR-0040](#adr-0040-writerreviewer-pattern-for-session-integrity).
- **Donecriteria Gate**: Machine-verifiable validation blocking merge.
- **Auto-Branch Lifecycle**: Isolated delivery branches.

#### Phase 4 — Scale & Security (Weeks 9–10)
- **A2A Registry**: Stateless discovery per [ADR-0039](#adr-0039-a2a-registry-layer-for-scale).
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

- [A2A Master Specification](./REFERENCE-A2A-master-specification.md) — canonical reference (feature contracts + audit table).
- [ADR-0035: Safety](#adr-0035-agentic-reasoning-safety-layer)
- [ADR-0037: Living Specs](#adr-0037-living-specs-for-task-synthesis)
- [ADR-0038/0040: Multi-Agent](#adr-0038-multi-agent-orchestrator-with-dynamic-delegation)
- [ADR-0039: Registry](#adr-0039-a2a-registry-layer-for-scale)

---
*Version: 1.0 (Master) | Date: 2026-04-01*


---
