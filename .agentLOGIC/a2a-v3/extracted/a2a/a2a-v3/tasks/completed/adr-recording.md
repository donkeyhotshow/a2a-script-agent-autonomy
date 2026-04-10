# Pending Task: Record Architecture Decisions (ADRs)

## Context
- Recent discussions produced several architectural insights that should be frozen in ADRs: action-key shape, port management, directory/extension standards, and shared protocol package.
- Keeping these decisions in ADRs keeps the repo's golden rules aligned with simulations, scripts, and refactoring plans.

## Steps
1. Draft ADR for action-key shape (current requirement referenced in AGENTS.md / PROTOCOL.md) with status "Accepted".
2. Draft ADR for port locking & port-manager script (scripts/port-manager.js, README section).
3. Draft ADR for extension/structure standards (REFACTORING_PLAN.md phase 1+2).
4. Draft ADR for protocol consolidation plan (@a2a/protocol, docs/actions/, config map).
5. Add entries to docs/adr/README.md index.

## Validation
- Each ADR must have Context, Decision, Consequences sections (plus related if helpful).
- README index must list the new ADR files with short descriptions.
- Notify via DEV_STATE that the ADR task is complete once files exist.
