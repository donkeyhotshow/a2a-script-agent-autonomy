# Distill: `tests/proba-servera/**/error-report.md`

## Artifact

- **Paths:** `tests/proba-servera/*/error-report.md` — generated failure dumps (timestamp, expected vs actual diffs, often **hundreds of lines**).

## Why (Brown)

These are **run artifacts**, not golden fixtures. If committed, they **stale** the repo and look like intentional test data.

## Actions

1. **Add** a pattern to `.gitignore`, e.g. `tests/proba-servera/**/error-report.md` (or the whole folder’s reports if you prefer).
2. **Remove** tracked files from git history going forward (`git rm --cached` …) after team agreement.
3. **Keep** [`tests/proba-servera/README.md`](../../tests/proba-servera/README.md) / [`AUTHORING.md`](../../tests/proba-servera/AUTHORING.md) stating that reports are **local-only** unless checked in for a **pinned regression** (then name explicitly).

## Done when

CI and default dev runs do not commit churning `error-report.md` unless deliberately.
