# Grey-room System Actions Tasks

## Context
The grey-room implementation plan lives in `prompts/system-collection/gray-room-implementation-plan.md` (see also `sequence-control.md` and `gray-room-overview.md`). That plan defines the look-ahead queue, `step_complete` flow, and documentation strategy for treating grey-room iterations as system actions. This task file tracks the actionable work that keeps those structures aligned with the task queue.

## Tasks
1. **Define the canonical `sequence` schema** – decide the fields required for each planned step (id, title, goal, exit criteria, prompt reference, dependencies, status). Document the schema either as a JSON snippet or Markdown table in this task file and reference it from `gray-room-implementation-plan.md`.
2. **Implement the step confirmation workflow** – outline how an agent emits `step_complete`, what metadata is carried (summary, next step id), and how the grey room transitions to the next queue entry. Link the result to `sequence-control.md` so the document describes the operational signal.
3. **Coordinate client updates** – determine how the client (front-end / runner) shows the look-ahead queue, allows editing future steps, and reacts to `step_complete`. Specify which UI components, routes, or stored data structures must be extended (for example, `sequence` state in the session view, new action buttons, or additional fields on the Agent form).
4. **Coordinate server updates** – identify server-side changes required to persist/serve the queue and handle `step_complete` signals (new endpoints, storage paths, data models). Note if middleware/services (e.g., `a2a-server` actions or `ai-integration` handlers) need to read/write the queue in `a2a-client/storage`, and record those expectations.
5. **Coordinate simulation/test coverage** – list which simulations (e.g., `simulations/sync/task-decomposition`, `scripts/tests/`) should verify the grey-room flow, including queue creation, look-ahead updates, and final-step prediction. Specify what new tests or golden files are needed to exercise edits to `sequence` or `step_complete` behavior.
3. **Predict the final step when backlog shrinks** – describe how to monitor queue length vs. planned steps, what triggers the “prediction of final step” entry, and where that prediction is logged. Update `sequence-control.md` with the concrete trigger/response rule.
4. **Tie prompts to steps without treating them as truth** – list which files (e.g., `system/sequence.txt`, `mutation/step_prompts.txt`) support each step and note that the queue/change log remains the single source of truth. Reference this note in the grey-room overview and the new plan.
5. **Track operational checkpoints** – include a checklist for verifying: the grey room queue is up-to-date, `step_complete` signals exist for recent steps, the look-ahead is recalculated when tasks drop, and new compositions (step reorders) are recorded.
6. **Client-side integration** – identify where the UI/agent clients must surface the grey-room sequence (e.g., prompts UI, queue inspector). Document which files/components consume `sequence` data, how they let operators adjust look-ahead, and how they display the “prediction of final step.” Reference `/prompts/system-collection/gray-room-overview.md` and any client docs.
7. **Server-side support** – describe needed server hooks (session context, sequence persistence, `step_complete` acknowledgement). Specify which API endpoints (Client API or custom) must accept/control `sequence` updates, how the server should reconcile queue length vs. actual backlog, and where to store logs/checkpoints for audits.
8. **Simulations/validation** – expand how the simulation suites (`sim:lint`, `sim:validate`, or specific scenario tests) should cover the grey-room flow. Document test cases that ensure look-ahead predictions adjust when steps complete or drop, and that prompts remain descriptive while the queue drives the state machine.

## Acceptance Criteria
- Schema and control rules are documented alongside the plan (links inserted into plan doc).  
- The tasks above are referenced from `sequence-control.md` so future operators know where the operational guidance lives.  
- There is a clear reminder (in both the plan and this task file) that prompts describe the approach and the queue/checklist is the authoritative state.
- The client/UI surfaces the look-ahead queue and handles `step_complete` actions (document which components/data structures change).
- Server/storage updates are identified (endpoints or storage paths that persist the queue/step confirmation) and recorded in linked docs.
- Simulation/test suites list the new coverage steps for the grey-room flow (queue creation, prediction updates, `step_complete` transitions).
