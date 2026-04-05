# `POST /api/tools/evolve`: weak validation + path traversal

**File:** `a2a-server/src/api/tools-evolve.ts`

**Problems:**
1. **`toolName` in path:** `path.join(..., 'custom', \`${toolName}.skill.ts\`)` — `toolName` like `../../foo` can write outside `custom/`.
2. **Sandbox comment vs reality:** Only checks `!toolCode.includes('process.exit')`; trivial to bypass; comment admits placeholder.
3. **`catch (err: any)`** and **`fs` from `'fs'`** (not `node:fs`) — consistency and typing.

**Done when:** Sanitize `toolName` to a strict identifier; real sandbox or disable route in production; auth / admin-only guard documented in ADR or ENV matrix.
