# S11 — request.md and response.md coverage in sync

**Status:** partial  
**Tracked in:** [`work/STATE.md`](../work/STATE.md) (row S11)

## Goal

More sync steps ship Markdown mirrors of JSON fixtures so prompt pipeline audits stay aligned (see simulations SERVER-CONTRACT gap notes).

## Done this pass

- `simulations/sync/script/1`–`10`: each step has `request.md` + `response.md` (first JSON fence = sibling `.json`).
- `simulations/sync/script/4/request.md` (earlier pass).
- `simulations/sync/dialog/1/request.md`, `response.md` (was the only numbered dialog step without MD mirrors).

## Backlog

- Optional: audit remaining sync sims for missing `request.md` / `response.md` (many `agent-*`, `fix-*`, `resilience-contract`, etc. still lack mirrors — see repo-wide search vs `request.json`).

## Done (dialog)

- `sync/dialog/2`–`4` `request.md` headers aligned with `sync/dialog/1` / `sync/script/*` (mirror + `sim:check-md`); `description.md` tree path `simulations/sync/dialog/`.
- `sync/dialog/2/response.md` — repaired to mirror `response.json` (was stray `["dialog", …]` text, not a fixture fence).
- `sync/invoke-form-confirmation/1`, `sync/invoke-simulation-record/1` — `request.md` + `response.md`.
- `sync/orchestrator-dialog/1`–`4` — `request.md` + `response.md`.
- `sync/resilience-contract/1`–`6` — `request.md` + `response.md`.

## Verify

Use a2a-server sim check-md when running full doc audits.
