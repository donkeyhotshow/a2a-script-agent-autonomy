# SWEVerifier: `TEST_COMMAND` via `exec` (shell)

**File:** `a2a-server/src/services/core/swe-verifier.ts` (hero stage, ~lines 90–93)

**Problem:** `promisify(exec)(testCommand)` runs the full string in a shell when `TEST_COMMAND` is set. Anyone who can set process env (or deploy config) can run arbitrary commands. `catch (e: any)` also weakens error typing.

**Done when:** Remove, gate behind explicit dev flag + allowlist, or use `spawn`/`execFile` with argv split and `shell: false`; narrow `catch` to `unknown`.
