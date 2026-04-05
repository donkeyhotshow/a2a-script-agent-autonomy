# `validatePath`: string `startsWith` allows sibling paths

**File:** `a2a-server/src/actions/handlers/file-operations/security.ts`

**Problem:** `resolved.startsWith(path.resolve(prefix))` treats any path whose string prefix matches as inside the sandbox. Examples: on Unix `/tmp2/secret`.startsWith(`/tmp`) is true; `/applicant`.startsWith(`/app`) is true if cwd resolves to `/app`. Repo already has `a2a-client/shared/safe-path.mjs` using a trailing `path.sep` to avoid this.

**Done when:** Reuse `safePath`/equivalent: require `resolved === base || resolved.startsWith(base + path.sep)` after normalizing; add regression tests for `/tmp` vs `/tmp2`.
