# Hack 0001: Direct API bypass

**Index:** [docs/README.md](../README.md) | **Etalon:** [etalon-neuron-activation.md](../etalon-neuron-activation.md)

## Status

accepted

## Date

2026-02-20

## Summary

POST to `/api/v1/requests` with context + codeBlocks. Neurons activate from taskText + fileContents + architectural_features (θ).

**Endpoint:** `POST /api/v1/requests`  
**Auth:** `Authorization: Bearer a2a_dev_password`

## Input

- `context.project_path` — project path
- `context.new_task` — `[string]` — task text (→ taskText in activation)
- `context.architectural_features` — optional `[string]` — arch triggers
- `codeBlocks` — optional `[{ path, content }]` — file content triggers

## Neuron activation (θ)

| taskText | codeBlocks | arch | Result |
|----------|------------|------|--------|
| ✓ | — | — | task-triggered |
| — | ✓ | — | content-triggered |
| — | — | ✓ | arch-triggered |
| — | — | — | 0 neurons |

## Poll result

```
GET /api/v1/requests/{promiseId}/result
```

Every 5–6 sec until `completed` or `failed`.
