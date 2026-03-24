# Express HTTP security profile — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- **`a2a-server/src/app.ts`**: **helmet** with **contentSecurityPolicy: false** and **crossOriginEmbedderPolicy: false**; **cors** with **origin: true** and **credentials: true**; **compression** enabled.

## Context

Convenient for **local dev** and arbitrary browser origins; **production** behind a gateway may still want stricter **CSP**, fixed **origin** allowlist, and COEP/COOP decisions.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `permissive-dev` | As in repo | Helmet relaxed; CORS reflects request Origin. | Matches current file. |
| `locked-origin` | Allowlist | `cors({ origin: ['https://app.example.com'] })`. | Breaks wrong-origin dev unless proxy injects Host. |
| `strict-csp` | Enable CSP | Turn on Helmet CSP; adjust for inline scripts in web if any. | May break legacy HTML unless nonced. |

## Current selection (this repo)

- [ ] `permissive-dev`
- [ ] `locked-origin`
- [ ] `strict-csp`

**Notes:**

## Implementation backlog

- [ ] Split middleware by **NODE_ENV** or feature flag if prod hardening proceeds.

## Related

- `a2a-server/src/app.ts`

## Open questions

- …
