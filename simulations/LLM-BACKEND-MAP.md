# LLM backends — where models come from (simulations vs runtime)

Goldens in `simulations/` exercise the **A2A server + transforms + Client API** contract. They do **not** call Z.AI or Ollama unless you run a live stack. Use this map to know **what is fixture-only** vs **what the real proxy returns**.

## Runtime stack (live)

| Layer | Port (typical dev) | Role |
|-------|-------------------|------|
| **Ollama** | 11435 | Local models (e.g. `qwen3:8b`) |
| **AI Integration proxy** | 11434 | Routes by model/provider; aggregates **`GET /api/tags`** from multiple backends (see `tasks/pending/multi-provider-model-selection.md`) |
| **a2a-server** | 3000 | Builds `request.md`, calls hub URL from env |
| **Client API / Web** | 5173 | Sessions, Web DTO |

**Source of model list at runtime:** `http://localhost:11434/api/tags` (proxy), not raw Ollama alone.

## What simulations carry

| Artifact | Meaning for “which LLM” |
|----------|-------------------------|
| **`request.md`** | **Authoring truth** for this step’s assumed LLM turn: paste the prompt the server would send. Until the server persists `model` on invoke, document intent in the **header** (see below). |
| **`response.md`** | Fixture LLM output; **not** tied to a real provider — treat as synthetic. |
| **`request.json`** | Client API → Server invoke; may gain optional `context` fields for **`model` / provider** when multi-provider selection is implemented (track: `ai-integration/DEV_STATE.md`, `tasks/pending/multi-provider-model-selection.md`). |
| **`server-transforms-*.json`** | Deterministic server ops; no provider. |

## Recommended `request.md` header (optional, human-readable)

For any step that includes `request.md` / `response.md`, you may prefix with a short YAML block so reviewers know **which backend the scenario assumes** (even before JSON fields exist):

```yaml
---
llm_assumed:
  provider: ollama   # z_ai | ollama | synthetic
  model: qwen3:8b
  note: "Fixture only; sim-validate does not parse this block."
---
```

Use **`synthetic`** when the markdown is a minimal stub not matching a real provider API.

## After multi-provider work lands

1. Prefer **`request.json`** (or documented `context.execution.*`) for machine-readable `model` + `provider` when the server contract is fixed.
2. Add a small sync golden that shows one step with **Z.AI-shaped** and one with **Ollama-shaped** upstream (or document both in one `description.md` table).
3. Update this file and [`SCHEMA.md`](SCHEMA.md) with the exact JSON paths.

## Related

- [`SCHEMA.md`](SCHEMA.md) — pipeline and file roles  
- [`tasks/pending/multi-provider-model-selection.md`](../tasks/pending/multi-provider-model-selection.md)  
- [`ai-integration/DEV_STATE.md`](../ai-integration/DEV_STATE.md)
