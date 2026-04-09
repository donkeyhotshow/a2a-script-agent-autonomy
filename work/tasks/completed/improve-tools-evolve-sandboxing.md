# Improve sandboxing in tools-evolve endpoint — **DONE** (2026-04-07)

## Implemented

- **`a2a-server/src/api/tools-evolve-sandbox.ts`** — `validateSkillToolCodeForDeploy()`:
  - Static deny patterns (`process.exit`, `child_process`, `eval`, `Function`, dynamic `import()`).
  - TypeScript AST: forbidden identifiers (`process`, `require`, `global`, `globalThis`, `Buffer`, `fetch`) with skips for object literal keys / shorthand keys.
  - `typescript.transpileModule` → CommonJS; reject output containing `require(` / dynamic `import` / `eval`.
  - **`vm2` `VM`**: minimal sandbox (`exports` / `module`, `__filename` / `__dirname`, stub `console`), 3s timeout.
- **`SandboxViolationError`** → HTTP **403** from `POST /api/tools/evolve`.
- **`typescript`** moved to **`a2a-server` `dependencies`** so validation works when devDependencies are omitted.

## Tests

- `a2a-server/tests/unit/tools-evolve-sandbox.test.ts` (Vitest).

## References

- [`a2a-server/src/api/tools-evolve.ts`](../../a2a-server/src/api/tools-evolve.ts)
