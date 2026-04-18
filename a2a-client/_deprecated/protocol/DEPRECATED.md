# @a2a-client/protocol — DEPRECATED

**Moved:** `a2a-client/packages/protocol` → `a2a-client/_deprecated/protocol`
**Date:** 2026-04-18

## Reason

This package contained stub implementations of `a2a-invoke-builders.mjs` with
placeholder comments instead of real code.  There are zero runtime consumers:
no other package imports from `@a2a-client/protocol`.

The canonical implementations live in `@a2a-client/shared`
(`a2a-client/packages/shared/a2a-invoke-builders.mjs`).

## What was wrong

- Duplicated `@a2a-client/shared` without adding value.
- Stub functions threw or returned empty values.
- No imports → dead code increasing workspace surface area.

## What to reuse

None — `@a2a-client/shared` is the source of truth.

## How to correctly integrate

If a separate protocol package is ever needed, create it as a thin re-export
shim over `@a2a-client/shared` with explicit versioning, and register consumers
before adding to the workspace.
