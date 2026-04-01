# Task: Analyze app-watchdog scripts for a2a-server action patterns

**Priority:** Medium

**Source:** `C:\workspace\domain-platform\markdown-pipeline-automator\work\priority-3\app-watchdog\scripts\`

**Scripts (5):**
- kill-by-port.js - Kill process by port via watchdog API
- export.js - Export application per install.json config
- generate-install.js - Generate install.json template
- test-watchdog-ws.js - WebSocket test
- test-watchdog-ws.ps1 - PowerShell WebSocket test

---

## Analysis Results

### Category 1: Process Management (1 script)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `kill-by-port.js` | Kills process by port via watchdog API | `kill-by-port` — requires local API (port 3012), NOT portable |

### Category 2: Export/Installation (2 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `export.js` | Export app per install.json, generate scripts | `export-application` — file operations |
| `generate-install.js` | Generate install.json template | `generate-install-config` — JSON generation |

### Category 3: Testing (2 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `test-watchdog-ws.js` | WebSocket test | `test-websocket` — testing utility |
| `test-watchdog-ws.ps1` | PowerShell WebSocket test | `test-websocket-ps` — testing utility |

---

## Recommendations

### Not Portable (environment-specific)
- `kill-by-port.js` - Depends on local watchdog API (port 3012)

### Portable Actions (can be adapted)

1. **`generate-install-config`** - Generate install.json template
   - Input: `workspaceDir`
   - Output: `install.json` file
   - Logic: Scan directories, create default template

2. **`export-application`** - Export application files
   - Input: `sourceDir`, `targetDir`, `installConfig`
   - Output: Copied files + export scripts
   - Logic: Recursive copy with exclusions

### Low Value (not recommended for server actions)
- WebSocket tests - too specific to app-watchdog service

---

## Definition of Done

- [x] Scripts listed and analyzed (5 scripts)
- [x] Action candidates identified (2 portable)
- [x] DEV_STATE.md to be updated
