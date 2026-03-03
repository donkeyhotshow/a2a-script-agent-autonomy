# Client Task 03: RAG Package – Simulation & Policy Alignment

## Goal

Align `@a2a/rag` behavior with simulations (`coder`, `auto-ai`, `analyze`, `coder-smart`) and with client-side safety/policy rules, so that:

- RAG search results have the exact structure expected in `result["rag-search"]` in simulations.
- Limits and filters (file types, paths) are respected according to client policies.

## Scope

Packages:
- `a2a-client/packages/rag`

## Requirements

- **Result shape alignment**
  - Ensure RAG search methods (`search`, `buildContext`, etc.) can return data in the shape used by sims:
    - entries with `file` / `path`, `score`, `snippet` (or equivalent), and optional metadata.
  - Provide a helper to transform internal RAG results into the canonical `result["rag-search"]` object for protocol.

- **Query understanding & filters**
  - Wire existing query-understanding / filters so that simulations like `analyze` and `coder` can:
    - request specific file types,
    - restrict search to the current project path,
    - limit result counts as in the sims.

- **Policy integration**
  - Respect client-side policy/limits (see Task 39):
    - max results,
    - allowed directories / extensions,
    - optional disabling of semantic search in some environments.

- **Tests**
  - Use simulation descriptions as guidance to add tests that:
    - perform RAG queries similar to `coder`, `auto-ai`, `analyze`,
    - assert returned structures can be directly embedded into `result["rag-search"]` as used in those sims.

## References

- `simulations/coder/description.md`
- `simulations/auto-ai/description.md`
- `simulations/analyze/description.md`
- `a2a-client/packages/rag/src/*.ts`

