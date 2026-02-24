# Simulation Action 3 - Analysis

## Request

Результат выполнения первого шага:
```json
{
  "action": "step_result",
  "stepId": "vue-import-detect",
  "result": {
    "broken_imports": [
      { "file": "...", "specifier": "../components/Header" },
      ...
    ]
  }
}
```

## Response

Переход к следующему шагу (vue-import-resolve):
```json
{
  "outcome": "action_executing",
  "currentStep": 2,
  "executingAction": {
    "actionId": "vue-import-resolve",
    "dsl": {
      "input": {
        "broken_imports": [...]
      }
    }
  }
}
```

## Workflow

```
vue-import-detect result
        ↓
  Переход к
  vue-import-resolve
        ↓
  DSL скрипт для resolve
```

## Chain

1. vue-import-detect ✓
2. vue-import-resolve (текущий)
3. vue-import-apply
4. vue-import-cleanup
