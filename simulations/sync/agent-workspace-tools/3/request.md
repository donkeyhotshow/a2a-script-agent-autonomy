# `agent-workspace-tools/3` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "Golden: workspace tools chain (grep, exists, patch, run-script).",
    "execution": {
      "action": "agent",
      "step": "workspace_chain"
    },
    "workbench": {
      "sections": {}
    },
    "history": [
      {
        "role": "user",
        "message": "Find usages of createApp under src/"
      },
      {
        "role": "assistant",
        "step": "workspace_chain",
        "message": "Searching the repo for createApp under src/."
      },
      {
        "role": "system",
        "message": "grep-search: createApp — 1 match in src/main.ts"
      },
      {
        "role": "assistant",
        "step": "workspace_chain",
        "message": "Verifying src/main.ts exists before editing."
      },
      {
        "role": "system",
        "message": "file-exists: src/main.ts — exists (file)"
      }
    ]
  },
  "result": {
    "file-exists": {
      "success": true,
      "exists": true,
      "isFile": true,
      "isDirectory": false,
      "size": 120,
      "modifiedAt": "2025-03-25T12:00:00.000Z"
    }
  }
}
```
