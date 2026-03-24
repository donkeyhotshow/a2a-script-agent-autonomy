# ADR-0027: Canonical documentation map (avoid cross-doc duplication)

Status: accepted  
Date: 2026-03-24

## Context

Protocol, ports, AI Hub promise flow, simulation file layout, and server-side LLM request shaping were repeated across many Markdown files (`ARCHITECTURE.md`, `DATA-FLOW.md`, `FILES.md`, `SERVER-ARCHITECTURE.md`, planning notes, etc.). Copies diverged (wrong ports, outdated `/invoke` paths, duplicate ASCII diagrams).

## Decision

1. **One primary source per concern.** Other documents give a short summary and **link** to the canonical file (and to ADRs where the decision matters).

   | Topic | Canonical doc | Anchors / notes |
   |-------|----------------|-----------------|
   | End-to-end protocol, action-key shape, sync/async | [`docs/new-request-flow/PROTOCOL.md`](../new-request-flow/PROTOCOL.md) | `#action-key-shape`, `#async-flow-promiseid` (`<span id>` for stable links) |
   | Env vars + default ports (incl. Hub **11435**, Ollama **11434**) | Root [`AGENTS.md`](../../AGENTS.md) | `#environment-variables`, `### Default Ports` |
   | Port / component matrix (extended) | [`docs/new-request-flow/DATA-FLOW.md`](../new-request-flow/DATA-FLOW.md) | `#component-ports` |
   | Repo / module tree (`a2a-client`, `a2a-server`, …) | [`docs/new-request-flow/FILES.md`](../new-request-flow/FILES.md) | |
   | Server-centric behavior, AI Hub integration | [`docs/new-request-flow/SERVER-ARCHITECTURE.md`](../new-request-flow/SERVER-ARCHITECTURE.md) | `#external-ai-hub-integration` |
   | Simulation step artifacts & pipeline | [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) | Complements [ADR-0001](ADR-0001-simulations-as-golden-standard.md) |
   | Fold `result` → `history`, `flowControlHint` before `request.md` | [`a2a-server/docs/LLM-REQUEST-PREP.md`](../../a2a-server/docs/LLM-REQUEST-PREP.md) | [ADR-0026](ADR-0026-server-llm-request-prep.md) |
   | Planning / roadmap (non-normative) | [`a2a-server/docs/planning/`](../../a2a-server/docs/planning/README.md) | Must link to spec, not restate tables |

2. **`docs/new-request-flow/ARCHITECTURE.md`** stays a **diagram-first** overview: session/data flow in ASCII, then **pointers** to PROTOCOL, SESSION-FLOW, FILES, DATA-FLOW, AGENTS — not a second copy of Hub steps, env tables, or file trees.

3. **Planning mirrors** (e.g. `a2a-server/docs/planning/LLM-REQUEST-PREP.md`) remain **short**; technical detail lives under `a2a-server/docs/` or `docs/new-request-flow/` as above.

## Consequences

- Doc fixes should land in the **canonical** file first; downstream pages only adjust links or one-line summaries.
- Reviewers treat large duplicated blocks in non-canonical docs as a smell; prefer links + anchors.
- Archived or historical drafts live under `docs/archive/` with a stub or README index when a path must remain stable.

## Related

- [ADR-0026](ADR-0026-server-llm-request-prep.md) — server LLM request preparation (referenced from canonical `LLM-REQUEST-PREP.md`).
- [ADR-0028](ADR-0028-client-api-deployment-modes.md) — Vite `/api/a2a` vs standalone SDK; clarifies Client API port docs.
- [ADR-0001](ADR-0001-simulations-as-golden-standard.md) — golden simulations; update `request.md` when prep/transforms change.
