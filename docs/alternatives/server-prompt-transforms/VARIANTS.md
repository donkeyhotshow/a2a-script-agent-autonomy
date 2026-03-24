# Server prompt transform pipelines — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- Transform JSON lives under a directory discovered via **`PROMPTS_TRANSFORMS_PATH`** or defaults next to server cwd (`a2a-server/src/transform/pipeline.ts`, `dialog-request-processor.ts`).

## Context

You may ship **stock** transforms in-repo, point to a **fork**, or use a **read-only** vendor drop. Wrong path → LLM steps fail or use stale schemas.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `bundled-default` | Repo `a2a-server/prompts/transforms` | No env override; cwd is `a2a-server` when launched from package. | Typical clone workflow. |
| `env-override` | `PROMPTS_TRANSFORMS_PATH` | Absolute path to alternate tree (feature branch, A/B). | CI can inject golden-only set. |
| `multi-tenant` | Per-deploy path | Different directories per customer (set at process start). | Ops must secure path injection. |

### `bundled-default`

- **Use when:** single product, transforms version with server.
- **Cost / risk:** none if start scripts `cd` correctly.
- **Status:** candidate

### `env-override`

- **Use when:** experimenting with transform packs without branch swaps.
- **Cost / risk:** drift from git; document in runbooks.
- **Status:** candidate

### `multi-tenant`

- **Use when:** hosted multi-tenant with isolated prompt packs.
- **Cost / risk:** validation that paths cannot escape sandbox.
- **Status:** candidate

## Current selection (this repo)

- [ ] `bundled-default`
- [ ] `env-override`
- [ ] `multi-tenant`

**Notes:**

## Implementation backlog

- [ ] See `docs/plans/active/migrate-to-prompts-transforms.md` for migration notes.

## Related

- `a2a-server/src/transform/pipeline.ts`
- `a2a-server/src/services/core/request-processor/dialog-request-processor.ts`
- `docs/plans/active/migrate-to-prompts-transforms.md`

## Open questions

- …
