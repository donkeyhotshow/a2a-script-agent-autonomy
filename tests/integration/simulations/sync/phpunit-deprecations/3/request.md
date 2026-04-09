# `phpunit-deprecations/3` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "знайти застарілі PHPUnit методи",
    "execution": {
      "action": "phpunit-deprecations",
      "step": "scan-phpunit"
    }
  },
  "result": {
    "scan-phpunit": {
      "files": [
        {
          "path": "tests/Unit/UserTest.php"
        },
        {
          "path": "tests/Feature/AuthTest.php"
        }
      ],
      "total": 45
    }
  }
}
```
