# Client tasks – stubs and TODOs

Stub files and TODO comments added for tasks 01–11. Implement per task doc.

| Task | Where | What |
|------|--------|-----|
| **01** | `packages/api-client/src/simulation-helpers.ts` | Stub: `invokeFirstTask`, `sendFormChoice`, `sendMessage` |
| **02** | `packages/api-server/src/index.ts` (header) | TODO: session model, promiseId, DTO |
| **02** | `packages/api-server/src/session-dto.stub.ts` | Stub: `SessionSummary`, `SessionDetail`, `toSessionDetail` |
| **03** | `packages/rag/src/protocol-rag-search.stub.ts` | Stub: `toRagSearchResult` for result["rag-search"] |
| **04** | `packages/script-runner/src/index.ts` (header) | TODO: unified API, result["script"], sandbox |
| **05** | `packages/types/src/index.ts` (header) | TODO: protocol types, session DTO |
| **05** | `packages/history/src/index.ts` (header) | TODO: exchangeLog/messages |
| **06** | `web/js/session-manager.js` (header) | TODO: view-model, messages[], execute.form/message |
| **06** | `web/js/task-flow.js`, `plasticine-workflow.js` (header) | TODO: drive from view-model |
| **07** | `web/js/api-integration.js`, `web-api-client.js` (header) | TODO: Client API only |
| **08** | `web/examples/simulation-debug.html` + `simulation-debug.js` | Stub: selector, pipeline viewer, replay+diff |
| **09** | `web/js/error-handler.js`, `progress-indicators.js` (header) | TODO: central errors, loading/cancel |
| **10** | `packages/fs-utils/src/protocol-result.stub.ts` | Stub: `readFileForResult`, `writeFileForResult`, `listDirectoryForResult` |
| **11** | `packages/terminal/protocol-result.stub.cjs` | Stub: `executeCommandForResult` |

## Convention

- **Stub file**: throws or no-op; comment references `tasks/client/NN-*.md`.
- **TODO in existing file**: block at top or on method; `TODO(Task-NN): description – tasks/client/NN-*.md`.
- **Large file**: add TODO to split into parts (e.g. "TODO(Task-02): split session routes into sessions.routes.ts").
