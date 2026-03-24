# Server filesystem access scope — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- Handlers (**read-file**, **grep**, **edit-patch**, **command-execution**, etc.) build **allowed path prefixes** from **cwd**, **`/tmp`**, **`/var/tmp`**, and **`HOME`** (see `file-operations.ts`, `grep-search.ts`, `edit-patch.ts`, `command-execution.ts`).

## Context

This is a **soft sandbox**: anything that passes prefix checks can read/write under those roots. You choose **deployment cwd** (project root vs chroot) and whether to **tighten** policy for multi-tenant or public exposure.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `single-project-cwd` | Server cwd = one repo | Typical dev: access project + tmp + home. | HOME broad on developer laptops. |
| `locked-workspace` | cwd in container | Only mount customer workspace + minimal tmp. | Reduce HOME exposure in Docker. |
| `hardening-review` | Custom allowlist | Extend code with explicit roots per tenant. | Requires ADR + security review. |

## Current selection (this repo)

- [ ] `single-project-cwd`
- [ ] `locked-workspace`
- [ ] `hardening-review`

**Notes:**

## Implementation backlog

- [ ] If exposing server beyond localhost, document HOME/cwd implications in threat model.

## Related

- `a2a-server/src/actions/handlers/file-operations.ts`
- `a2a-server/src/actions/handlers/grep-search.ts`
- `a2a-server/src/actions/handlers/edit-patch.ts`
- `a2a-server/src/actions/handlers/command-execution.ts`

## Open questions

- …
