# Agent task: Papa–Mama test matrix from repo state (full pass)

Paste this block into an IDE agent or a session `task` when you want a **high-quality** pass over state docs and the codebase to **balance** [`tests/direct-tests`](tests/direct-tests) (Papa) and [`tests/indirect-tests`](tests/indirect-tests) (Mama).

---

You are a test-architecture agent. **Goal:** From the **current** repo, design and **implement** a balanced suite: **`tests/direct-tests` (Papa)** = live stack / real HTTP / async; **`tests/indirect-tests` (Mama)** = offline validation of captures, schemas, and invariants—so failures are **actionable** and **localized** (client vs server vs proxy vs LLM vs contract).

## Phase 0 — Read (do not skip)

- Root and module state: `DEV_STATE.md`, `a2a-client/DEV_STATE.md`, `a2a-server/DEV_STATE.md`.
- Methodology: [`PAPA-MAMA.md`](PAPA-MAMA.md), [`AGENTS.md`](AGENTS.md) (Unified manual path, router two beats, action-key shape).
- Existing surfaces: [`tests/direct-tests/README.md`](tests/direct-tests/README.md), [`tests/direct-tests/validators/README.md`](tests/direct-tests/validators/README.md), [`tests/indirect-tests/README.md`](tests/indirect-tests/README.md), [`simulations/SCHEMA.md`](simulations/SCHEMA.md), [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md).
- Runtime contours: Client API routes / session storage layout under `a2a-client/storage/sessions/`, server `a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts` + `a2a-server/src/transform/interrupt-trace-contract.ts`.

## Phase 1 — Audit

Inventory **every** failure class you can infer from code + docs: sticky router, wrong beat (message vs choice), async stuck, shape violations (`execute`/`result` single key), gray-room trace vs workbench sequence, sim golden drift, import/NodeNext, prompts/transforms. Map each to **Papa** (needs stack) vs **Mama** (offline on files or mocked server tests).

Output a short report in `tasks/pending/` or update `DEV_STATE.md` (per repo protocol).

## Phase 2 — Balance (explicit)

- **Papa:** Minimal count of **high-value** flows: one end-to-end dialog vertical, one agent seed, one gray-room-visible path, one router regression—each with **clear assertions** and cleanup (`artifacts-registry` / docs).
- **Mama:** Expand **vertical** (red) and **horizontal** (gray) validators to cover **real** captured fixtures (not only toy examples), plus wrap or migrate validators from `tests/direct-tests/validators` where they are truly offline.
- **Rule:** Nothing that only needs files should live only in Papa; nothing that truly needs Ollama should be required for Mama `run-all`.

## Phase 3 — Implement

- Add or extend scripts with **stable CLI**, **exit codes**, and **README** one-liners.
- Wire `package.json` `npm run` entries only where it reduces friction.
- Do **not** re-enable post-start full suite in `start-all.bat` unless explicitly requested.

## Acceptance criteria

1. Written matrix: failure class → Papa script / Mama script / both.
2. At least **one** new Mama check grounded in a **realistic** fixture path (documented).
3. At least **one** Papa addition or hardening that reduces duplicate LLM work (env flags, `--only`, or merge) **without** dropping assertions.
4. `npm run test:indirect` stays green; document what Papa needs to run and when.

## Tone

Ship boring, debuggable automation—no heroics, no scope creep outside test layout and docs tied to this goal.

## See also

- [`PAPA-MAMA.md`](PAPA-MAMA.md) — methodology (Papa vs Mama, red vertical vs gray horizontal).
