# `fix-vue-imports-batched/7` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports-batched",
      "step": "completed",
      "status": "completed",
      "progress": {
        "totalFiles": 50,
        "currentFile": 50
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
    "form": {
      "title": "Готово! Виправлено 50 файлів",
      "choices": [
        {
          "id": "done",
          "label": "OK",
          "description": "Confirm completion after all batched files were processed."
        }
      ]
    }
  },
  "result": {
    "completed": true,
    "fixed_count": 50
  }
}
```
