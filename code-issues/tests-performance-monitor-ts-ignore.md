# Test helper: `@ts-ignore` cluster

**File:** `a2a-client/tests/helpers/performance-monitor.ts`

**Problem:** Several `// @ts-ignore` (likely DOM/perf API typing gaps).

**Done when:** Replace with proper typings, `// @ts-expect-error` + one-line reason, or ambient types.
