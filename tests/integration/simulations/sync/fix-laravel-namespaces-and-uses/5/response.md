# `fix-laravel-namespaces-and-uses/5` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "виправити namespace та use у Laravel PHP файлах",
    "execution": {
      "action": "fix-laravel-namespaces-and-uses",
      "step": "laravel-composer-autoload"
    },
    "workbench": {
      "sections": {
        "currentTask": "виправити namespace та use у Laravel PHP файлах"
      }
    }
  },
  "execute": {
    "execute-command": {
      "command": "composer dump-autoload -o"
    }
  }
}
```
