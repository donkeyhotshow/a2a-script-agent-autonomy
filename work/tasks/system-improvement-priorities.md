# System-wide improvement priorities

Cross-cutting themes to strengthen the stack (5173 Client API → 3000 server → 11434/11435 LLM). Existing module notes: [`DEV_STATE.md`](../../DEV_STATE.md), [`a2a-server/DEV_STATE.md`](../../a2a-server/DEV_STATE.md), [`a2a-client/DEV_STATE.md`](../../a2a-client/DEV_STATE.md).

---

## 1. One contract end-to-end (highest leverage)

**Gap:** The same turn is represented as raw `execute` (server), merged session state (SDK), and Web DTO (`received.json` / `session-projection-dto`). Drift causes subtle UI and driver bugs.

**Improve:**

- Treat [`simulations/CLIENT-SDK-IDEAL.md`](../../simulations/CLIENT-SDK-IDEAL.md) + [`web-execute-dto`](../../a2a-client/vite-plugin-a2a/routes/utils/web-execute-dto.js) as the **normative Web surface**; add a **single shared test** (or golden step) that asserts server → plugin projection → SDK agree on one scenario per execute family (`form`, `read-file`, workspace tools).
- Keep **action-key shape** enforcement in one place server-side and mirror in `sim-lint` only (already close).

---

## 2. Gray room: make it optional, measurable, documented

**Gap:** Gray room is powerful but easy to misconfigure (triggers, interrupt budget, what hits the LLM). Operators struggle to know “what ran” without reading code.

**Improve:**

- Short **operator checklist** in [`docs/GRAY-ROOM.md`](../../docs/GRAY-ROOM.md): env flags, how to see `context.workbench` / `operationHistory` on a captured invoke.
- **Tests:** at least one `scripts/direct-tests` path that exercises gray-room on/off with the same seed task (shape only if LLM off).
- Product decision: **default off in dev** vs **documented on** — pick one and align `DEV_STATE` / sample `.env`.

---

## 3. Verification pyramid (close the holes)

| Layer | Role | Known gap |
|--------|------|-----------|
| `scripts/direct-tests` | Fastest schema / invoke shape | Keep as mandatory first step per AGENTS |
| `sim:lint` / `sim:validate` | Golden contract | Substeps `N-sub-M` skipped by **validate** (see [`sync-substeps-not-discovered.md`](sync-substeps-not-discovered.md)) |
| Client API + `e2e-dialog-test.js` | Full session + router beats | Extend when new `execute` types or projection fields ship |

**Improve:** Add `--include-substeps` to sim-validate **or** a tiny unit test that AJV-validates every `server-transforms-*.json` under `simulations/**`.

---

## 4. Scripted vs LLM actions — one “language”

**Gap:** Scripted pipelines (`fix-vue-imports`, Laravel, etc.) and agent LLM steps use different prompt and context shapes; the UI must still show a coherent story.

**Improve:**

- Unify **execution.step** naming and **workbench.sections** updates for scripted flows (document in one ADR or `REQUEST-SCHEMA.md` appendix).
- Align **router/registry** ids with [`shared/router-static-choices.json`](../../shared/router-static-choices.json) and golden router steps (optional follow-up: [`sync-documentation-and-router-drift.md`](sync-documentation-and-router-drift.md)).

---

## 5. Observability and ops

- **Health:** Root + service health endpoints are already listed in root `DEV_STATE.md`; add a **single script** or doc section that fails CI if any port in the matrix is dead (optional).
- **Metrics:** Orchestrator / runtime metrics — see [`tasks/pending/orchestrator-metrics-tracking.md`](../../tasks/pending/orchestrator-metrics-tracking.md) (script path noted there); ensure “who updates metrics” is owned by one loop.
- **Server:** Expand structured logging around `request-processor` choice (action) and gray-room exit reason for supportability.

---

## 6. Backlog hygiene

- Duplicate task stubs live under **`work/tasks/`** and **`tasks/pending/`** for sync work — **merge or symlink** one canonical location to avoid double maintenance.
- Prune **done** items from `tasks/pending/*.md` bodies into a one-line changelog or delete completed files.

---

## Suggested order (pragmatic)

1. Substep / transform validation gap (§3) — pure tooling, high safety.  
2. One shared Web DTO regression test (§1).  
3. Gray room operator path + one direct-test (§2).  
4. Scripted vs LLM workbench narrative (§4).  
5. Metrics + logging (§5).  
6. Backlog dedup (§6).
