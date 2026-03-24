# Root config package (Zod) — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- **config/validateConfig()** maps env via **env-mapper.ts** and **appConfigSchema**. Error text mentions **docs/CONFIGURATION.md**; in-repo see **a2a-client/packages/sdk/CONFIGURATION.md** for SDK-oriented docs.

## Context

One validated env story for proxy-related settings vs each service reading **process.env** ad hoc.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `zod-first` | Config package leads | Change env here first; consumers use parsed config. | Less drift. |
| `layered` | Partial coverage | Config package for proxy only; Node services keep local env reads. | Simpler per service. |
| `generated-env` | Tooling writes .env | Validate then emit examples. | Extra automation. |

## Current selection (this repo)

- [ ] `zod-first`
- [ ] `layered`
- [ ] `generated-env`

**Notes:**

## Implementation backlog

- [ ] Point **CONFIGURATION.md** references to a single canonical file.

## Related

- **config/loader.ts**, **config/env-mapper.ts**
- **a2a-client/packages/sdk/CONFIGURATION.md**

## Open questions

- …
