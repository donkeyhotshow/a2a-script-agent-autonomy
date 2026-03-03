# 28 – LLM adapter with replay and logging

## Context

`SIMULATION-LLM-PROXY.md` describes `promiseId`-based async flows and `LLM_REPLAY_DIR`. The server needs a single, minimal LLM adapter that:
- Uses External AI Hub in live mode.
- Replays responses from simulations in replay mode.
- Logs `{request.md, response.md}` pairs for inspection.

The adapter itself must be generic; all action-specific behavior (what to ask, how to interpret) is defined by pipelines and templates.

## Goal

Create an `llmAdapter` module that handles all LLM interactions for AI-Actions and supports both live and replay modes with consistent behavior, while exposing a simple file-oriented interface (`request.md` in, `response.md` out).

## Requirements

- **Public API**
  - Function like:
    - `callLLM({ action, step, model, requestMd, tags }) -> Promise<{ responseMd, meta }>`
  - Parameters must include enough metadata (action id, step name, possibly simulation id) for logging and replay lookup, but not leak protocol-specific structures into the adapter.

- **Replay mode (LLM_REPLAY_DIR)**
  - When `LLM_REPLAY_DIR` is set:
    - Derive target directory for the current step (strategy to be defined: env path + optional step index / action name).
    - Read `response.md` from that folder and return it as `responseMd`.
    - Do **not** call External AI Hub in this mode.
    - If `response.md` missing:
      - Log a clear warning.
      - Fall back to live mode (to keep prod behavior working).

- **Live mode (External AI Hub)**
  - Use External AI Hub endpoints:
    - `POST /api/chat` with `X-Promise: true` to initiate the request.
    - Poll `GET /promise/<id>` until done.
    - Retrieve result via `GET /promise/<id>/response`.
  - Normalize hub response into a markdown `responseMd` string:
    - If hub returns JSON only, wrap it in a fenced block or otherwise ensure `parse-json-from-md` can reliably extract it.

- **Logging**
  - For every call (replay or live), store:
    - `request.md`
    - `response.md`
    - Small metadata JSON (`action`, `step`, timestamps, mode, model, promiseId if any).
  - Use a predictable directory layout, for example:
    - `logs/llm/<date>/<request-id>/request.md`
    - `logs/llm/<date>/<request-id>/response.md`
    - `logs/llm/<date>/<request-id>/meta.json`
  - Logs must be independent of simulations (separate from `simulations/*`).

- **Error handling**
  - Timeouts and hub errors must surface as structured server errors (with tags for tracing).
  - For tests / development, provide a simple stub provider or allow injecting a fake HTTP client.

- **Unification**
  - Adapter must be unaware of:
    - protocol-level `context` / `execute`,
    - which action is being executed beyond opaque tags.
  - All higher-level decisions (what to include into `request.md`, how to parse `response.md`) stay in pipelines and templates.

## Acceptance criteria

- Unit tests:
  - Replay mode returns exact `response.md` from a test directory and does not hit External AI Hub.
  - Live mode is abstracted behind an HTTP client interface that can be stubbed; adapter correctly polls and returns `responseMd`.
- Integration test:
  - A sample AI-Action path triggers `callLLM`, and logs `{request.md, response.md, meta.json}` under the expected directory.
- Documentation snippet in server docs (for example `SERVER-ARCHITECTURE.md` or dedicated LLM doc) explaining:
  - Replay behavior.
  - Log structure and location.
  - How to set `LLM_REPLAY_DIR` and run golden tests.

## References

- `docs/new-request-flow/SIMULATION-LLM-PROXY.md`
- `docs/new-request-flow/PROTOCOL.md`
- `simulations/SCHEMA.md`
- `simulations/dialog/3/response.md`

