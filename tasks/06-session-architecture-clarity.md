# Task 06: Session Architecture Clarity

## Atomic update action
Document the three-tier session model: global SessionStore → per-window stores via WindowRegistry → SessionStoreResolver pattern.

## Reason
Current codebase uses three different session store patterns (global, per-window, resolver) without unified documentation.

## Affected files
- `a2a-client/web/js/session-store.js` - global SessionStore singleton
- `a2a-client/web/js/session-store-resolver.js` - SessionStoreResolver pattern
- `a2a-client/web/js/app/windows/window-registry.js` - per-window store registry

## Validation checklist
- Document initialization order (emitter → dialog-loader → session-data → session-store → resolver)
- Document when to use global vs per-window vs resolver pattern
- Add decision tree for developers: "Which session store should I use?"

---

# Task 07: Session Lifecycle Diagrams

## Atomic update action
Create visual diagram showing session lifecycle: createSession → saveActiveSessionId → restoreAndReconnect → polling flow.

## Reason
Text documentation lacks clear visual flow; developers need to understand the happy path and recovery scenarios.

## Affected files
- `a2a-client/docs/session-management-protocols.md`
- `a2a-client/docs/WEB_UI_PROTOCOL.md`

## Validation checklist
- ASCII diagram showing: create → next → async polling → response
- Include recovery path: page reload → restoreAndReconnect → async resume
- Show storage files interaction at each step