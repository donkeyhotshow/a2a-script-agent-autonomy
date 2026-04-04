# ADR-0079: System Audit & Production Hardening Roadmap (2026-Q2)

**Status:** Approved | **Date:** 2026-04-04 | **Scope:** Production Readiness

## Context
Following the successful implementation of Phase 10 (A2A 2.0), a comprehensive system audit was conducted covering core architecture, observability, security, and developer experience. The audit identified 30+ gaps across 8 categories, ranging from critical production lacks (no CI/CD) to long-term research opportunities.

## Decision
We adopt a tiered roadmap for system hardening:
1.  **Immediate (Quick Wins)**: Address 7 high-impact, low-effort items within 4 hours.
2.  **Phase 11 (P0/P1)**: Production gaps including CI/CD, Auth, SSE Reconnect, and Redis Persistence.
3.  **Phase 12 (P2/P3)**: UX polish, Observability (Prometheus/Tracing), and Research functions.

### Quick Wins Selection:
- **ArtifactStore Auto-Purge**: Prevent memory leaks by automated TTL cleanup.
- **Evidence Chips Interactivity**: Enable clickable artifacts in UI for transparency.
- **PhaseStrip & WaitingCard UI**: Add elapsed timers and urgency countdowns.
- **PolicyEngine Compliance**: Formalize `POLICY_VIOLATION` artifact writing.
- **DX/CI**: Implement basic GitHub Actions and Server Hot-Reload.

## Proposed Implementation Plan (Quick Wins)

### 1. ArtifactStore Lifecycle
- **[MODIFY] [index.ts](file:///c:/Users/Administrator/Documents/dev/a/a2a-script-agent/a2a-server/src/index.ts)**: Add `setInterval` for `artifactStore.purgeExpired()`.

### 2. UI/UX Interactivity
- **[MODIFY] [EvidenceChip.tsx](file:///c:/Users/Administrator/Documents/dev/a/a2a-script-agent/a2a-client/packages/premium-ui/src/components/agent-console/evidence-chip.tsx)**: Add `onClick` handler via `nuqs`.
- **[MODIFY] [PhaseStrip.tsx](file:///c:/Users/Administrator/Documents/dev/a/a2a-script-agent/a2a-client/packages/premium-ui/src/components/agent-console/phase-strip.tsx)**: Add elapsed timer.
- **[MODIFY] [WaitingCard.tsx](file:///c:/Users/Administrator/Documents/dev/a/a2a-script-agent/a2a-client/packages/premium-ui/src/components/agent-console/waiting-card.tsx)**: Visual urgency indicators.

### 3. Policy & Compliance
- **[MODIFY] [policy-engine.ts](file:///c:/Users/Administrator/Documents/dev/a/a2a-script-agent/a2a-server/src/services/policy/policy-engine.ts)**: Write `POLICY_VIOLATION` artifact on block.

### 4. Infrastructure & DX
- **[NEW] [ci.yml](file:///c:/Users/Administrator/Documents/dev/a/a2a-script-agent/.github/workflows/ci.yml)**: Basic test/lint workflow.
- **[MODIFY] [package.json](file:///c:/Users/Administrator/Documents/dev/a/a2a-script-agent/a2a-server/package.json)**: Replace `node` with `tsx watch` for dev.

## Consequences
- **Positive**: Immediate boost in system stability and operator visibility (Quick Wins).
- **Positive**: Formalized roadmap for P0 security and persistence issues.
- **Negative**: Temporary increase in parallel internal requests (sidecar scored, metrics).
- **Risk**: Redis dependency introduction (for Phase 11 persistence) must be battle-tested.

## Compliance
- All quick wins must maintain `0 TS-ошибок`.
- New UI elements must follow "Lead Designer" SOTA aesthetics.
