# 30 – Integrate simulations-style engine into /api/v1 endpoints

## Context

Docs describe server endpoints (`/api/v1/invoke`, `/api/v1/requests/:id/status`, `/api/v1/requests/:id/result`) and promiseId flows. The new simulations-style engine (transform executor + templates + LLM adapter) must be wired into these endpoints while keeping the server stateless and **driven entirely by config files (pipelines, action registry, prompts)**.

## Goal

Use the transform DSL executor and LLM adapter to implement the full AI-Actions pipeline behind the existing HTTP endpoints, so that:
- All per-action differences come from configuration files.
- Endpoints just orchestrate:
  - loading config,
  - running pipelines,
  - calling the LLM adapter,
  - managing promiseIds.

## Requirements

- **/api/v1/invoke**
  - Accept both:
    - Initial requests (`{ task }`).
    - Follow-up requests (`{ context, result }`).
  - Normalize input into an internal `request.json` shape compatible with transform pipelines.
  - Resolve which action / step / pipelines to run using an **action registry config file**, not hardcoded switches:
    - For first request: produce choices via a non-LLM path or AI-generated actions (depending on design), using configured pipelines.
    - For AI-Actions (`dialog`, `coder`, `auto-ai`, `analyze`):
      - Run request pipeline → obtain `request.md` via templates.
      - Trigger LLM via `llmAdapter` (likely async with promiseId).
  - For LLM flows, respond with `{ promiseId, status: "pending" }`.
  - For synchronous flows (no LLM), return protocol-level response inline: `context`, `execute`, optional `finalResult`.

- **/api/v1/requests/:promiseId/status**
  - Read stored request state from a minimal storage abstraction (in-memory or pluggable).
  - Return status: `pending`, `processing`, `completed`, `failed` (+ optional `progress`).
  - Do not inspect or change action-specific data; only track generic request lifecycle.

- **/api/v1/requests/:promiseId/result**
  - When completed:
    - Retrieve or trigger LLM result via `llmAdapter` (depending on design).
    - Run the configured response transform pipeline(s) to turn `response.md` into protocol-level `response.json`.
    - Return final `response.json` (`context` + `execute` + optional `finalResult`).

- **Statelessness & storage**
  - Server remains stateless at session level:
    - Only per-request minimal state (metadata + linkage to stored `request.md` / `response.md`) plus LLM logs.
  - Implement a small storage abstraction for requests:
    - In-memory implementation first (good for dev/tests).
    - API allows swapping to a persistent backend later without changing endpoint logic.

- **Validation**
  - Integrate protocol JSON Schema validation:
    - Validate incoming `request` shape against `request.schema.json`.
    - Validate outgoing `response` shape against `response.schema.json`.
  - On validation failure, return structured errors and log the invalid payload.

- **Unification constraints**
  - Endpoint handlers must not branch on concrete action ids (`"dialog"`, `"coder"`, etc.); they should only:
    - read `context.execution` and action registry config,
    - delegate to the generic engine.
  - All branching per action/step must be encoded in:
    - action registry config,
    - request/response transform pipelines,
    - prompt templates.

## Acceptance criteria

- Happy-path E2E test for a `dialog` step:
  - `/invoke` → `promiseId` → `/requests/:id/status` → `/requests/:id/result`:
    - With `LLM_REPLAY_DIR` set to `simulations/dialog/3`, final `response.json` matches the simulation.
- A second E2E test for another AI-Action (for example `auto-ai` or `analyze`) proves that:
  - Only config/pipeline/template files differ; endpoint and engine code are reused.
- All responses returned from these flows pass protocol JSON Schema validation.

## References

- `docs/new-request-flow/PROTOCOL.md`
- `docs/new-request-flow/ARCHITECTURE.md`
- `docs/new-request-flow/SIMULATION-LLM-PROXY.md`
- `docs/new-request-flow/API-SERVER.md`
- `simulations/SCHEMA.md`
- `simulations/dialog/*`

