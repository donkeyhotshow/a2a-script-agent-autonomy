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

- `ADR-0001-simulations-as-golden-standard.md` - simulations are the golden standard for comparing behavior across layers
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
