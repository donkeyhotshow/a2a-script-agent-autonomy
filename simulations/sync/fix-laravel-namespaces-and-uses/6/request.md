# `fix-laravel-namespaces-and-uses/6` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "виправити namespace та use у Laravel PHP файлах",
    "execution": {
      "action": "fix-laravel-namespaces-and-uses",
      "step": "laravel-composer-autoload"
    }
  },
  "result": {
    "execute-command": {
      "command": "composer dump-autoload -o",
      "exitCode": 0,
      "stdout": "Generating optimized autoload files\nGenerated optimized autoload files containing 1234 classes\n",
      "stderr": ""
    }
  }
}
```
