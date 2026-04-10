# Stage Transition Criteria and Evidence

Updated: 2026-03-27
Owner: Stage governance (cross-module)

## Stage Model

The product maturity path is:

`prototype -> alpha -> beta -> release-candidate -> production`

This document tracks the transition criteria and aggregated evidence from module state files:

- `DEV_STATE.md` (root)
- `a2a-client/DEV_STATE.md`
- `a2a-server/DEV_STATE.md`
- `a2a-ai-hub/DEV_STATE.md`

## Transition Criteria

### alpha -> beta

Required:
- Core architecture is stable and documented in root + module states.
- Basic environment checks are documented for all active modules.
- Unit tests exist and run for client/server.
- Protocol invariants are documented (Action-Key Shape, state boundaries).

Evidence snapshot (2026-03-27):
- Root architecture and phased roadmap are documented in `DEV_STATE.md`.
- Client and server state files define architecture, endpoints, and test commands.
- Action-Key Shape and state governance are codified in root rules.

Status: PASS

### beta -> release-candidate

Required:
- Cross-module acceptance criteria are explicit and evidence-based.
- Client and server tests/simulations are green at "valid" baseline.
- Open risks are tracked per module with owners and executable next tasks.
- Stage readiness report exists and is updated with module evidence.

Evidence snapshot (2026-03-27):
- Root cross-module backlog exists and tracks governance tasks (`CM-*`) in `DEV_STATE.md`.
- `a2a-server/DEV_STATE.md` reports test + lint + simulation validity (unit tests, `sim:lint`, `sim:validate`).
- `a2a-client/DEV_STATE.md` tracks protocol alignment and contract-test backlog with explicit tasks.
- `a2a-ai-hub/DEV_STATE.md` is intentionally BLOCKED with explicit dependencies, reducing hidden coupling.
- This document provides the required cross-module readiness report.

Status: PASS (baseline `valid`, not yet `clean` warning-free)

### release-candidate -> production

Required:
- Quality gate upgraded from `valid` to `clean` (no warnings) where policy demands.
- Production env matrix is aligned and verified across all modules.
- Security/auth hardening tasks are closed (no dev-only bypass in production mode).
- E2E and operational checks pass for full chain.

Evidence snapshot (2026-03-27):
- Not yet satisfied; open tasks remain in root (`CM-02`, `CM-03`) and module backlogs.

Status: NOT READY

## Cross-Module Readiness Dashboard

| Area | Source | Current signal | Result |
|---|---|---|---|
| Architecture/state governance | `DEV_STATE.md` + module states | Source-of-truth boundaries documented | Green |
| Client protocol/read-model clarity | `a2a-client/DEV_STATE.md` | SC progress exists, contract tests still open | Yellow |
| Server stability and validation | `a2a-server/DEV_STATE.md` | Unit/lint/sim valid reported | Green |
| AI integration runtime readiness | `a2a-ai-hub/DEV_STATE.md` | Explicitly blocked pending upstream completion | Yellow |
| Cross-module transition reporting | This document + root CM-04 | Criteria + evidence now published | Green |

Legend: Green = meets current stage criteria, Yellow = known gap with tracked tasks, Red = blocking risk without owner.

## Governance Rule

Transition decisions must be based on aggregated evidence from all module state files, not on a single module report.

Minimum update cadence:
- On each stage decision.
- Or weekly while in `beta` / `release-candidate`.
