# TypeScript ESM / NodeNext policy — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- **a2a-server/tsconfig.json** uses **module** and **moduleResolution** **NodeNext**, target **ES2022**. **AGENTS.md** requires **.js** extensions on path-alias imports for NodeNext.

## Context

Changing to bundler resolution or dropping **.js** suffixes breaks **tsx** / **node** without a compile step. Record whether the team stays on NodeNext or plans a bundler.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `nodenext` | Repo standard | Keep NodeNext and explicit **.js** in imports. | Current server layout. |
| `bundler` | Future | bundler resolution + build step for server. | Large migration. |
| `dual` | Rare | CJS + ESM split. | Only if dependencies force it. |

## Current selection (this repo)

- [x] `nodenext`
- [ ] `bundler`
- [ ] `dual`

**Notes:**
- `a2a-server/tsconfig.json` sets `module`/`moduleResolution` to `NodeNext`, so the `.js` suffix convention in `AGENTS.md` is required.

## Implementation backlog

- [ ] Any bundler experiment should update **AGENTS.md** in the same change set.

## Related

- **a2a-server/tsconfig.json**, **AGENTS.md** (Imports with Path Aliases)

## Open questions

- …
