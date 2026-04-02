# Sync form-choice descriptions maintenance

## Sources

- [`tasks/sync-form-choices-description.md`](../tasks/sync-form-choices-description.md)
- [`shared/router-static-choices.json`](../shared/router-static-choices.json)
- [`simulations/sync` responses that include `form.choices`](../simulations/sync)
- [`work/STATE.md`](../work/STATE.md) — row S13

## Agent prompt (copy)

Every router-like `execute.form` in `simulations/sync` needs a clear `label` and `description` (no empty strings, please) so the fixed set of `shared/router-static-choices.json` IDs stays accurate and the UI can render the choices the same way it would for real agent interactions. Re-run `npm run sim:check-md -- --all` or `sim:lint` to confirm no schema warnings.

## Completion

- [x] Done (all `form.choices` entries now include `description`; `sim:check-md` / `sim:lint` clean)
