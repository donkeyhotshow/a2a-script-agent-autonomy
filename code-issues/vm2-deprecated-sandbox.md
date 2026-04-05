# `vm2` sandbox: unmaintained dependency

**Files:** `a2a-server/src/services/core/swe-verifier.ts` (`NodeVM`); `a2a-client/packages/execution/src/script-runner/index.ts` (optional `vm2`, fallback to Node `vm`).

**Problem:** `vm2` is **deprecated / unmaintained** on npm; known CVEs in older lines. Relying on it for “safe” execution is a long-term liability. Fallback `vm` is weaker still.

**Done when:** Replace with `isolated-vm`, explicit worker + IPC, or drop dynamic execution; document threat model if retained.
