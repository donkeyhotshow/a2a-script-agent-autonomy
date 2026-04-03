# Step 7 — request (vitest instruction)

Mirror of request.json: user asks for vitest output after Example.spec is added.

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
    "message": "Пожалуйста, прогоните vitest на Example.spec и отдайте вывод."
  }
}
```
