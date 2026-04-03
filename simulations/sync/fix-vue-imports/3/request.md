# `fix-vue-imports/3` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    }
  },
  "result": {
    "script": {
      "broken_imports": [
        {
          "file": "resources/js/Pages/Auth/Login.vue",
          "line": 3,
          "specifier": "import Header from '../components/Header'"
        },
        {
          "file": "resources/js/Pages/Dash/Widget.vue",
          "line": 2,
          "specifier": "import Card from './UserCard'"
        },
        {
          "file": "resources/js/App.vue",
          "line": 12,
          "specifier": "import legacy from '@/legacy/missing'"
        }
      ]
    }
  }
}
```
