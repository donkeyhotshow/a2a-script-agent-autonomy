# Web UI troubleshooting

Guides for `a2a-client/web` (browser session store, panels, execute flow).

## Quick reference

| Issue | Hint |
|-------|------|
| HTTP / no response | A2A Server **3000**; Client API **5173** (`/api/a2a/*`) or SDK **3001** |
| Session / UI state | [Session state](session-state.md) |
| Panels | [Panel rendering](panel-rendering.md) |
| Execute / actions | [Execute processing](execute-processing.md) |
| Message input UI | [Conditional rendering](message-input-conditional-rendering.md) |

## Topics

- [Session state problems](session-state.md)
- [Panel rendering issues](panel-rendering.md)
- [Execute processing errors](execute-processing.md)
- [Message input conditional rendering](message-input-conditional-rendering.md)

## Diagnostic snippets

```javascript
console.log('Transport state:', TransportManager.getState());
console.log('Session state:', SessionStore.toJSON());
```

## Related (repo root)

- [Standardized scripts](../../../../docs/troubleshooting/standardize-stop-scripts.md)
- [New request flow](../../../../docs/new-request-flow/)
- [Glossary](../../../../docs/glossary.md)
- [Component API reference](../../../docs/api-reference/)
