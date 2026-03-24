# LLM pipeline modes (router handoff) — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- **`LLM_PIPELINE_ACTIONS`** in **`request-processor.service.ts`** lists modes that count as **dialog** processing and accept **router** **`result.choice`**: **dialog**, **agent**, **task-decomposition**. Must stay aligned with **`ACTION_TO_SCHEMA`** in **dialog-request-processor.ts**.

## Context

Product teams may **ship a subset** of modes in the UI, keep others for internal sims, or **fork** schemas per mode. Removing a mode requires router choices + transforms + sims to stay consistent.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `full-catalog` | All listed actions | Maximum flexibility; more maintenance. | Current code allows full set. |
| `minimal-prod` | dialog + one coder path | Smaller attack surface and doc load. | Trim router form choices accordingly. |
| `staged-rollout` | Env/feature flags | Enable agent variants only in beta. | Enable specific agent-* variants in beta (agent-analyze, agent-coder, etc.). Needs wiring in UI + server gates. |

## Current selection (this repo)

- [x] `full-catalog`
- [ ] `minimal-prod`
- [ ] `staged-rollout`

**Modes enabled in UI:** dialog, agent, task-decomposition

**Notes:**
- `LLM_PIPELINE_ACTIONS` in `request-processor.service.ts` enumerates every router mode, so the default is the full catalog today.

## Implementation backlog

- [ ] Single source of truth export shared by web router and server (optional refactor).

## Related

- `a2a-server/src/services/core/request-processor/request-processor.service.ts`
- `a2a-server/src/services/core/request-processor/dialog-request-processor.ts`
- `simulations/CLIENT-SDK-IDEAL.md` (router choices)

## Open questions

- …
