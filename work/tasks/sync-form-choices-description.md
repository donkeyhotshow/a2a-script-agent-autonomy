# Sync simulations: `execute.form.choices` without `description`

**Status:** Fixed in listed `received.json` / `response.json` (2026-04-01). Optional sim-lint warning not implemented.

## Problem

`CLIENT-SDK-IDEAL.md` recommends each router/list choice include **`description`** (subtitle in UI). Several sync goldens omit it on at least one choice in **`response.json` and/or `received.json`**:

| Step | File(s) | Choice `id` (missing description) |
|------|---------|-----------------------------------|
| `agent-auto-ai/7` | `received.json` | `done` |
| `agent-coder-smart/5` | `received.json` | `proceed` |
| `fix-laravel-namespaces-and-uses/6` | `received.json` | `ok` |
| `fix-vue-imports/4` | `received.json` | `coder`, `fix-vue-imports-done-partial` |
| `fix-vue-imports-batched/1` | `received.json` | `fix-vue-imports-batched` |
| `fix-vue-imports-batched/7` | `response.json`, `received.json` | `done` |
| `fix-vue-imports-batched/8` | `received.json` | `done` |

`sim-lint` today only requires `id` or `value`; it does **not** warn on missing `description`.

## Done when

- [ ] Add non-empty `description` on every affected choice (keep `response.json` / `received.json` in sync for those steps).
- [ ] Optional: extend `lintExecuteStructure` in `a2a-server/scripts/sim-lint/registry.ts` with a **warning** when `choices[]` has items without `description` (may require baseline cleanup outside sync first).
