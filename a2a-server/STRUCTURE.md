# A2A Server Project Structure

## Canonical Package Layout

### Root Level
- `a2a-server/src/index.ts` - Main server entry point (bootstraps Express app)
- `a2a-server/package.json` - Workspace root with npm workspaces

### Workspace Packages (a2a-server/packages/)

| Package | Path | Status | Canonical? |
|---------|------|--------|------------|
| **server-config** | `packages/server-config/` | ✅ Has package.json | Yes - Config loader |
| **server-utils** | `packages/server-utils/` | ✅ Has package.json | Yes - Logger, utilities |
| **server-protocol** | `packages/server-protocol/` | ✅ Has package.json | Yes - Protocol types |
| **request** | `packages/request/` | ✅ Has package.json | Yes - Request handling |
| **daemon** | `packages/daemon/` | ✅ Has package.json | Yes - Daemon services |
| **features** | `packages/features/` | ✅ Has package.json | Yes - Features |
| **config** | `packages/config/` | ✅ Has package.json | Yes - Generic config |
| **utils** | `packages/utils/` | ❌ Moved to _deprecated | No - Duplicate |
| **llm** | `packages/llm/` | ⚠️ No package.json | Partial - Has source but not published |
| **memory** | `packages/memory/` | ⚠️ No package.json | Partial - Has source but not published |
| **server** | `packages/server/` | ⚠️ No package.json | Partial - Internal use only |
| **gray-room** | `packages/gray-room/` | ⚠️ No package.json | Partial - Has source but not published |
| **actions** | `packages/actions/` | ⚠️ No package.json | Partial - Has source but not published |
| **transform** | `packages/transform/` | ⚠️ No package.json | Partial - Has source but not published |
| **lib** | `packages/lib/` | ⚠️ No package.json | Partial - Has source but not published |

## Valid Import Strategy

### Using Workspace Packages (Recommended)
```typescript
import { logger } from "@a2a/server-utils";
import { config } from "@a2a/server-config";
```

### Using Relative Paths (For packages without package.json)
From `packages/gray-room/src/`:
```typescript
import { something } from "../../server/src/specific.js";
```

## Deprecated Paths (Do NOT Use)

These paths are now in `_deprecated/` and must not be used:
- `packages/utils/` → Use `@a2a/server-utils` instead
- `packages/gray-room/src/black-room/` → Removed (was stub)
- `archive/` → Use `archive_backup/`
- `snow-queen-mindmap/` → Separate standalone project, moved

## Cross-Package Dependencies

### Server Package Dependencies
```
a2a-server (root)
├── @a2a/server-config
├── @a2a/server-utils
├── @a2a/server-protocol
├── @a2a/server-request
├── @a2a/server-daemon
└── @a2a/server-features
```

### A2A Client Dependencies
```
a2a-client (packages/*)
├── @a2a-client/types
├── @a2a-client/storage
├── @a2a-client/rag
├── @a2a-client/protocol
├── @a2a-client/core
├── @a2a-client/sdk
├── @a2a-client/shared
├── @a2a-client/execution
└── @a2a-client/vite-plugin
```

## Known Issues (Post-Hygiene)

1. **104 import resolution errors** - Missing `.js` extensions in NodeNext module resolution
   - Affected files import without `.js` extension
   - Fix: Add `.js` to all relative imports

2. **Packages without package.json** - Some packages listed in workspace config lack package.json:
   - `packages/llm`
   - `packages/memory`
   - `packages/gray-room`
   - `packages/actions`
   - `packages/transform`
   - `packages/lib`
   
   These work via relative imports but can't be npm installed individually.

## What Was Cleaned Up

| Item | Action |
|------|--------|
| `packages/utils/` | Moved to `_deprecated/packages-utils/` |
| `packages/gray-room/src/black-room/` | Moved to `_deprecated/gray-room-black-room/` |
| `archive/` | Renamed to `archive_backup/` |
| `snow-queen-mindmap/` | Moved to `_deprecated/snow-queen-mindmap/` |
| `@a2a/server-llm` import | Removed (unused) from `packages/server/src/intent-gate.ts` |