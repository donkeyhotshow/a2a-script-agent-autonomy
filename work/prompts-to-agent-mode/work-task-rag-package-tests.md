# RAG package unit tests

## Sources

- [`tasks/rag-package-tests.md`](../tasks/rag-package-tests.md)
- [`a2a-client/packages/rag/tests/rag.test.js`](../a2a-client/packages/rag/tests/rag.test.js)
- [`DEV_STATE.md`](../DEV_STATE.md)

## Agent prompt (copy)

Implement the missing RAG package tests: replace every `expect(true).toBe(true)` stub in `a2a-client/packages/rag/tests/rag.test.js` with real assertions for `indexProject`, `search`, `chunkFile`, `BM25`, `HybridSearch`, and `Reranker`. No network IO; use mocks as needed. Run `cd a2a-client && npm test` to verify.

## Completion

- [ ] Done (all stub TODOs turned into passing tests with coverage notes in DEV_STATE)
