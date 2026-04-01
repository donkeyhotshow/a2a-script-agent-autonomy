# ADRs (Architecture Decision Records)

This directory contains project-level Architecture Decision Records.

## Why

We use ADRs to record decisions that affect multiple layers (web, client api, server, ai hub) so that:

- future changes can be evaluated against agreed constraints
- simulations and tooling can enforce the decisions
- contributors have a single place to discover "why" something is built this way

## Format

Each ADR is a Markdown file:

- `ADR-0001-...md`
- `Status`: proposed | accepted | deprecated | superseded

Recommended sections:

- Context
- Decision
- Consequences
- Notes / Follow-ups

## Index

- `ADR-0001-simulations-as-golden-standard.md` - simulations are the golden standard for comparing behavior across layers (see also ADR-0020)
- `ADR-0012-session-state-unification.md` - Unified SessionStore as single source of truth vs distributed state
- `ADR-0013-unified-transport-layer.md` - Unified transport layer with synchronous HTTP requests and fallback handling
- `ADR-0014-transport-fallback-mechanisms.md` - Automatic failover logic and reconnection strategies
- `ADR-0015-message-ordering-guarantees.md` - Ensuring event ordering in real-time communications
- `ADR-0016-promise-queue-architecture.md` - Asynchronous task processing with daemon workers
- `ADR-0017-promise-daemon-deployment.md` - How/where promise daemons are deployed and managed
- `ADR-0018-promise-state-synchronization.md` - State consistency across distributed promise workers
- `ADR-0019-multi-level-testing-pipeline.md` - AI Integration → Server → Client → Web UI testing approach
- `ADR-0020-simulation-golden-standard.md` - Using simulations as testing baseline
- `ADR-0021-cross-browser-testing-matrix.md` - Browser compatibility and testing coverage
- `ADR-0022-error-recovery-patterns.md` - Comprehensive error handling and recovery strategies
- `ADR-0023-connection-resilience.md` - Handling network failures and reconnections
- `ADR-0024-graceful-degradation.md` - System behavior when components fail
- `ADR-0025-decouple-promise-from-ui.md` - Reduce Web UI coupling to promiseId; session-scoped async polling
- `ADR-0026-server-llm-request-prep.md` - Fold `result` into `context.history` and attach `flowControlHint` before LLM `request.md`
- `ADR-0027-documentation-canonical-sources.md` - Single source of truth per topic; link-first docs; stable anchors
- `ADR-0028-client-api-deployment-modes.md` - Vite `/api/a2a` on 5173 vs standalone SDK Client API (e.g. 3001); same server contract
- `ADR-0029-server-interrupt-loop.md` - Optional extra LLM turns after response transform (`interrupt` on `$out`); client sees final result only
- `ADR-0030-unified-agent-mode.md` - Unified Agent mode replacing multiple LLM pipeline actions (golden dirs: `agent-analyze`, `agent-coder`, `agent-auto-ai`, etc.)
- `ADR-0031-action-key-shape.md` - Enforce action-key shape for every `execute`/`result` across server, client, simulations, and scripts
- `ADR-0032-port-management-execution.md` - Standardize dynamic port allocation, locking, conflict detection, and cleanup via `scripts/port-manager.js`
- `ADR-0033-standard-extensions-structure.md` - Plan for single-extension sources, consistent handler/service naming, and cleaned server directories per the refactoring plan
- `ADR-0034-protocol-consolidation.md` - Propose `@a2a/protocol`, canonical docs/actions layout, and a config map to consolidate shared types
- `ADR-0035-agentic-reasoning-safety-layer.md` - Safety Layer inside GrayRoomOrchestrator: LoopDetector (triple×3), ContextValidator (SHA256), ConfidenceTracer (LLM gate) to raise session success rate ≥85%
- `ADR-0036-autonomous-agent-memory-orchestration.md` - A2A Autonomous Agent Master Orchestration & Memory (38 feature contracts + 2026 improvements)
- `ADR-0037-living-specs-task-synthesis.md` - Living Specs for Task Synthesis: machine-verifiable requirements that evolve with the agent
- `ADR-0038-multi-agent-orchestrator.md` - Multi-Agent Orchestrator: Dynamic delegation to Architect/Implementer/Reviewer specialized agents
- `ADR-0039-a2a-registry-layer.md` - A2A Registry Layer: Stateless worker discovery and routing to scale beyond N² connectivity
- `ADR-0040-writer-reviewer-pattern.md` - Writer/Reviewer Pattern: Strict session-level separation to eliminate confirmation bias
- `ADR-0041-comprehensive-architectural-improvements.md` - 15 Comprehensive Architectural Improvements for A2A-Script-Agent (Multi-Agent Memory, PolicyGuard, DX)

## Tooling: ADR compliance via Client API

To **stress the live stack** (not only sims/unit tests), an orchestrator can drive the same **Client API** as the UI (`POST /sessions`, `POST /sessions/{id}/next`, `GET /sessions/{id}/async`) with tasks like “align code with ADR-00xx.”

Use a **separate state file** (curated ADR **queue**, current ADR, **per-ADR phase/progress**, completed set) keyed to **one target project** — do not rescan the whole ADR directory every run or rely on session JSON alone for long queues. Full contract: [`methodology/adr-compliance-orchestrator.md`](../../methodology/adr-compliance-orchestrator.md).

## Related (not ADRs)

- **[`a2a-server/docs/EXTENDING-LLM-ACTIONS.md`](../../a2a-server/docs/EXTENDING-LLM-ACTIONS.md)** — operational playbook for prompts, transforms, and simulations (use before filing an ADR when the change is routine).

## Adding a new ADR

1. Use the next free number: **`ADR-0036-...md`** (keep zero-padding).
2. Set **Status** (`proposed` → `accepted`) and **Date**.
3. Include **Context**, **Decision**, **Consequences** (and **Related** / **Notes** if useful).
4. Add one line to the **Index** above with a short description.
5. If the decision moves normative detail out of [`AGENTS.md`](../../AGENTS.md) or [`docs/new-request-flow/PROTOCOL.md`](../new-request-flow/PROTOCOL.md), update those files in the same change set.
