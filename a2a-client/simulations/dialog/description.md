# dialog (client validation)

| Step | Server sends | Client must send |
|------|--------------|------------------|
| 1 | actions[] + fallbackActions[] | context + result.action (e.g. "dialog") |
| 2+ | execute.form (message input) | context + result.message |
