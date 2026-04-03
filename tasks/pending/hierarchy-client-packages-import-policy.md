# Task: Align client package import policy with repo NodeNext rule (or document exception)

**Status: Policy A applied (2026-04-03)** — [`.cursor/rules/code-hierarchy.mdc`](../../.cursor/rules/code-hierarchy.mdc) now splits **NodeNext (server)** vs **bundled UI (`premium-ui`)** vs **`@a2a/execution` note**. [`AGENTS.md`](../../AGENTS.md) *Imports* row updated.

## Resolved vs backlog

1. **`premium-ui`** — [`tsconfig.json`](../../a2a-client/packages/premium-ui/tsconfig.json) uses **`module` / `moduleResolution`: `NodeNext`**; imports still use **`@/` aliases** (often `.ts` or extensionless) as Vite resolves them. Documented as **bundled UI** exception.
2. **`@a2a/execution`** — **Updated (2026-04-03):** [`src/index.ts`](../../a2a-client/packages/execution/src/index.ts), [`file-scanner.ts`](../../a2a-client/packages/execution/src/file-scanner.ts), [`file-scanner.ignore.ts`](../../a2a-client/packages/execution/src/file-scanner.ignore.ts) use **`.js` relatives**; [`glob-matcher.ts`](../../a2a-client/packages/execution/src/glob-matcher.ts) / [`protocol-result.ts`](../../a2a-client/packages/execution/src/protocol-result.ts) tightened for **strict `tsc`** when pulled from `a2a-server` graph. Optional: add a dedicated **`tsconfig.json`** in the package for standalone `tsc`.

## Verification

- [x] No contradiction: server code keeps `.js` on relative imports; UI exception is explicit.
- [x] Policy B (execution): relative imports in barrel + fs-utils chain aligned with NodeNext.
