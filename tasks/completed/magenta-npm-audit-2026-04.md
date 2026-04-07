# Magenta follow-up — npm audit (2026-04-07) — **DONE**

## Outcome

| Location | `npm audit --omit=dev` (production) |
|----------|-------------------------------------|
| Repo root | 0 |
| `a2a-server/` | **0** — `package.json` **`overrides.tar`: `^7.5.13`** (transitive `tar` via `bcrypt` → `@mapbox/node-pre-gyp`) |
| `a2a-client/` | **0** — `packages/premium-ui`: **`react-syntax-highlighter` → `^16.1.1`** (pulls `refractor@5` + `prismjs@^1.30`); removed `@types/react-syntax-highlighter` (v16 ships types); fixed trailing comma in `pnpm.overrides` JSON |

## Dev-only / full audit

`npm audit` **without** `--omit=dev` may still report issues (e.g. `a2a-server` ESLint / Vitest / esbuild tree). Address separately if policy requires dev graph clean.

## Verification

- `cd a2a-server && npx vitest run tests/integration/sync-flow.test.ts` — pass (full suite may race on shared `storage/requests` if parallel tests collide).
- `cd a2a-client && npm test` — green after `shared/api-helpers.js` shim, ADR parse throw, embedding `dist` rebuild.

**Ref:** [`docs/PURPLE-ALERT-HARMFUL-HUNT.md`](../../docs/PURPLE-ALERT-HARMFUL-HUNT.md).
