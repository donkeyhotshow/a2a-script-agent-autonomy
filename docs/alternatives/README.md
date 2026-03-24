# Alternatives (per-system variants)

Each **subfolder** is one **decision surface**: a tool, subsystem, or integration point where multiple *ways of using* it are plausible. Inside: **`VARIANTS.md`** — options, trade-offs, **your selection**, and **what to build next**.

This is not a second ADR system. It answers a different question.

---

## The problem this solves

| Need | ADR (`docs/adr/`) | Alternatives (`docs/alternatives/`) |
|------|-------------------|-------------------------------------|
| **We decided X; here is why and consequences** | Yes | No (link from ADR here if useful) |
| **We are comparing A/B/C before committing** | Too heavy | Yes |
| **Same vendor, different deployment or usage modes** | Often overkill | Yes |
| **Personal / team “which flavor is ours?”** | No | Yes |
| **Normative contract for the whole repo** | Yes | Only after you promote the choice |

**Decision ladder (typical flow):**

1. **Explore** — add a folder + `VARIANTS.md`, list variants with stable IDs.
2. **Select** — check boxes under “Current selection”; note env, flags, or paths.
3. **Promote** — if the choice constrains code, tests, or multiple packages → **ADR** (and link `Related: docs/alternatives/<folder>/`).
4. **Maintain** — on vendor upgrades or new modes, revisit the same file; bump **Last reviewed**.

If two `VARIANTS.md` files **contradict** (e.g. different async models), stop using alternatives as the authority: resolve with **one ADR** and align both docs.

---

## Conventions

| Item | Rule |
|------|------|
| Folder name | One **decision surface** per folder; `kebab-case` (e.g. `session-storage-backend`, `llm-provider`). |
| Main file | Always **`VARIANTS.md`** (grep, scripts, mental model). |
| Variant **ID** | Short, **stable** slug in backticks (`file-kv`, `sync-invoke`). Do not recycle IDs when meaning changes — add `v2` or a new id. |
| One file | Prefer one `VARIANTS.md` per folder. Extra files only for huge topics (e.g. `MATRIX.md` for compatibility). |

### What is one “system”?

- **Good:** “How we persist sessions”, “how the web client polls async work”, “which LLM path we use in dev”.
- **Split** when decisions are **independent** (separate folders) or when the doc exceeds ~2 screens — split by **sub-decision**, not by random file names.
- **Merge** when variants are really the same axis (avoid duplicate folders for Ollama vs “local model” if they are one choice).

---

## How to mark decisions (in `VARIANTS.md`)

- **Selected** — `[x]` under “Current selection” and/or `**Status:** chosen` on that variant’s section.
- **Hybrid** — multiple `[x]` if the repo honestly uses more than one mode (e.g. dev vs CI); spell out **where** each applies.
- **Planned** — “Implementation backlog” with `[ ]` and one-line scope.
- **Rejected** — `**Status:** rejected` + one-line reason (keeps future readers from reviving dead options blindly).
- **Under consideration (folder)** — listed in [Under consideration (active review)](#under-consideration-active-review); add `**Review status:** …` at the top of that folder’s `VARIANTS.md` until resolved.

---

## Anti-patterns

- **Essay ADRs inside alternatives** — long “Consequences” belongs in `docs/adr/`, not in `VARIANTS.md`.
- **Unstable IDs** — renaming `v1`→`v2` without a note breaks references in issues and ADRs.
- **No context** — table-only files with jargon; add **Context** so a newcomer knows why the folder exists.
- **Shadow normative rules** — if it must be enforced in CI or simulations, **ADR + code/docs**, not only alternatives.

---

## Relation to other docs

- **ADRs** — binding “we do X”. Link **Related** both ways when a variant became an ADR.
- **`AGENTS.md` / `PROTOCOL.md`** — operational truth. If alternatives disagrees, fix **code + canonical doc**, then update `VARIANTS.md`.
- **Simulations** — golden behavior; if a variant changes observable protocol, update sims and mention that in the variant note.

---

## Under consideration (active review)

These decision surfaces are on the shortlist for explicit review. Each linked `VARIANTS.md` states the same at the top. When you lock a choice, check **Current selection** there (and promote to an ADR if normative).

| Folder | Topic |
|--------|--------|
| `session-storage-layout` | Filesystem step dirs vs DB vs multi-root |
| `golden-simulations` | `sim:lint` / `sim:validate` / `sim:run` / tiered CI |
| `client-filesystem-root` | `A2A_CLIENT_STORAGE_DIR` vs home vs repo storage |
| `server-prompt-transforms` | Bundled transforms vs `PROMPTS_TRANSFORMS_PATH` |
| `upstream-service-urls` | `A2A_SERVER_URL`, `AI_HUB_URL`, Ollama / Meili ports |
| `workspace-rag-packaging` | `file:` RAG vs registry vs git dependency |
| `server-logging` | `LOG_LEVEL`, `LOG_FORMAT`; Winston log dir / boot wipe vs rotation |
| `server-requests-storage` | `REQUESTS_STORAGE_PATH` vs default `storage/requests` |
| `simulations-base-path` | `SIMULATIONS_PATH` vs repo `simulations/` |
| `server-llm-hub-polling` | `LLM_POLL_*` / `POLL_*` in Node daemon |
| `sdk-http-limits` | CORS, rate limit, file/FS caps on standalone SDK |
| `agent-rag-chain-limits` | `A2A_AGENT_RAG_CHAIN_MAX`, `A2A_RAG_PROJECT_PATH`, `A2A_PROJECT_PATH` |
| `server-action-registry-bootstrap` | Lenient start vs fail-fast if MD actions fail to load |
| `ts-module-policy` | NodeNext + `.js` imports vs future bundler / dual package |
| `server-error-detail-level` | Stack traces off in production (`NODE_ENV`) |
| `server-filesystem-sandbox` | cwd/tmp/HOME path allowlists for file actions |
| `server-background-processor` | `REQUEST_PROCESSOR_INTERVAL_MS` (daemon tick) |
| `llm-pipeline-modes` | Which router modes ship (dialog, coder, auto-ai, …) |

---

## Index (active review systems)

| Folder | Topic |
|--------|--------|
| `agent-rag-chain-limits` | `A2A_AGENT_RAG_CHAIN_MAX`, `A2A_RAG_PROJECT_PATH`, `A2A_PROJECT_PATH` |
| `golden-simulations` | `sim:lint` / `sim:validate` / `sim:run` / tiered CI |
| `llm-pipeline-modes` | Which router modes ship (dialog, coder, auto-ai, …) |
| `sdk-http-limits` | CORS, rate limit, file/FS caps on standalone SDK |
| `server-action-registry-bootstrap` | Lenient start vs fail-fast if MD actions fail to load |
| `server-background-processor` | `REQUEST_PROCESSOR_INTERVAL_MS` (daemon tick) |
| `server-error-detail-level` | Stack traces off in production (`NODE_ENV`) |
| `server-filesystem-sandbox` | cwd/tmp/HOME path allowlists for file actions |
| `server-llm-hub-polling` | `LLM_POLL_*` / `POLL_*` in Node daemon |
| `server-logging` | `LOG_LEVEL`, `LOG_FORMAT`; Winston log dir / boot wipe vs rotation |
| `server-prompt-transforms` | Bundled transforms vs `PROMPTS_TRANSFORMS_PATH` |
| `server-requests-storage` | `REQUESTS_STORAGE_PATH` vs default `storage/requests` |
| `simulations-base-path` | `SIMULATIONS_PATH` vs repo `simulations/` |
| `ts-module-policy` | NodeNext + `.js` imports vs future bundler / dual package |
| `upstream-service-urls` | `A2A_SERVER_URL`, `AI_HUB_URL`, Ollama / Meili ports |
| `workspace-rag-packaging` | `file:` RAG vs registry vs git dependency |
| `client-filesystem-root` | `A2A_CLIENT_STORAGE_DIR` vs home vs repo storage |
| `session-storage-layout` | Filesystem step dirs vs DB vs multi-root |

Copy `_template/VARIANTS.md` when adding a new system folder.
