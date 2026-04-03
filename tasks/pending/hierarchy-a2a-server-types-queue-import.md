# Task: Fix `queue.ts` import path (code hierarchy / module boundaries)

**Status: done** — import targets `src/services/core/request-processor/request-processor.interfaces` with **`.js` suffix** (NodeNext).

## Definition of done (completed)

- [x] Relative path under `a2a-server/src/types/` → `../services/core/request-processor/request-processor.interfaces.js`
- [x] No `.ts` extension in import specifier (NodeNext emit style)

## Notes

- `bullmq` types may still surface unrelated `tsc` noise; this task scoped **path + `.js` only**.
