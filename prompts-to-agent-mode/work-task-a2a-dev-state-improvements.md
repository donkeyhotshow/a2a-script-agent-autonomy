# A2A Dev State Worklist

Based on the current `DEV_STATE` analysis and the derail points captured in `work/STATE.md`, here are concrete action items for the **live stack queue** (`prompts-to-agent-mode`) and linked **IDE prompts** (`tasks/ide-prompts`) where work is repo-only.

## High Priority

1. **Router interaction reliability**
   - Auto-select the `agent` choice in `monitor-and-process-tasks.js` whenever a session is seeded with `mode: "agent"`, proving the service can skip the free-text router prompt without human intervention.
   - Reference: `tasks/pending/monitor-router-interaction-followup.md`, **work-task** coverage in `work-task-sync-documentation-router-drift.md`.

2. **Script/Dialog/Agent response parity (S14)**
   - Align `execute.script` responses with dialog/agent flows so forms, history, and `workbench` carry identical structures.
   - Reference: `tasks/script-dialog-agent-response-parity.md`, `work-state-02-unified-data-language.md`.

3. **a2a-client test suite recovery**
   - Fix Jest/Vitest configuration, discovery, and SDK runner assumptions that cause 41 failing tests; document the root cause and propose watchers for the client SDK.
   - Reference: `a2a-client/DEV_STATE.md`, `work-task-analyze-test-failures.md`.

## Medium Priority

4. **LLM request/response Markdown coverage (S11)**
   - Ensure every `simulations/sync/*` has full `request.md` and `response.md` coverage so the pipeline can be replayed at any step; the desired command is `npm run sim:check-md -- --fail`.
   - Reference: `work-task-sync-llm-snapshot-coverage.md`, [`tasks/ide-prompts/doc-protocol-validation-examples.md`](../tasks/ide-prompts/doc-protocol-validation-examples.md).

5. **Gray room refinement**
   - Clarify interrupt loop boundaries, trigger policies, and observability needs inside `docs/GRAY-ROOM.md` (work-state references in `work-state-03-agent-modes-gray-room.md`).

6. **Workspace tools golden map (S12)**
   - Complete the audit table pairing each `VALID_EXECUTE_KEY` with the golden step in `simulations/sync/agent-workspace-tools/description.md` and document coverage gaps.
   - Reference: `work-task-sync-workspace-tools-golden-map.md`.

7. **Orchestrator metrics**
   - Automate collection of metrics that today require manual refresh so the dashboard stays accurate; inspiration in `work-task-orchestrator-metrics-tracking.md`.

## Lower Priority / Technical Debt

8. **Simulation contract warnings**
   - Resolve all warning debt surfaced by `npm run sim:validate -- --step-contract` across legacy goldens so `sim:quality` can run without tolerated warnings.
   - Reference: `work-task-sync-step-contract-warnings.md`.

9. **Documentation drift prevention**
   - Add a lint or CI check tying the router labels in docs to `shared/router-static-choices.json` to catch drift early.
   - Reference: `work-task-sync-documentation-router-drift.md`, `dev-state-router-drift-optional.md`.

10. **Token optimization audit**
    - Review and tighten the transform ops (`truncate-section`, `pick-context`, `pick-files`) so the request blocks do not carry redundant context that bloats tokens.
    - Reference: `work-state-01-concept-end-to-end.md`, `doc-protocols-index-truth-vs-server.md`.

## Architecture Enhancements

11. **Self-upgrade observability**
    - Add a metrics endpoint to the Task Monitor (`monitor-and-process-tasks.js`) tracking tasks/min, failure rate, and LLM latency per provider.
    - Reference: `work-task-orchestrator-metrics-tracking.md` for instrumentation goals.

12. **Client API standalone mode**
    - Stabilize the standalone SDK Client API on `:3001`, ensuring its deployment path matches ADR-0028 and adds resilience to the default Vite plugin surface.
    - Reference: `docs/adr/ADR-0028-client-api-deployment-modes.md`, `dev-state-align-with-work-state.md`.

13. **Resilience simulations expansion**
    - Extend the existing resilience contract beyond six steps so it covers timeout, partial LLM response, and auth refresh cases.
    - Reference: `work-task-sync-substeps-not-discovered.md`, `doc-protocols-actions-roadmap-checklists.md`.

## Quick Wins

| Task | Effort | Impact |
|------|--------|--------|
| Fix router auto-choice in monitor | Small | High |
| Document S14 parity matrix | Small | Medium |
| Resolve client test config | Medium | Medium |
| Add `sim:contract-report` to CI | Small | Medium |

Each of these action items can be translated into a `tasks/pending/` entry or expansion in `DEV_STATE.md`. If more detail is needed, reference the linked files above before creating the follow-up tickets.
