# Agent RAG chain limits — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- **`A2A_AGENT_RAG_CHAIN_MAX`** caps chain depth when set (SDK `agent-rag-chain.ts` and Vite `agent-rag-chain.js`).
- Project root for RAG can come from **`A2A_RAG_PROJECT_PATH`** or **`A2A_PROJECT_PATH`**, else session/project helpers.

## Context

Long agent+RAG chains cost latency and tokens. Wrong project path indexes or searches the wrong tree.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `default-cap` | Env unset | Code default max applies (see implementation). | Good until you hit timeouts. |
| `strict-low` | Small max | Fail fast on deep chains. | Safer for shared dev machines. |
| `explicit-project` | Both path envs set | CI pins repo root for RAG. | Avoids cwd ambiguity. |

## Current selection (this repo)

- [ ] `default-cap`
- [ ] `strict-low`
- [ ] `explicit-project`

**Values:** `A2A_AGENT_RAG_CHAIN_MAX` = ___ | `A2A_RAG_PROJECT_PATH` = ___

**Notes:**

## Implementation backlog

- [ ] Document defaults in `a2a-client/packages/sdk/CONFIGURATION.md` if missing.

## Related

- `a2a-client/packages/sdk/src/server/lib/agent-rag-chain.ts`
- `a2a-client/vite-plugin-a2a/routes/utils/agent-rag-chain.js`

## Open questions

- …
