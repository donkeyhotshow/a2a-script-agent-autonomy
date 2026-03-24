# Monorepo dev launch — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- Services and **default ports** in `AGENTS.md`: Server 3000, Client API (Vite) 5173 / SDK 3001, AI Hub 11435, Ollama 11434.

## Context

Root `package.json` points **`npm run dev`** at `start-all.bat` (Windows). You still choose **what you personally start** daily and what runs in **CI** (often subsets).

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `full-stack-script` | `start-all` / equivalent | All processes: server, client, AI hub, Ollama as scripted. | Closest to integrated system. |
| `manual-subset` | Only needed services | e.g. server + Vite without Meilisearch. | Faster machine, less RAM. |
| `server-only-sim` | Server + sim tools | No web UI; `sim:lint` / `sim:run`. | Backend-focused work. |

### `full-stack-script`

- **Use when:** end-to-end UI + LLM debugging.
- **Cost / risk:** startup time, port conflicts.
- **Status:** candidate

### `manual-subset`

- **Use when:** frontend-only with mocked API or backend-only.
- **Cost / risk:** subtle “missing service” bugs.
- **Status:** candidate

### `server-only-sim`

- **Use when:** golden sim maintenance, transforms.
- **Cost / risk:** no quick manual UI check.
- **Status:** candidate

## Current selection (this repo)

- [ ] `full-stack-script`
- [ ] `manual-subset`
- [ ] `server-only-sim`

**Where it applies:**

**Notes:**

## Implementation backlog

- [ ] If you add non-Windows launch, mirror `start-all.bat` behavior in `docs/SYSTEM_STARTUP.md`.

## Related

- `package.json` (`dev`), `docs/SYSTEM_STARTUP.md`, `AGENTS.md` (Starting the system)

## Open questions

- …
