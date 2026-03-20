# Per-Session Loaders Implementation Plan
Status: ✅ Approved by user - Implementing...

## 1. ✅ Per-session loaders in SessionStore (Map + methods)
   - Add `this.sessionLoaders = new Map()` in SessionStore
   - Methods: getLoader(sessionId), startLoader(sessionId), stopLoader(sessionId)
   - Emits: 'loader:start/{sessionId}', 'loader:stop/{sessionId}'

## 2. ✅ Submit flow: startLoader on submit, inline loader w/sessionId
   - submit/sendMessage: SessionStore.startLoader(sessionId)
   - Hide form DOM (add .form-hidden class)
   - DOM: showLoaderElement(sessionId)

## 3. [ ] Update promise resolve flow
   - On promiseResolved/setExecute: SessionStore.stopLoader(sessionId)
   - Re-render based on new execute (form/loader)

## 4. [ ] Handle page reload/init
   - init(): show global loader until restoreAndReconnect()
   - Post-restore: per-session loader if !execute.form

## 5. [ ] DOM/CSS updates
   - Per-session loader: <div id="loader-{sessionId}">
   - CSS: .session-loader, .form-hidden { display: none }

## 6. [ ] Test
   - npm run dev
   - Submit form → loader → new form
   - Reload → loader until server form

## Dependent files:
- js/session-store.js
- js/task-flow/render.js  
- js/action-handler.js
- index.html
- css/components/task-flow.css

Next step: Edit session-store.js
