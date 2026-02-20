# Task 003: Index — integrate search.service

**Index:** [tasks/README.md](README.md)

---

## Problem

`queryIndex` in [index-query.ts](../a2a-server/src/knowledge/index-query.ts) returns placeholder: `{ question }` only. No semantic search, no file paths/snippets.

## Solution

Integrate with `search.service` (semanticSearch / hybridSearch) when implemented. Return `IndexAnswer[]` with `filePath`, `content`, `score`.

## Files

- [a2a-server/src/knowledge/index-query.ts](a2a-server/src/knowledge/index-query.ts)

## Dependencies

- search.service must exist (or stub)
- [a2a-ml-knowledge-separation-plan.md](../plans/a2a-ml-knowledge-separation-plan.md)

## Verification

Run etalon D. Index answers should include file paths for "Where is class User used?".

## Prev / Next

— | —
