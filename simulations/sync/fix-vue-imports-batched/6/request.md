# `fix-vue-imports-batched/6` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports-batched",
      "step": "search-exporter",
      "progress": {
        "totalFiles": 50,
        "currentFile": 3
      }
    },
    "vite_config": {
      "file": "vite.config.js"
    },
    "aliases": {
      "@": "resources/js",
      "~": "resources"
    }
  },
  "result": {
    "rag-search": {
      "results": [
        {
          "file": "resources/js/stores/userStore.js",
          "score": 0.88,
          "snippet": "export const userStore = defineStore"
        }
      ],
      "files": [
        "resources/js/stores/userStore.js"
      ]
    }
  }
}
```
