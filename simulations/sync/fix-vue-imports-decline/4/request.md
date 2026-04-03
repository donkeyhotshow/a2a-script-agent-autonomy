# `fix-vue-imports-decline/4` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-resolve"
    }
  },
  "result": {
    "script": {
      "partial_escalate": true,
      "resolved_count": 1,
      "unresolved_count": 2,
      "patches": [
        {
          "file": "resources/js/Pages/Auth/Login.vue",
          "line": 3,
          "from": "../components/Header",
          "to": "@/components/Header"
        }
      ],
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
    }
  }
}
```
