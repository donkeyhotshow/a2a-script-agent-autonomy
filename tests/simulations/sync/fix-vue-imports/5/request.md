# `fix-vue-imports/5` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-escalate"
    },
    "unresolved_imports": [
      {
        "file": "resources/js/Pages/Dash/Widget.vue",
        "line": 2,
        "specifier": "./UserCard",
        "reason": "ambiguous",
        "candidates": [
          "resources/js/features/a/UserCard.vue",
          "resources/js/features/b/UserCard.vue"
        ]
      },
      {
        "file": "resources/js/App.vue",
        "line": 12,
        "specifier": "@/legacy/missing",
        "reason": "not_found"
      }
    ]
  },
  "result": {
    "form": {
      "choice": "coder"
    }
  }
}
```
