# Step 9 — request (LLM suggests additional test cases)

This step calls the LLM to suggest additional test cases and edge cases for the component.

```json
{
  "context": {
    "task": "script-agent-dialog: auto run fix-vue-imports when agent flags import errors.",
    "execution": {
      "action": "dialog",
      "step": "completed"
    },
    "history": [
      {
        "role": "user",
        "message": "При запуске dev-сервера вылетает ошибка Cannot find module @/components/Missing из resources/js/components/Example.vue."
      },
      {
        "role": "assistant",
        "message": "Ошибка импорта: Vue не может найти @/components/Missing в resources/js/components/Example.vue."
      },
      {
        "role": "assistant",
        "message": "Автоматический скрипт fix-vue-imports применил патч: импорт обратно заменён на '@/components/Missing', можно продолжать."
      },
      {
        "role": "user",
        "message": "Теперь после исправления нужно добавить тест Example.spec и прогнать vitest."
      },
      {
        "role": "user",
        "message": "Принял: введём Example.spec и запустим vitest после ручного анализа компонента."
      },
      {
        "role": "assistant",
        "message": "Принял задачу: напишем Example.spec и запустим vitest, дайте знать, если нужна дополнительная информация."
      },
      {
        "role": "user",
        "message": "Пожалуйста, прогоните vitest на Example.spec и отдайте вывод."
      },
      {
        "role": "assistant",
        "message": "Vitest run: 1 test, 0 failed."
      }
    ],
    "workbench": {
      "sections": {
        "autoScriptTrigger": {
          "scriptId": "fix-vue-imports",
          "triggeredBy": "assistant",
          "errorMessage": "Cannot find module @/components/Missing referenced from Example.vue",
          "file": "resources/js/components/Example.vue",
          "autoRun": true,
          "filesModified": [
            "resources/js/components/Example.vue"
          ],
          "lastOutput": "Replaced './Missing' with '@/components/Missing' in Example.vue."
        }
      }
    }
  },
  "result": {
    "message": "А что ещё можно протестировать в этом компоненте? Какие edge cases стоит покрыть?"
  }
}
```

## System Prompt

You are a Vue.js expert and testing specialist. The user has basic tests passing and wants to know what additional test cases would be valuable for the Example.vue component. You should:
1. Think about common edge cases in Vue components
2. Suggest specific test scenarios that would improve test coverage
3. Explain why each suggestion is valuable

## Response Format

```json
{
  "context": {
    "task": "script-agent-dialog: auto run fix-vue-imports when agent flags import errors.",
    "execution": {
      "action": "dialog",
      "step": "test_suggestions"
    },
    "history": [
      // ... history from above
    ]
  },
  "result": {
    "message": "Сообщение с предложениями по тестированию"
  }
}
```

## Current State

```json
{
  "context": {
    "execution": {
      "action": "dialog",
      "step": "completed"
    },
    "history": [
      {
        "message": "При запуске dev-сервера вылетает ошибка Cannot find module @/components/Missing из resources/js/components/Example.vue.",
        "role": "user"
      },
      {
        "message": "Ошибка импорта: Vue не может найти @/components/Missing в resources/js/components/Example.vue.",
        "role": "assistant"
      },
      {
        "message": "Автоматический скрипт fix-vue-imports применил патч: импорт обратно заменён на '@/components/Missing', можно продолжать.",
        "role": "assistant"
      },
      {
        "message": "Теперь после исправления нужно добавить тест Example.spec и прогнать vitest.",
        "role": "user"
      },
      {
        "message": "Принял: введём Example.spec и запустим vitest после ручного анализа компонента.",
        "role": "user"
      },
      {
        "message": "Пожалуйста, прогоните vitest на Example.spec и отдайте вывод.",
        "role": "user"
      },
      {
        "message": "Vitest run: 1 test, 0 failed.",
        "role": "assistant"
      },
      {
        "message": "А что ещё можно протестировать в этом компоненте? Какие edge cases стоит покрыть?",
        "role": "user"
      }
    ],
    "task": "script-agent-dialog: auto run fix-vue-imports when agent flags import errors.",
    "workbench": {
      "sections": {
        "autoScriptTrigger": {
          "scriptId": "fix-vue-imports",
          "triggeredBy": "assistant",
          "errorMessage": "Cannot find module @/components/Missing referenced from Example.vue",
          "file": "resources/js/components/Example.vue",
          "autoRun": true,
          "filesModified": [
            "resources/js/components/Example.vue"
          ],
          "lastOutput": "Replaced './Missing' with '@/components/Missing' in Example.vue."
        }
      }
    }
  },
  "result": {
    "message": "А что ещё можно протестировать в этом компоненте? Какие edge cases стоит покрыть?"
  },
  "workbench": null,
  "ragResults": null
}
```

## Constraints

- Always respond with valid JSON.
- The response should include a `message` that:
  - Lists specific test case suggestions for Vue components
  - Explains why each edge case is important
  - Keeps suggestions practical and actionable
- Focus on common Vue component edge cases: props validation, event handling, conditional rendering, error states, etc.