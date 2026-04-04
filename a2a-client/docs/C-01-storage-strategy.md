# C-01: A2A_CLIENT_STORAGE_DIR Strategy Decision

## Date: 2026-03-27

## Task
Choose and document canonical `A2A_CLIENT_STORAGE_DIR` strategy (repo-local vs home) for dev and CI.

---

## Analysis

### Current Implementation

**Primary storage module:** [`../packages/vite-plugin/storage/root.js`](../packages/vite-plugin/storage/root.js)
```javascript
export function getStorageRoot() {
  if (process.env.A2A_CLIENT_STORAGE_DIR) return process.env.A2A_CLIENT_STORAGE_DIR;
  return path.join(process.cwd(), 'storage');
}
```

**Default behavior:** Repo-local (`{cwd}/storage`)
**Override mechanism:** `A2A_CLIENT_STORAGE_DIR` environment variable

### Test Isolation Pattern

Tests use temp directories with explicit env override:
```javascript
// From tests/unit/vite-plugin-storage.test.js
beforeAll(() => {
  process.env.A2A_CLIENT_STORAGE_DIR = testDir;
});
```

### Documentation References

- [`packages/sdk/CONFIGURATION.md`](packages/sdk/CONFIGURATION.md): Mentions override for shared store ("Point the env var at a per-user directory")
- No explicit canonical strategy documented

### Environment Considerations

| Environment | Repo-Local (`./storage`) | Home (`$HOME/a2a-client`) |
|-------------|--------------------------|---------------------------|
| **Dev** | ✅ Easy cleanup (`rm -rf storage`) | ❌ Polutes home, harder cleanup |
| **CI** | ❌ Contaminates workspace | ✅ Isolated, but extra config |
| **Multi-user** | N/A | ✅ Shared via env var |
| **Test isolation** | ❌ Needs override | ✅ Auto-isolated |

---

## Decision

### Canonical Strategy: **Repo-Local (`./storage`)**

**Default:** `path.join(process.cwd(), 'storage')` — no change needed

**Rationale:**
1. **Dev experience:** Easy cleanup (`rm -rf storage`), no home directory pollution
2. **CI isolation:** Tests use `os.tmpdir()` with explicit env override — works out of box
3. **Simplicity:** Single default behavior, no platform-specific logic
4. **Override path:** `A2A_CLIENT_STORAGE_DIR` available for CI/custom needs

**CI behavior:**
- Tests already use `os.tmpdir()` + env override → automatic isolation
- No additional CI configuration needed
- Pipeline clean: no storage artifact to manage

---

## Implementation Notes

### For Development
```bash
# Default (repo-local)
cd a2a-client && npx vite

# Override if needed (e.g., shared storage)
export A2A_CLIENT_STORAGE_DIR=/path/to/shared/storage
```

### For CI Pipelines
Tests automatically use isolated temp directories. No change required.

### For Custom Deployments
```bash
# Multi-user or persistent storage
export A2A_CLIENT_STORAGE_DIR=$HOME/.a2a-client-storage
```

---

## No Code Changes Required

The existing implementation already supports this strategy:
- ✅ Repo-local default in `root.js`
- ✅ `A2A_CLIENT_STORAGE_DIR` override works
- ✅ Tests use tempdir isolation pattern
- ✅ Configuration documentation exists

This task is **complete** — just needs documentation.