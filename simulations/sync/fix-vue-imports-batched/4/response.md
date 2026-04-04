# `fix-vue-imports-batched/4` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

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
  "execute": {
    "rag-search": {
      "query": "export { helper }",
      "description": "Пошук файлу, який експортує 'helper' з помилки",
      "output": "exporter_file"
    }
  }
}
```
