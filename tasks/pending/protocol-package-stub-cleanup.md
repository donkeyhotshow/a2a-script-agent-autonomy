# Protocol package stub cleanup

## Status
P1 — hygiene / tech-debt

## Problem

`a2a-client/packages/protocol/src/a2a-invoke-builders.mjs` contains stub implementations with placeholder comments (`// ... implementation based on unwrap`, `// ... merge logic`, `// ... sanitize`) instead of real code. The package is registered in the workspace (`@a2a-client/protocol`) and exports these stubs, but no other package currently imports from `@a2a-client/protocol`.

## Root cause

The protocol package appears to be an unmaintained duplicate of `@a2a-client/shared`. The canonical implementations live in `a2a-client/packages/shared/a2a-invoke-builders.mjs`.

## Options

1. **Delete** `packages/protocol` entirely (if confirmed dead) — move to `_deprecated/`
2. **Wire** it to re-export from `@a2a-client/shared` (same as `shared/src/*.mjs` pattern)
3. **Fill** with real implementations (not recommended — creates a second canonical source)

## Checklist

- [ ] Verify no runtime consumers of `@a2a-client/protocol` (grep + workspace dependency check)
- [ ] If dead: move `packages/protocol` to `a2a-client/_deprecated/` and remove from workspace `package.json`
- [ ] If needed: convert to re-export shim pointing at `@a2a-client/shared`
- [ ] Re-run `node scripts/audit-session-storage-to-tasks.mjs` to confirm no regression

## Evidence required

Workspace grep confirms 0 consumers before deletion. `npm run test:before-start` exit 0 after change.
