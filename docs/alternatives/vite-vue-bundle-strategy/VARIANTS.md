# Vite + Vue bundle strategy — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- **`a2a-client/vite.config.js`**: **`esbuild.target` = `es2020`**; **`optimizeDeps.exclude`** and **`build.rollupOptions.external`** list **Vue** and **@vue-flow/** packages (load via script/CDN or runtime pattern — confirm against your HTML entry).

## Context

Externalizing Vue changes **how** the app is served (global vs bundled). This is a **build/architecture** choice, not runtime env.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `current-external-vue` | As in repo config | Vue and vue-flow not pre-bundled by Vite optimizer. | Matches existing `web/` script loading assumptions. |
| `full-bundle` | Remove externals | Single SPA bundle; typical Vite+Vue app. | Requires HTML/entry changes and import graph cleanup. |
| `prod-profile-separate` | `vite.config.prod.ts` | Different policy for production build vs dev. | Maintain two configs in sync. |

## Current selection (this repo)

- [ ] `current-external-vue`
- [ ] `full-bundle`
- [ ] `prod-profile-separate`

**Notes:**

## Implementation backlog

- [ ] If migrating to `full-bundle`, update deployment docs and cache headers.

## Related

- `a2a-client/vite.config.js`, `a2a-client/vite.config.prod.ts`
- `a2a-client/web/` HTML entry scripts

## Open questions

- …
