# `phpunit-deprecations/3` — response

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
      "step": "detect-deprecations",
      "history": [
        {
          "step": "scan-phpunit",
          "status": "completed"
        }
      ]
    }
  },
  "execute": {
    "script": {
      "input": {
        "files": [
          {
            "path": "tests/Unit/UserTest.php"
          },
          {
            "path": "tests/Feature/AuthTest.php"
          }
        ],
        "deprecatedMethods": [
          "assertEquals",
          "assertInternalType",
          "assertArrayHasKey",
          "assertInstanceOf"
        ]
      },
      "output": "deprecations[]",
      "code": "detect-deprecations"
    }
  }
}
```
