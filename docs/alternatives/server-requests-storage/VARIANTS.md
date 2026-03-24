# Server request artifact directory — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- **`REQUESTS_STORAGE_PATH`** overrides the default under **`storage/requests`** relative to server cwd (`a2a-server/src/services/core/request/request.service.ts`).

## Context

Stateless invoke still may **write request artifacts** for debugging or recovery. You choose default repo path vs external volume vs ephemeral (tmp) for privacy/ops.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `cwd-default` | `storage/requests` under cwd | No env; paths follow checkout. | Easy local inspection; gitignore. |
| `env-volume` | `REQUESTS_STORAGE_PATH` | Docker volume or fast disk. | Survives container replace if mounted. |
| `ephemeral` | Tmp or RAM disk | Point env to `/tmp/...` | Privacy; lost on reboot. |

## Current selection (this repo)

- [ ] `cwd-default`
- [ ] `env-volume`
- [ ] `ephemeral`

**Notes:**

## Implementation backlog

- [ ] Document retention / cleanup job if artifacts grow.

## Related

- `a2a-server/src/services/core/request/request.service.ts`

## Open questions

- …
