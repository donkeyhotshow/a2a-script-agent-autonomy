# Client Task 08: Web – Simulation debug page (dev-only)

## Goal

Add a **dev-only** page in a2a-client/web that lets developers:

- Select a simulation and step from `simulations/`.
- View the pipeline files (`request.json`, `request.md`, `response.md`, `response.json`, `server-response.json` if present).
- Optionally trigger a live replay via Client API and compare results with the fixture.

## Scope

- `a2a-client/web/examples/` (or a dedicated `/debug` route)
- Static or API-backed listing of simulations (e.g. index built at build time or served by Client API)

## Requirements

- **1. Simulation + step selector**
  - List available simulations (e.g. dialog, coder, auto-ai, task-decomposition, etc.) and per-simulation steps (1, 2, 3, …).
  - Data source: either a static `simulations-index.json` generated at build time, or a small Client API endpoint that reads from `simulations/` (if Client API has file access in dev).

- **2. Pipeline file viewer**
  - For the selected step, display in tabs or panels:
    - Client → Server: `request.json`
    - Server transform: `server-transforms-request.json` (optional)
    - Server → LLM: `request.md`
    - LLM → Server: `response.md`
    - Server transform: `server-transforms-response.json` (optional)
    - Server → Client: `response.json`
    - Optional: `server-response.json` (actual server output when run)
  - Syntax highlighting or plain pre/code; no heavy framework required.

- **3. Live replay and diff**
  - Button "Run this step" that:
    - Sends the same logical request (from `request.json`) via Client API (so Client API calls server with that payload).
    - Displays the live response next to the fixture `response.json`.
  - Simple diff view (e.g. side-by-side or unified) for:
    - fixture `response.json` vs live response,
    - optionally `request.md` vs generated request.md.
  - Ignore known volatile fields (timestamps, ids, promiseId) in diff or make them toggleable.

- **4. LLM_REPLAY_DIR hint**
  - On the page, show a short note: "For deterministic replay, set LLM_REPLAY_DIR to this step path (e.g. simulations/dialog/3) and restart the server."
  - Optional: display current LLM_REPLAY_DIR if Client API or server exposes it (e.g. in a dev endpoint).

- **5. No production impact**
  - Page is available only in development (e.g. under `examples/simulation-debug.html` or when `NODE_ENV=development` / a feature flag).
  - Not linked from main app navigation in production build.

## Acceptance criteria

- A simulation debug page exists and loads step files for at least dialog, coder, auto-ai.
- User can run a step and see a diff between fixture and live response.
- Documentation (in repo or on the page) explains how to use it with LLM_REPLAY_DIR.

## References

- `docs/new-request-flow/SIMULATION-FORMAT.md`
- `docs/new-request-flow/SIMULATION-LLM-PROXY.md`
- `simulations/SCHEMA.md`
- Task 36 (client & web simulation replay)
