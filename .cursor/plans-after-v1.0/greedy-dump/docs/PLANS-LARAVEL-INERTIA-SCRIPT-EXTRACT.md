# Plans extract: Laravel + Inertia script candidates

Purpose: preserve useful script-oriented action ideas from former `plans/` before removing that folder.

Source snapshots:
- `greedy-dump/mirror/plans/LARAVEL-11-ACTIONS-TABLE.md`
- `greedy-dump/mirror/plans/ACTIONS-TABLE.md`
- `greedy-dump/mirror/plans/PROJECT-CONTEXT-DETECTOR.md`

## Inertia (script)

From `LARAVEL-11-ACTIONS-TABLE.md`:
- `detect-inertia-useform-issues`
- `detect-inertia-router-issues`
- `detect-inertia-usepage-issues`
- `detect-inertia-preservestate-issues`
- `detect-inertia-props-validation`

From `ACTIONS-TABLE.md`:
- `validate-inertia-props`
- `generate-ts-types`
- `detect-unused-props`

## Laravel backend (script)

From `LARAVEL-11-ACTIONS-TABLE.md`:
- `detect-laravel-routes-js-mismatch`
- `detect-ziggy-usage-issues`
- `detect-validation-errors-handling`
- `detect-csrf-issues`
- `detect-n1-queries`
- `detect-missing-indexes`
- `detect-eloquent-select-all`
- `detect-missing-validation`
- `detect-weak-validation`
- `detect-mass-assignment-risk`
- `detect-missing-tests`
- `detect-test-coverage-gaps`
- `detect-missing-feature-tests`
- `detect-unused-routes`
- `detect-missing-middleware`
- `detect-route-groups`
- `detect-sync-should-be-queue`
- `detect-job-serialization-issues`
- `detect-missing-queue-middleware`

From `ACTIONS-TABLE.md`:
- `detect-n-plus-one`
- `analyze-controller-size`
- `detect-god-objects`

## Activation hints (detectors)

From `PROJECT-CONTEXT-DETECTOR.md` and `LARAVEL-11-ACTIONS-TABLE.md`:
- `composer.json:laravel/framework`
- `package.json:@inertiajs/vue3`
- `package.json:vue`
- `app/Http/Controllers/**/*.php`
- `resources/js/**/*.vue`

## Notes

- These are planning candidates, not implemented handlers.
- Implementable targets should be mapped to current server action shape and handler coverage in `a2a-server/src/actions/*`.
