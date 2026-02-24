# Project Debug Rules (Non-Obvious Only)

- **ENCRYPTION_KEY required for tests** - Must be exactly 32 characters, set in [`tests/setup.ts`](a2a-server/tests/setup.ts:16)
- **Test database is separate** - Tests use `a2a_test` database, not `a2a_server` (see [`tests/setup.ts`](a2a-server/tests/setup.ts:13))
- **SKIP_AUTH=1 bypasses authentication** - Use `npm run dev:no-auth` for development without auth
- **Request processor runs on interval** - Timer-based loop checks for pending requests every 5 seconds by default (REQUEST_PROCESSOR_INTERVAL_MS)
- **WebSocket on port 3001** - Separate from HTTP server on port 3000
- **Run single test file** - `npx vitest run tests/unit/auth.controller.test.ts` or `npx vitest run -t "test name"`
