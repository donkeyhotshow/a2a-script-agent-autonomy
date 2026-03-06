# Legacy Files Archive

This folder contains the old architecture files that have been replaced by the unified session architecture.

## Archived JavaScript Files

| File | Replacement | Reason |
|------|-------------|--------|
| `session-manager.js` | `session-store.js` + `session-store-adapters.js` | Consolidated state management |
| `session-view-model.js` | `session-store.js` | Unified state (messages, execute, context) |
| `session-sync.js` | `session-sync-v2.js` | Direct SSE→Store bridge |
| `sse-client.js` | `transport-manager.js` | Unified transport with auto-fallback |
| `websocket-client.js` | `transport-manager.js` | Integrated into unified transport |
| `plasticine-ui.js` | `panel-manager.js` | Simplified panel system |
| `plasticine-workflow.js` | `panel-manager.js` | Unified panel/modal management |
| `session-panel-manager.js` | `panel-manager.js` | Consolidated panel logic |

## Archived CSS Files

| File | Replacement | Reason |
|------|-------------|--------|
| `panel-cube.css` | `panel-manager.css` | Simplified indicator replaces cube |
| `panel-dock.css` | `panel-manager.css` | Integrated into unified styles |
| `panel-drawer.css` | `panel-manager.css` | Integrated into unified styles |
| `mini-zones.css` | `panel-manager.css` | Simplified drag-drop zones |

## When to Reference These Files

- **Debugging**: If issues arise after migration, compare behavior with archived versions
- **Rollback**: If critical issues found, copy files back from archive temporarily
- **Documentation**: Understanding previous implementation decisions

## Restoration (Emergency Only)

```bash
# From web/ directory
cp js/archive/session-manager.js js/
cp js/archive/sse-client.js js/
# ... etc

# Restore index.html script references
```

## Migration Status

✅ **Completed**: New architecture is active in `index.html`
- SessionStore: Single source of truth
- TransportManager: SSE primary + WebSocket fallback
- PanelManager: Simplified panel system
- All legacy files moved to archive

Last migration: 2026-03-06
