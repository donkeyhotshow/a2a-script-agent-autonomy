# S11 — request.md and response.md coverage in sync

**Status:** done for `simulations/sync/**` (2026-04-03); optional async audit remains.  
**Tracked in:** [`work/STATE.md`](../work/STATE.md) (row S11)

## Goal

More sync steps ship Markdown mirrors of JSON fixtures so prompt pipeline audits stay aligned (see simulations SERVER-CONTRACT gap notes).

## Done this pass

- `simulations/sync/script/1`–`10`: each step has `request.md` + `response.md` (first JSON fence = sibling `.json`).
- `simulations/sync/script/4/request.md` (earlier pass).
- `simulations/sync/dialog/1/request.md`, `response.md` (was the only numbered dialog step without MD mirrors).

## Done (full sync tree, 2026-04-03)

- Every step under `simulations/sync/**` with `request.json` now has `request.md` + `response.md` (first fenced `json` block = sibling `.json`). Regenerator: [`scripts/gen-sim-md-mirrors.mjs`](../scripts/gen-sim-md-mirrors.mjs).
- Drift cleanup: `cd a2a-server && npm run sim:check-md -- --fix` (19 pre-existing `script-agent-dialog` / `dialog` / `dialog-interrupt` / `script/1` fences).
- Verify: `cd a2a-server && npm run sim:check-md -- --fail` — clean.

## Backlog

- **`simulations/async/**`:** `async/promise-lifecycle/1`–`3` have `request.md` + `response.md` (2026-04-03); generator [`scripts/gen-sim-md-mirrors.mjs`](../scripts/gen-sim-md-mirrors.mjs) now scans `sync` + `async`. Re-run when new async step dirs appear.

## Done (small dialog / gray-room)

- `sync/dialog-message-only/1` — `request.md` + `response.md`
- `sync/gray-room-hook/1` — `request.md` + `response.md`

## Done (dialog)

- `sync/dialog/2`–`4` `request.md` headers aligned with `sync/dialog/1` / `sync/script/*` (mirror + `sim:check-md`); `description.md` tree path `simulations/sync/dialog/`.
- `sync/dialog/2/response.md` — repaired to mirror `response.json` (was stray `["dialog", …]` text, not a fixture fence).
- `sync/invoke-form-confirmation/1`, `sync/invoke-simulation-record/1` — `request.md` + `response.md`.
- `sync/orchestrator-dialog/1`–`4` — `request.md` + `response.md`.
- `sync/resilience-contract/1`–`6` — `request.md` + `response.md`.

## Verify

Use a2a-server sim check-md when running full doc audits.
