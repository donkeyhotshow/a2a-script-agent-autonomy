# episodic-memory: eslint disables for `any` / require

**File:** `a2a-server/src/services/memory/episodic-memory.ts`

**Problem:** Multiple `eslint-disable-next-line` for `@typescript-eslint/no-explicit-any` and `no-require-imports` around pool and row mapping.

**Done when:** Typed `pg` pool, ESM imports, and `Episode` row mapper without blanket `any`.
