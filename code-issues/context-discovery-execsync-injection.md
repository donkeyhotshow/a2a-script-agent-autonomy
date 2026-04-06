# ContextDiscoveryService: `execSync` with interpolated query/path

**File:** `a2a-server/src/services/context/context-discovery.service.ts`

**Problem:** `execSync(\`grep -rni ... "${query}" "${rootPath}"\`)` passes `query` and `rootPath` through the shell. Malicious values (`"; rm -rf /` or backticks) can alter the command.

**Secondary:** `parseInt(match[2])` omits radix — use `parseInt(match[2], 10)` for lint/clarity.

**Done when:** Use `spawn` with `shell: false` and argument array, or `execFile` with fixed `grep` args; validate/sanitize `rootPath` to a real directory under allowlist.
