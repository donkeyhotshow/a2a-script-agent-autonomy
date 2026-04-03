# Grey-room System Actions Tasks

## Context
The grey-room implementation plan lives in `prompts/system-collection/gray-room-implementation-plan.md` (see also `sequence-control.md` and `gray-room-overview.md`). These referenced files now exist and define the look-ahead queue, `step_complete` flow, and documentation strategy for treating grey-room iterations as system actions. This task file tracks the actionable work that keeps those structures aligned with the task queue.

## Tasks
1. **Define the canonical `sequence` schema** – [x] `docs/references/sequence-schema.json` defines `SequenceStep` + `SequencePlan` (`steps`, `headIndex`) + bare array; `gray-room-implementation-plan.md` links to it. **Client persistence / `POST /api/v1/sequence` on the stateless server** remains out of scope—queue updates belong in **Client API** session storage or `context` on invoke (see ADR patterns).

2. **Implement the step confirmation workflow** – [partial] `action-request-processor.ts` + `sequence-workbench.ts`: `step_complete` validates head `stepId`, marks complete, advances `headIndex`, appends `history` + `operationHistory`, appends/replaces `final_prediction` when pending ≤ 2. Remaining: UI + Client API persistence, docs in `sequence-control.md`.

3. **Coordinate client updates** – Enhance the Agent form in `a2a-client/packages/web-ui/src/components/AgentForm.vue` to display the look-ahead queue from `context.workbench.sections.sequence`. Add UI controls to: a) view next 3 steps, b) edit pending step titles/goals, c) reorder pending steps (drag-and-drop), and d) mark steps as blocked. Store queue edits in `context.workbench.sections.sequence_edits` until confirmed.

4. **Coordinate Client API updates** – [partial] `GET/PUT /api/a2a/sessions/:id/sequence` persists `sequence.json` under flat session storage (`packages/vite-plugin/routes/sessionRoutes.js`). Stateless server does not own session files; no `POST /api/v1/sequence` on a2a-server.

5. **Coordinate simulation/test coverage** – Create golden test files in `simulations/gray-room/` for: a) queue initialization with 5 steps, b) step completion advancing the queue, c) look-ahead updates when steps are edited, and d) final step prediction triggering when backlog < 3 steps. Update `sim:validate` to include these scenarios with pass/fail criteria based on queue state correctness.

6. **Predict the final step when backlog shrinks** – Implement logic in `a2a-server/src/services/sequence/SequenceService.ts` to: a) monitor `context.workbench.sections.sequence` length, b) when pending steps ≤ 2, auto-generate a "final step prediction" entry with title "Predicted Final Step", goal based on accumulated step goals, and exit criteria matching the overall task objective, c) log predictions to `context.workbench.sections.predictions` with timestamps. Update `sequence-control.md` with the prediction algorithm.

7. **Tie prompts to steps without treating them as truth** – Verify that `prompts/system-collection/step_prompts.md` contains prompt templates for each sequence step type. Update `gray-room-overview.md` to explicitly state: "While step prompts provide guidance, the sequence queue in `context.workbench.sections.sequence` is the single source of truth for execution state. Prompts may be updated independently without changing the execution plan."

8. **Track operational checkpoints** – [partial] `scripts/verify-gray-room-state.mjs` (JSON snapshot: `context.workbench.sections.sequence`, optional `predictions` / `history` / `operationHistory`). Root: `npm run verify:gray-room -- <file.json>`. Optional `--stdin`. Not wired into `sim:validate` yet.

9. **Client-side integration** – [partial] Vue `packages/web/src/components/SequenceInspector.vue` + `AgentForm.vue`, mount `js/sequence-inspector-entry.js`, `window.__a2aSequenceBind(sessionId)` from `window-events.js`. Refresh via HTTP (reload after PUT); no WebSocket.

10. **Server-side support** – Implement sequence persistence in `a2a-server/src/services/sequence/SequencePersistenceService.ts` that: a) reads/writes sequence data to `a2a-client/storage/sessions/{sessionId}/sequence.json`, b) handles concurrent updates with optimistic locking, c) recovers sequence state on session restore, and d) archives old sequences to `a2a-client/storage/sessions/{sessionId}/sequence-archive/`. Update the session middleware to initialize sequence services.

11. **Simulations/validation** – Extend `simulations/SCHEMA.md` to include sequence-specific validation: a) sequence schema compliance, b) step transition validity (no skipping steps), c) prediction accuracy when backlog shrinks, and d) prompt-queue consistency checks. Add test cases that fail when queue operations violate business rules.