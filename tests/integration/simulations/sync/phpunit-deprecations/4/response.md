# `phpunit-deprecations/4` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "знайти застарілі PHPUnit методи",
    "workbench": {
      "sections": {}
    },
    "execution": {
      "action": "phpunit-deprecations",
      "step": "generate-deprecations-report"
    },
    "history": [
      {
        "role": "system",
        "step": "scan-phpunit",
        "status": "completed",
        "result": {
          "total": 45
        }
      },
      {
        "role": "system",
        "step": "detect-deprecations",
        "status": "completed",
        "result": {
          "deprecations": 2
        }
      }
    ]
  },
  "execute": {
    "script": {
      "input": {
        "deprecations": [
          {
            "method": "assertEquals",
            "file": "tests/Unit/UserTest.php",
            "line": 15,
            "suggestion": "assertEqualsWithDelta"
          },
          {
            "method": "assertInternalType",
            "file": "tests/Feature/AuthTest.php",
            "line": 22,
            "suggestion": "assertIsArray"
          }
        ],
        "format": "markdown"
      },
      "output": "deprecations_report",
      "code": "generate-deprecations-report"
    }
  }
}
```
