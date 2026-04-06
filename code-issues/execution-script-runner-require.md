# execution script-runner: `require` + eslint suppressions

**File:** `a2a-client/packages/execution/src/script-runner/index.ts`

**Problem:** `eslint-disable-next-line @typescript-eslint/no-var-requires` for dynamic `require` paths.

**Done when:** ESM `import()` with typed modules or documented exception.
