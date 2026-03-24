# Upstream service URLs (ports) — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- **Client API → A2A Server:** `A2A_SERVER_URL` (default `http://localhost:3000`) in Vite proxy code (`a2a-client/vite-plugin-a2a/routes/proxy/a2a-proxy.js`, `stepRoutes.js`).
- **A2A Server → AI Hub:** `AI_HUB_URL` (default `http://localhost:11435`) in `request-processor.service.ts`.
- **Embedding Ollama:** `OLLAMA_BASE_URL` default `http://localhost:11434` in `@a2a/embedding`.

## Context

`.env.example` lists many ports; **your** topology must stay internally consistent (Ollama vs AI Hub vs “proxy” naming). This doc is where you record **which mapping is canonical** for your team.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `doc-defaults` | Match `AGENTS.md` table | Server 3000, Web 5173, AI Hub 11435, Ollama 11434. | Fix `.env.example` if it disagrees (known drift risk). |
| `docker-compose` | All hosts from compose network | Service names instead of localhost. | K8s/docker swarm variants. |
| `tunnel-remote` | SSH / cloud tunnel | Dev connects laptop to remote stack. | Set all three URL envs explicitly. |

### `doc-defaults`

- **Use when:** everyone runs scripts on one machine.
- **Cost / risk:** confusion if legacy `.env` swaps 11434/11435 meanings.
- **Status:** candidate

### `docker-compose`

- **Use when:** reproducible multi-container dev.
- **Cost / risk:** extra compose file maintenance.
- **Status:** candidate

### `tunnel-remote`

- **Use when:** shared GPU or remote Ollama.
- **Cost / risk:** latency, TLS termination.
- **Status:** candidate

## Current selection (this repo)

- [x] `doc-defaults`
- [ ] `docker-compose`
- [ ] `tunnel-remote`

**Canonical URL table (fill in):**

| Role | URL |
|------|-----|
| A2A Server | http://localhost:3000 |
| Client API (web) | http://localhost:5173/api/a2a |
| AI Hub | http://localhost:11435 |
| Ollama (generate) | http://localhost:11434 |
| Ollama (embeddings if local) | http://localhost:11434 |
| Meilisearch | http://localhost:7700 |

**Notes:**
- The doc/default ports in `AGENTS.md` already list these URLs, and `docs/new-request-flow/API-SERVER.md` drives the Meilisearch defaults.

## Implementation backlog

- [ ] Reconcile `.env.example` port comments with `AGENTS.md` (optional doc PR).

## Related

- `AGENTS.md` (Default Ports, `A2A_SERVER_URL`)
- `.env.example`
- `docs/alternatives/llm-provider/VARIANTS.md`

## Open questions

- …
