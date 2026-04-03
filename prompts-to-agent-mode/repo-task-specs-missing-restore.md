# Task spec inventory

**Status:** all referenced `tasks/*.md` files now exist (April 2026). Re-run this checklist whenever the queue in `work/STATE.md` adds a new row that references `tasks/`; make sure the document at hand either points to a real file or intentionally notes why no spec is required.

## Restored / tracked specs

- `tasks/sync-readme-and-cli-gap.md` — documents CLI usage and README coverage for `simulations/sync` commands.
- `tasks/sync-step-contract-warnings.md` — keeps `sim:validate -- --step-contract` clean via passthrough transforms.
- `tasks/sync-form-choices-description.md` — ensures all `execute.form.choices` entries include `description` so router / UI buttons can render context.
- `tasks/analyze-test-failures.md` — captures the 41 failing `a2a-client` tests as configuration-only and defers code changes.
- `tasks/orchestrator-metrics-tracking.md` — describes the metrics script, runtime file, and instrumentation for the orchestrator daemon.

## Agent prompt (copy)

When new `tasks/*.md` references appear in `work/STATE.md`, add the missing file or update this inventory. If a reference is intentionally missing (e.g., `S2` is a checklist spread across docs), add a short note here explaining why no dedicated spec exists.

## Completion

- [x] Done (2026-04-03) — all referenced specs are present in `tasks/`
