# `fix-vue-imports-batched/5` — request

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
        "currentFile": 2
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
          "file": "resources/js/utils/helpers.js",
          "score": 0.92,
          "snippet": "export { helper, formatDate }"
        }
      ],
      "files": [
        "resources/js/utils/helpers.js"
      ]
    }
  }
}
```
