# Greedy dump — sequence state

**Last updated:** 2026-03-29  
**Branch:** `greedy-dump`

## Ordered phases (do not skip)

1. **Inventory** — Confirm SOURCE tree; refresh `TASK-TREE.md` if folders change.
2. **Stub pass** — Keep `mirror/` small; add `stubs/*.txt` manifests where a slice needs anchors.
3. **priority-1 → priority-2** — Implement server actions for highest-value scripts first (fewer files).
4. **priority-3** — Per subproject tasks (`SUBTREE.md`); one action registration batch per project after review.
5. **priority-5 / priority-6** — Large archives and backups; extract scripts under `others/` before coding.
6. **enggineered-prompts** — Last wave: prompts as data assets + optional router copy, not necessarily executable scripts.

## Current cursor

| Step | Status | Notes |
|------|--------|--------|
| Branch created | done | `greedy-dump` |
| Docs + task tree | done | `TASK-TREE.md`, per-folder `TASK.md` |
| Physical sample copy | skipped | Use SOURCE directly or add tiny stubs per task |
| First implementation ticket | pending | Pick `priority-1/bootstrap-platform` or `ml-integration` |

## Log

- 2026-03-29 — Initial STATE, DOCUMENTS-STATE, mirror stubs (no large zip).
