# JSON schemas (invoke & Client API)

Machine-readable shapes for `POST /api/v1/invoke` and related Client API payloads. **Normative prose** lives in [`../PROTOCOL.md`](../PROTOCOL.md), [`../SCHEMAS.md`](../SCHEMAS.md), and repo root [`simulations/SCHEMA.md`](../../../simulations/SCHEMA.md).

| File | Role |
|------|------|
| [`server-invoke-request.schema.json`](server-invoke-request.schema.json) | Body for `POST /api/v1/invoke` |
| [`server-invoke-response-first-form.schema.json`](server-invoke-response-first-form.schema.json) | First response: `execute.form.choices` |
| [`server-invoke-response-execute.schema.json`](server-invoke-response-execute.schema.json) | Completed step: `execute.*` / `context` |
| [`server-invoke-response-pending.schema.json`](server-invoke-response-pending.schema.json) | Async: `promiseId` / pending |
| [`client-result.schema.json`](client-result.schema.json) | Action-key shaped `result` from client → server |
| [`server-transform.schema.json`](server-transform.schema.json) | Server transform pipeline ops (fixtures) |
| [`web-client-api-request.schema.json`](web-client-api-request.schema.json) | Web → Client API (sessions) |
| [`web-client-api-response.schema.json`](web-client-api-response.schema.json) | Client API → Web |

**Narrative / UI contract**

- [`UI-COMMANDS.md`](UI-COMMANDS.md) — `execute.ui` and loader behavior (Client API layer)
- [`SESSION-ACTIONS.md`](SESSION-ACTIONS.md) — session action vocabulary

**Related**

- [`../PROTOCOLS/README.md`](../PROTOCOLS/README.md) — stages, actions, promise flow
- [`../../../a2a-server/docs/planning/REFERENCE.md`](../../../a2a-server/docs/planning/REFERENCE.md) — simulations as golden standard (roadmap)
- [`../../../a2a-client/docs/WEB_UI_PROTOCOL.md`](../../../a2a-client/docs/WEB_UI_PROTOCOL.md) — file-backed Client API: `POST .../next` ack, `GET .../async` polling
