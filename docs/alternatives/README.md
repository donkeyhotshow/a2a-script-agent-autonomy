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

## Index (repo systems)

| Folder | Topic |
|--------|--------|
| `_template` | Copy for new folders |
| `client-api-deployment` | Vite `/api/a2a` vs standalone SDK (see ADR-0028) |
| `invoke-sync-async` | `DEFAULT_SYNC_MODE` / per-request `sync` |
| `web-async-polling` | `GET .../async` vs `promiseId` URL vs SDK gap |
| `server-auth-mode` | `SKIP_AUTH` vs JWT / split by env |
| `server-test-mode` | Vitest `TEST_MODE`: mocked, replay, recording, real |
| `session-storage-layout` | Filesystem step dirs vs DB vs multi-root |
| `golden-simulations` | `sim:lint` / `sim:validate` / `sim:run` / tiered CI |
| `rag-stack` | Meilisearch on vs local-fs-only vs hosted |
| `llm-provider` | Ollama / AI Hub / remote API / mock |
| `monorepo-dev-launch` | `start-all` vs manual subset vs server-only |
| `e2e-browser-testing` | Playwright: when to run, target URL, matrix / server lifecycle env |
| `web-session-client-mode` | SessionStore `storage` vs `project` |
| `client-filesystem-root` | `A2A_CLIENT_STORAGE_DIR` vs home vs repo storage |
| `embedding-provider` | Ollama vs OpenAI / Cohere / Voyage embeddings |
| `server-prompt-transforms` | Bundled transforms vs `PROMPTS_TRANSFORMS_PATH` |
| `upstream-service-urls` | `A2A_SERVER_URL`, `AI_HUB_URL`, Ollama / Meili ports |
| `ai-proxy-env-tuning` | Promise TTL, workers, Ollama auto-start, poll timeouts |
| `workspace-rag-packaging` | `file:` RAG vs registry vs git dependency |
| `js-test-runners-monorepo` | Vitest (server) vs Jest (`@a2a/rag`) convergence |
| `server-logging` | `LOG_LEVEL`, `LOG_FORMAT` (json vs pretty) |
| `server-requests-storage` | `REQUESTS_STORAGE_PATH` vs default `storage/requests` |
| `simulations-base-path` | `SIMULATIONS_PATH` vs repo `simulations/` |
| `server-llm-hub-polling` | `LLM_POLL_*` / `POLL_*` in Node daemon |
| `web-storage-localstorage` | Remember **a2a_storage_mode** vs force default |
| `vite-dev-api-routing` | Plugin-only vs SDK alongside vs proxy-heavy dev |
| `vite-vue-bundle-strategy` | External Vue/vue-flow vs full bundle vs prod config |
| `llm-model-id` | `OLLAMA_MODEL` vs default `qwen3:8b` |
| `sdk-http-limits` | CORS, rate limit, file/FS caps on standalone SDK |
| `agent-rag-chain-limits` | `A2A_AGENT_RAG_CHAIN_MAX`, `A2A_RAG_PROJECT_PATH`, `A2A_PROJECT_PATH` |
| `server-action-registry-bootstrap` | Lenient start vs fail-fast if MD actions fail to load |
| `ts-module-policy` | NodeNext + `.js` imports vs future bundler / dual package |
| `config-zod-package` | Root `config/` Zod as source of truth vs layered env |
| `client-tester-cli` | `a2a-client/tester` CLI vs Playwright vs hybrid CI |
| `playwright-ci-tuning` | `CI` env: retries, workers, video, slowMo |
| `server-error-detail-level` | Stack traces off in production (`NODE_ENV`) |
| `server-filesystem-sandbox` | cwd/tmp/HOME path allowlists for file actions |
| `server-http-security-profile` | Helmet CSP off, permissive CORS, compression |
| `server-background-processor` | `REQUEST_PROCESSOR_INTERVAL_MS` (daemon tick) |
| `server-winston-log-files` | Startup wipe of `logs/*` except `a2a.log` vs rotation |
| `llm-pipeline-modes` | Which router modes ship (dialog, coder, auto-ai, …) |
| `web-client-api-base-url` | localStorage `a2a_clientApiUrl`: `/api` vs absolute SDK URL |
| `vitest-server-policy` | `bail: 1`, coverage v8, optional coverage-only jobs |

Copy `_template/VARIANTS.md` when adding a new system folder.
