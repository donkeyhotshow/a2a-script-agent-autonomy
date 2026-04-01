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

- Optional: align older dialog steps 2–4 prose style with script step headers; audit other sync sims for missing step MD where LLM audit matters.

## Verify

Use a2a-server sim check-md when running full doc audits.
