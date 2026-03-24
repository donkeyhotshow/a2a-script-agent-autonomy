# Client session persistence layout — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- Authoritative session reconstruction uses **step folders** under `a2a-client/storage/...` with `server-response.json`, `messages.json`, etc., as in `AGENTS.md` (Session Storage Format).

## Context

The **file-backed** Client API layout is fixed in code today, but you may plan **migrations** (DB, cloud KV) or **extra roots** (per-project storage). This doc captures **intent**, not only current code.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `filesystem-steps` | Current step dirs | Per-step artifacts on disk; KV JSON for UI state. | Implemented: `storage/sessions`, `storage/kv`. |
| `single-db` | DB rows per session | Postgres/SQLite replacing file IO. | Not primary in repo today; large migration. |
| `multi-root` | Per-project roots | Different base path per tenant or repo. | Env or config driven. |

### `filesystem-steps`

- **Use when:** Vite dev, local-first, easy inspection.
- **Cost / risk:** backup, concurrent writers, path length on Windows.
- **Status:** candidate

### `single-db`

- **Use when:** hosted multi-user Client API.
- **Cost / risk:** schema, migrations, backup strategy.
- **Status:** candidate

### `multi-root`

- **Use when:** monorepo with several workspaces on one machine.
- **Cost / risk:** path config in every tool.
- **Status:** candidate

## Current selection (this repo)

- [x] `filesystem-steps`
- [ ] `single-db`
- [ ] `multi-root`

**Where it applies:** local dev / CLI sessions

**Notes:**
- The repository still writes numbered step folders under `a2a-client/storage/...` (see `a2a-client/docs/SESSION-STORAGE.md`).

## Implementation backlog

- [ ] If moving off filesystem, add ADR + migration script outline.

## Related

- `AGENTS.md` (Session Storage Format)
- `a2a-client/docs/SESSION-STORAGE.md`
- `a2a-client/vite-plugin-a2a/`

## Open questions

- …
