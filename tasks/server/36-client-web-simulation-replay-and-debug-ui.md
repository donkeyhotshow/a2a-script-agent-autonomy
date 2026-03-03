# Task 36: Client & Web simulation replay and debug UI

## Goal

Expose a **simulation-aware client + web tooling** that can:

- Replay simulations end-to-end (Client API + Web UI) against the real server.
- Visualize each step (`request.json`, `request.md`, `response.md`, `response.json`) in the browser.
- Help debug mismatches between runtime behavior and `simulations/` fixtures.

This is a counterpart to server-side replay (`LLM_REPLAY_DIR`) and `sim-*.ts` scripts, but focused on the **client/web** layer.

## Background

From:
- `docs/new-request-flow/SIMULATION-FORMAT.md`
- `docs/new-request-flow/SIMULATION-LLM-PROXY.md`
- `a2a-server/scripts/sim-run.ts`, `sim-compare.ts`, `sim-report.ts`
- `a2a-client/packages/api-client/tests/simulation-runner.ts`

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 36) and documented the replay/debug UI requirements.
- 📌 Implementation remains pending; this log will inform the feature build later.
- 📝 Next steps: develop the replay/debug UI once the sequential execution log (`tasks/EXECUTION-LOG.md`) is complete.
we already have:

- Server-side simulation runners and comparers.
- A minimal API-client-based simulation runner for tests.

Missing:

- A way to **drive Client API + Web UI** directly from simulations (for UI verification).
- An in-browser “debugger” view of each pipeline step for a given simulation.

## Requirements

- **1. Client-side simulation runner (API client + Client API)**
  - Implement a Node-side script or test helper in `a2a-client` that:
    - loads a given simulation step directory (`simulations/<name>/<n>/`),
    - constructs the correct **Client API** calls (e.g. `/api/sessions`, `/api/sessions/:id/next`) that would produce the recorded `request.json`,
    - interacts with a running server using `@a2a/api-client` and Client API endpoints,
    - collects the actual responses (`response.json`) for comparison.
  - Reuse or extend `packages/api-client/tests/simulation-runner.ts` where possible.

- **2. Web UI debug/dev page for simulations**
  - Add a dev-only page in `a2a-client/web` (e.g. `examples/simulation-debug.html` + `js/simulation-debug.js`) that:
    - allows selecting a simulation + step (from `simulations/` directory listing or a small JSON index),
    - loads the recorded files for that step (`request.json`, `request.md`, `response.md`, `response.json`, `server-response.json` if present),
    - renders them in UI panels (e.g. tabs: Client → Server → LLM → Server → Client),
    - optionally triggers a live replay against the running Client API + server and shows the differences.

- **3. Comparison visualization**
  - For a chosen simulation step:
    - visualize differences between:
      - recorded `response.json` and **live** `response.json`,
      - recorded vs live `request.md` (when available),
    - highlight fields that differ (ignoring known non-stable fields like timestamps, ids, promiseId).
  - Use a simple diff representation in the debug UI (no heavy frameworks).

- **4. Tight integration with LLM replay**
  - When `LLM_REPLAY_DIR` is set to a given simulation step:
    - show that status in the debug UI,
    - ensure that live replay uses the on-disk `response.md`.
  - Provide small docs in the debug page explaining how to:
    - set `LLM_REPLAY_DIR`,
    - run server + Client API + web debug UI together.

- **5. Developer workflow**
  - Document a recommended workflow:
    - choose a simulation,
    - run server with `LLM_REPLAY_DIR`,
    - open simulation debug UI in browser,
    - step through requests and inspect any mismatches,
    - adjust pipelines/templates/client code until everything matches.

## Acceptance Criteria

- Client-side tools exist to replay at least:
  - `dialog` (AI-Actions),
  - `coder` (RAG + file ops),
  - `auto-ai` (multi-action).
- A web-based **simulation debug page** exists and can:
  - load and display step files from `simulations/`,
  - run a live replay and show a diff between fixtures and live responses.
- Documentation explains how to use this tooling when refactoring server/client logic.

## References

- `simulations/SCHEMA.md`
- `docs/new-request-flow/SIMULATION-FORMAT.md`
- `docs/new-request-flow/SIMULATION-LLM-PROXY.md`
- `a2a-server/scripts/sim-run.ts`
- `a2a-client/packages/api-client/tests/simulation-runner.ts`
