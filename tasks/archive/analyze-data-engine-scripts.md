# Task: Analyze data-engine scripts for a2a-server action patterns

**Priority:** Medium

**Source:** `C:\workspace\domain-platform\markdown-pipeline-automator\work\priority-3\data-engine\`

**Scripts at root level (major):**
- cli.js - CLI interface (12KB)
- mcp-cli.js - MCP CLI (15KB)
- mcp-server.js - MCP server (22KB)
- server.cjs - Server (37KB)
- archive-adapter.js - Archive adapter (14KB)
- archive-tool.js - Archive tool (9KB)
- cursor-rules-generator.js - Cursor rules generator (21KB)
- file-receiver.js - File receiver (6KB)

**Scripts folder (1):**
- health-check.cjs - Health check (2KB)

---

## Analysis Results

### Category 1: MCP Server/CLI (2 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `mcp-server.js` | MCP server (22KB) - many endpoints | Too complex for simple action |
| `mcp-cli.js` | MCP CLI (15KB) | Too complex |

### Category 2: Server/CLI (2 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `server.cjs` | Main server (37KB) | Not portable |
| `cli.js` | CLI interface (12KB) | `run-cli-command` - could be adapted |

### Category 3: Archive Tools (2 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `archive-adapter.js` | Archive adapter (14KB) | `process-archive` |
| `archive-tool.js` | Archive tool (9KB) | `manage-archive` |

### Category 4: Code Generation (1 script)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `cursor-rules-generator.js` | Generate .cursorrules | `generate-cursor-rules` |

### Category 5: Utilities (3 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `file-receiver.js` | File receiver | `receive-files` |
| `health-check.cjs` | Health check | `check-health` |
| `project-file-generator.js` | Project file generator | `generate-project-files` |

---

## Recommendations

### Not Portable (too complex/specific)
- MCP server/CLI - complex protocol
- Main server.cjs - large application

### Portable Actions (can be adapted)

1. **`generate-cursor-rules`** - Generate .cursorrules file
   - Input: project config
   - Output: .cursorrules file

2. **`process-archive`** - Process archive files
   - Input: archive path, operation
   - Output: processed files

3. **`check-health`** - Health check
   - Input: none
   - Output: health status

---

## Definition of Done

- [x] Scripts listed and analyzed (10+ scripts)
- [x] Action candidates identified (3 portable)
- [x] DEV_STATE.md to be updated
