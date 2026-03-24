# Standalone SDK HTTP limits and guards — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- **`a2a-client/packages/sdk/src/server/config/index.ts`** exposes toggles and numeric caps: **`ENABLE_CORS`**, **`ENABLE_RATE_LIMIT`**, **`RATE_LIMIT_*`**, **`MAX_FILE_SIZE`**, **`FS_MAX_READ_SIZE`**, **`FS_MAX_WRITE_SIZE`**, **`SESSION_TIMEOUT_MS`**, **`MAX_CONNECTIONS_PER_SESSION`**, terminal history limits, RAG chunk sizes, etc.

## Context

Loose defaults help **local dev**; **production** Client API needs stricter file sizes, rate limits, and timeouts. Pick a **profile** per deployment.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `dev-permissive` | Defaults as in code | Large files, rate limit on but generous. | Fast iteration; do not expose publicly. |
| `prod-strict` | Tight caps | Lower max file/read/write; shorter session timeout; stricter rate limit. | Requires tuning from traffic metrics. |
| `airgap-off` | Disable CORS rate limit | Only inside trusted network (rare). | Security review mandatory. |

## Current selection (this repo)

- [ ] `dev-permissive`
- [ ] `prod-strict`
- [ ] `airgap-off`

**Notes:**

## Implementation backlog

- [ ] Add `.env.example` block under `a2a-client/packages/sdk/` listing recommended prod values.

## Related

- `a2a-client/packages/sdk/src/server/config/index.ts`
- `docs/alternatives/client-api-deployment/VARIANTS.md`

## Open questions

- …
