# Task 5: A2A Server documentation (a2a-server)

## Goal

Describe the `a2a-server` component in detail: architecture, protocols, actions, AI-actions, and how it uses External AI Hub and simulations.

## References

- Server source:
  - `a2a-server/src/index.ts`
  - `a2a-server/src/server.ts`
  - `a2a-server/src/routes/*`
  - `a2a-server/src/services/*`
  - `a2a-server/src/actions/definitions/*`
  - `a2a-server/src/protocol/*`
- New-request flow docs:
  - `new-request-flow/ARCHITECTURE.md`
  - `new-request-flow/PROTOCOL.md`
  - `new-request-flow/SCHEMAS.md`
  - `new-request-flow/SESSION-FLOW.md`
  - `new-request-flow/SIMULATION-FORMAT.md`
- Simulations:
  - `simulations/SCHEMA.md`
  - `simulations/REFERENCE.md`
  - All major sims: `fix-vue-imports`, `fix-vue-imports-batched`, `dialog`, `coder`, `coder-smart`, `auto-ai`, `task-decomposition`
- External AI Hub:
  - `external-ai-hub/docs/*` (if present)
  - Any server integration code (`llm-hub` service, etc.).

## Work to perform

1. **Server architecture doc**
   - Create or refine a server-focused doc (e.g. `new-request-flow/SERVER-ARCHITECTURE.md` or under `a2a-server/docs/`) that explains:
     - How `/api/v1/invoke` and related endpoints work.
     - How the server routes requests through:
       - action selection,
       - Actions (hardcoded steps),
       - AI-Actions (LLM-driven flows),
       - External AI Hub / promiseId flows.
     - How context is managed (stateless server with context echoed in each response).
2. **Actions & AI-Actions**
   - Document:
     - Where action definitions live and how they are structured.
     - The difference between Actions and AI-Actions, with concrete examples from simulations.
     - How server decides which action to propose and how it advances steps.
3. **Integration with External AI Hub**
   - Describe:
     - How server constructs LLM prompts (`request.md`) and interprets responses (`response.md`).
     - How promiseId-based async flows work end-to-end.
     - How simulations model these flows.
4. **Simulation mapping**
   - For each major simulation, briefly map:
     - Which actions it triggers.
     - Which server routes and services it touches.
     - Any special transform behavior (now encoded in `server-transforms-*.json`).
5. **Operational notes**
   - Summarize:
     - Required environment variables.
     - Ports, health endpoints.
     - How to run the server in dev mode together with Client API, Web, and External AI Hub.

## Acceptance criteria

- A clear, server-centric documentation entry that:
  - Matches and deepens `ARCHITECTURE.md` and `PROTOCOL.md`.
  - Is cross-linked with simulations and transform schemas.
  - Gives a new contributor enough information to understand and modify server behavior safely.

