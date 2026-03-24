# Web UI troubleshooting

> **⚠️ Deprecated:** Some documents in this folder reference `PanelManager` and `TransportManager` which were planned but never implemented.
> - Panel management: `window-registry.js` + `task-flow/render.js`
> - Transport: `api-integration.js` (HTTP polling)
> See [api-integration.md](../api-reference/api-integration.md) and [window-registry.md](../api-reference/window-registry.md)

Guides for `a2a-client/web` (browser session store, panels, execute flow).

## Quick reference

| Issue | Hint |
|-------|------|
| HTTP / no response | A2A Server **3000**; Client API **5173** (`/api/a2a/*`) or SDK **3001** |
| Session / UI state | [Session state](session-state.md) |
| Panels | [Panel rendering](panel-rendering.md) |
| Execute / actions | [Execute processing](execute-processing.md) |
| Message input UI | [Message input conditional rendering](message-input-conditional-rendering.md) |

## Topics

- [Session state problems](session-state.md)
- [Panel rendering issues](panel-rendering.md)
- [Execute processing errors](execute-processing.md)
- [Message input conditional rendering](message-input-conditional-rendering.md)

## Diagnostic snippets

```javascript
// Note: TransportManager was never implemented - use APIIntegration instead
console.log('API state:', apiIntegration?.getState?.() || 'N/A');
console.log('Session state:', SessionStore.toJSON());
console.log('Window registry:', window.registry);
```

## Related (repo root)

- [Standardized scripts](../../../../docs/troubleshooting/standardize-stop-scripts.md)
- [New request flow](../../../../docs/new-request-flow/)
- [Glossary](../../../../docs/glossary.md)
- [Component API reference](../../../docs/api-reference/)
