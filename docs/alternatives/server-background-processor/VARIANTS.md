# Background request processor timer — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- **`startRequestProcessor`** uses **`REQUEST_PROCESSOR_INTERVAL_MS`** from **`a2a-server/src/config/index.ts`** (default **5000**, clamped 100–60000). Wired in **`src/index.ts`** at bootstrap.

## Context

The daemon polls or ticks work on an interval. Shorter = more responsive queue drain and CPU; longer = quieter logs and less contention.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `default-5s` | 5000 ms | Balanced default in config schema. | Good starting point. |
| `aggressive-1s` | Near minimum | Faster backlog processing. | Validate under load. |
| `relaxed-30s` | High interval | Low background churn. | May delay async cleanup paths. |

## Current selection (this repo)

- [x] `default-5s`
- [ ] `aggressive-1s`
- [ ] `relaxed-30s`

**REQUEST_PROCESSOR_INTERVAL_MS** value:

**Notes:**
- `configSchema` defaults `REQUEST_PROCESSOR_INTERVAL_MS` to 5000 ms, so the daemon ticks at 5 s intervals today.

## Implementation backlog

- [ ] Document interaction with AI Hub promise completion (if any coupling).

## Related

- `a2a-server/src/config/index.ts`, `a2a-server/src/index.ts`
- `a2a-server/src/daemon/request-processor-daemon.ts`
- `a2a-server/src/services/core/request-processor/request-processor.service.ts`

## Open questions

- …
