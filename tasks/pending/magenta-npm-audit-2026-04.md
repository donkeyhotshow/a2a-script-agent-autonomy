# Magenta follow-up — npm audit (2026-04-07)

**Goal:** Clear reported production-dependency advisories in workspace packages without breaking CI.

## Baseline (as of run)

| Location | `npm audit --omit=dev` |
|----------|-------------------------|
| Repo root | 0 |
| `a2a-server/` | 7 (incl. critical: handlebars, simple-git) |
| `a2a-client/` | 8 (incl. high: vite/vitest tree, undici, flatted, picomatch; prismjs via react-syntax-highlighter may need `--force`) |

## Steps

1. In each directory: `npm audit fix` (no `--force` first).
2. Run `cd a2a-server && npm run test` and `cd a2a-client && npm test` (or repo `npm run test:before-start` if appropriate).
3. For remaining issues, bump direct dependencies or replace packages; document any accepted risk in `DEV_STATE.md` with advisory IDs.
4. Re-run `npm audit --omit=dev` until clean or explicitly waived.

**Ref:** [`docs/PURPLE-ALERT-HARMFUL-HUNT.md`](../../docs/PURPLE-ALERT-HARMFUL-HUNT.md) *Last run log*.
