# fix-vue-imports (client validation)

After each server response, client must reply with the matching request shape.

| Step | Server sends | Client must send |
|------|--------------|------------------|
| 1 | Form with choices (fix-vue-imports, auto-ai, task-decomposition) | context + result.choice |
| 2 | execute.script (vue-import-detect) | context + result.broken_imports |
| 3 | execute.script (vue-import-resolve) | context + result.patches |
| 4 | execute.script (vue-import-apply) | context + result.fixed_files |
| 5 | execute.script (vue-import-cleanup) + finalResult | (new task or end) |
