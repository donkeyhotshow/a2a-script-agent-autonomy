# Project Debug Rules (Non-Obvious Only)

- **ENCRYPTION_KEY required for tests** - Must be exactly 32 characters, set in [`tests/setup.ts`](a2a-server/tests/setup.ts:16)
- **Test database is separate** - Tests use `a2a_test` database, not `a2a_server` (see [`tests/setup.ts`](a2a-server/tests/setup.ts:13))
- **SKIP_AUTH=1 bypasses authentication** - Use for development without auth
- **Run single test file** - `npx vitest run tests/unit/auth.controller.test.ts` or `npx vitest run -t "test name"`
