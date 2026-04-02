# RAG package stub tests

**Status:** open (2026-04-03)
**Tracked in:** [`DEV_STATE.md`](../DEV_STATE.md) root backlog under RAG coverage; [`a2a-client/packages/rag/tests/rag.test.js`](../a2a-client/packages/rag/tests/rag.test.js)

## Goal

Replace placeholder TODOs in `a2a-client/packages/rag/tests/rag.test.js` with actual unit tests that cover every exported helper currently stubbed with `expect(true).toBe(true)` (indexProject, search, chunkFile, BM25, HybridSearch, Reranker). The aim is 100% test coverage for the RAG package’s core utilities.

## Scope

1. Describe the expected behavior for each helper (e.g., `chunkFile` should split on tokens, `BM25` should score hits with given term frequencies).
2. Implement tests that exercise each helper’s success and likely error path; prefer mocking external dependencies (e.g., file access) so tests stay fast.
3. Replace the `TODO` comments and stub expectations with real assertions, and ensure the suite passes (`cd a2a-client && npm test`).
4. Document any remaining mocks/stubs in the spec so future developers know what’s covered.

## Acceptance

- [ ] All placeholder tests removed and real assertions added.
- [ ] `npm test` passes for `a2a-client/packages/rag/tests/rag.test.js` without reliance on network/integration fixtures.
- [ ] New assertions are referenced in `DEV_STATE.md` and `work/STATE.md` if the task becomes a tracked Sxx row.
