# Distill: root `debug.log`

## Artifact

- **Path:** [`debug.log`](../../debug.log) at repository root.

## Why (Brown)

Runtime logs at repo root are **not** a source of truth; they bloat git and confuse reviewers.

## Actions

1. **Delete** the file or move contents to **`logs/archive/`** with a dated name if needed for an incident.
2. **Add** `debug.log` to `.gitignore` if tooling recreates it.
3. **Do not** re-commit large logs; use local-only or CI artifacts.

## Done when

Root `debug.log` is not tracked (or is empty and ignored).
