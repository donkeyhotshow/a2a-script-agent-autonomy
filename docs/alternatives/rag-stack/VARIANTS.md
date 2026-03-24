# RAG / code search stack — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- Server actions may call **`rag-search`**; package `@a2a/rag` integrates **Meilisearch** by default (`MEILISEARCH_HOST`, etc. per `docs/new-request-flow/API-SERVER.md`).

## Context

You can run **full RAG** (index + Meilisearch), **degraded** (action errors or stubs), or **feature-off** for environments that do not run search infra.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `meilisearch-on` | Meilisearch + indexer | BM25 search at `localhost:7700` (typical). | Matches `packages/rag` defaults. |
| `local-fs-only` | No Meilisearch | Use grep/read-file flows only; RAG actions fail or noop. | Minimal docker footprint. |
| `hosted-search` | Remote Meilisearch | Cloud project; keys via `MEILISEARCH_API_KEY`. | Shared team index. |

### `meilisearch-on`

- **Use when:** you need `rag-search` in real workflows.
- **Cost / risk:** another service, index size, RAM.
- **Status:** candidate

### `local-fs-only`

- **Use when:** LLM/dialog only labs; CI without search.
- **Cost / risk:** simulations or UI paths that expect RAG may need mocks.
- **Status:** candidate

### `hosted-search`

- **Use when:** production or shared dev index.
- **Cost / risk:** network, ACLs, billing.
- **Status:** candidate

## Current selection (this repo)

- [ ] `meilisearch-on`
- [ ] `local-fs-only`
- [ ] `hosted-search`

**Where it applies:**

**Notes:**

## Implementation backlog

- [ ] Document “minimal stack” vs “full stack” in `docs/SYSTEM_STARTUP.md` cross-link.

## Related

- `a2a-client/packages/rag/ARCHITECTURE.md`
- `a2a-client/packages/sdk/src/server/services/meilisearch-client.ts`
- `docs/new-request-flow/API-SERVER.md` (Meilisearch env)

## Open questions

- …
