# A2A Server authentication — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- Production-style flows expect **`Authorization`** (Bearer / API patterns as implemented). `ENCRYPTION_KEY` (32 chars) and `JWT_SECRET` (≥32) are required for real crypto paths per `AGENTS.md` / tests.

## Context

Development often uses **`SKIP_AUTH=1`**; staging/prod must not. Choose **per environment** policies and how Client API forwards creds to the server.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `skip-auth-dev` | `SKIP_AUTH=1` | No auth on server; fastest local loop. | **Never** for exposed networks. |
| `jwt-full` | JWT + encryption | Normal secured server; Client API obtains/sends tokens. | Matches integration tests that set real secrets. |
| `split-env` | Strict prod, loose dev | CI uses secrets; laptops use `SKIP_AUTH`. | Most common hybrid. |

### `skip-auth-dev`

- **Use when:** localhost-only, rapid iteration.
- **Cost / risk:** easy to mis-deploy; prod tests must not rely on it alone.
- **Status:** candidate

### `jwt-full`

- **Use when:** shared dev cluster, staging, production.
- **Cost / risk:** token refresh, Client API config.
- **Status:** candidate

### `split-env`

- **Use when:** team norm: secure pipelines, loose desks.
- **Cost / risk:** document both; avoid “works on my machine” with wrong env.
- **Status:** candidate

## Current selection (this repo)

- [ ] `skip-auth-dev`
- [ ] `jwt-full`
- [ ] `split-env`

**Where it applies:** dev / CI / prod

**Notes:**

## Implementation backlog

- [ ] One-page env matrix: which services need which vars.

## Related

- `AGENTS.md` (SKIP_AUTH, JWT_SECRET, ENCRYPTION_KEY)
- `a2a-server/tests/setup.ts` (test defaults)
- `config/env-mapper.ts`

## Open questions

- …
