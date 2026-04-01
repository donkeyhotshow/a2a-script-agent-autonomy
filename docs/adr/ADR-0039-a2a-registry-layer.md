# ADR-0039: A2A Registry Layer for Scale

## Status
**Proposed**  
**Date**: 2026-04-01  
**Author**: Alex Ribchinskiy  
**Impact**: High | **Complexity**: Medium | **Risk**: Low  

---

## Context & Problem Statement
Direct peer-to-peer connections between agents lead to $N^2$ connectivity issues as the network grows. Managing 100+ agents with point-to-point communication is unsustainable.

## Decision
Introduce an **A2A Registry Layer** that acts as a lookup and routing service for all agents in the cluster.

### Key Features
1. **Agent Discovery**: Agents register their capabilities and stateless endpoints in the Registry.
2. **Stateless Workers**: Agents no longer maintain long-lived peer connections; they request a worker from the registry for a specific `session_id`.
3. **Unified Protocol**: All communication must strictly follow A2A Protocol v2.0 (canonical message headers and payload structures).

## Consequences
- **Positive**: Scalability to 100+ agents, centralized observability of agent health, and simplified networking.
- **Negative**: Adds a central point of failure (mitigated by Registry clustering).

---
*Reference: [onereach.ai/blog/what-is-a2a-agent-to-agent-protocol/](https://onereach.ai/blog/what-is-a2a-agent-to-agent-protocol/)*
