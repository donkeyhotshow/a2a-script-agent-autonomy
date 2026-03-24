# @a2a/rag consumption by a2a-server — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- Today `a2a-server` depends on **`"@a2a/rag": "file:../a2a-client/packages/rag"`** (`a2a-server/package.json`) — monorepo-local wiring.

## Context

You may keep **workspace file links** for fast iteration, publish **`@a2a/rag` to a registry**, or **vendor** a tarball. Each affects CI cache, reproducibility, and external contributors.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `file-workspace` | `file:../a2a-client/packages/rag` | Current shape; npm install from repo root or server dir must see sibling path. | Breaks if packages are split across repos without publish. |
| `registry-version` | semver on npm/private registry | Server pins `@a2a/rag@x.y.z`. | Requires release discipline. |
| `git-subpath` | `github:org/repo#path` (npm) | Middle ground when mono-repo published differently. | Tooling-specific. |

### `file-workspace`

- **Use when:** one clone, active RAG development.
- **Cost / risk:** path fragility in alternate checkout layouts.
- **Status:** candidate

### `registry-version`

- **Use when:** server shipped without full `a2a-client` tree.
- **Cost / risk:** version skew vs web packages.
- **Status:** candidate

### `git-subpath`

- **Use when:** partial open-source or submodule layouts.
- **Cost / risk:** install time, lockfile noise.
- **Status:** candidate

## Current selection (this repo)

- [ ] `file-workspace`
- [ ] `registry-version`
- [ ] `git-subpath`

**Notes:**

## Implementation backlog

- [ ] If moving to registry, add release checklist for `@a2a/rag` + server bump.

## Related

- `a2a-server/package.json`, `a2a-client/packages/rag/package.json`

## Open questions

- …
