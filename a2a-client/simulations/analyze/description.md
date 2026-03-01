# analyze-dialog (client validation)

| Step | Server sends | Client must send |
|------|--------------|------------------|
| 1 | actions[] + fallbackActions[] | context + result.action |
| 2 | execute.form (message) | context + result.message |
| 3 | execute.rag-search | context + result["rag-search"] (results, files) |
| 4 | execute.form (choices: continue_search, save_report) + input message/path | context + result.choice (+ result.message or result.path) |
| 5 | execute.rag-search | context + result["rag-search"] |
| 6 | execute.form (choices) | context + result.choice (+ message/path) |
| 7 | execute.write-file | context + result["write-file"] (path, success) |
| 8 | execute.form (completed) | (new task or end) |
