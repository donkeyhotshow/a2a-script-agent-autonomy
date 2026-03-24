# Server-side LLM hub polling — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- `a2a-server/src/daemon/llm-hub-poll.ts` uses **`LLM_POLL_INTERVAL_MS`** / **`LLM_POLL_TIMEOUT_MS`**, falling back to **`POLL_INTERVAL_MS`** / **`POLL_TIMEOUT_MS`**. Values are clamped (interval max 120s cap in helper).

## Context

Separate from Python proxy tuning: this is **Node** polling AI Hub until a promise is ready. Aggressive polling loads the hub; slow polling increases perceived latency.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `defaults` | Env unset | 2s interval typical from `POLL_INTERVAL_MS`; long default timeout. | Matches `.env.example` spirit. |
| `fast-dev` | Lower interval | Quicker UI feedback; more HTTP chatter. | Watch hub CPU. |
| `slow-stable` | Higher interval | Less load; slower updates. | Good on constrained CI against real hub. |

## Current selection (this repo)

- [ ] `defaults`
- [ ] `fast-dev`
- [ ] `slow-stable`

**Concrete values (optional):**

**Notes:**

## Implementation backlog

- [ ] Cross-link with `docs/alternatives/ai-proxy-env-tuning/VARIANTS.md` so two layers are not tuned in conflict.

## Related

- `a2a-server/src/daemon/llm-hub-poll.ts`
- `docs/alternatives/upstream-service-urls/VARIANTS.md`

## Open questions

- …
