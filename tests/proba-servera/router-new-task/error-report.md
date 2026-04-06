# Test Failure Report: router-new-task

**Timestamp:** 2026-04-06T17:27:58.262Z

## Summary

- **Status:** FAIL
- **Differences Found:** 0

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|

## Input (Request)

```json
{
  "context": {
    "task": "analyze the codebase",
    "execution": {
      "action": "task",
      "step": "new"
    }
  },
  "result": {
    "message": "analyze the codebase"
  }
}
```

## Expected Structure (after $proba.ignorePaths)

```json
{
  "type": "object",
  "keys": {
    "context": {
      "type": "object",
      "keys": {
        "task": {
          "type": "string",
          "keys": null
        },
        "execution": {
          "type": "object",
          "keys": {
            "action": {
              "type": "string",
              "keys": null
            },
            "step": {
              "type": "string",
              "keys": null
            }
          }
        }
      }
    },
    "execute": {
      "type": "object",
      "keys": {
        "form": {
          "type": "object",
          "keys": {
            "title": {
              "type": "string",
              "keys": null
            },
            "choices": {
              "type": "array",
              "itemTypes": [
                {
                  "type": "object",
                  "keys": {
                    "id": {
                      "type": "string",
                      "keys": null
                    },
                    "label": {
                      "type": "string",
                      "keys": null
                    },
                    "description": {
                      "type": "string",
                      "keys": null
                    }
                  }
                }
              ],
              "keys": null
            }
          }
        }
      }
    }
  }
}
```

## Actual Structure (after $proba.ignorePaths)

```json
{
  "type": "object",
  "keys": {
    "context": {
      "type": "object",
      "keys": {
        "task": {
          "type": "string",
          "keys": null
        },
        "execution": {
          "type": "object",
          "keys": {
            "action": {
              "type": "string",
              "keys": null
            },
            "step": {
              "type": "string",
              "keys": null
            }
          }
        }
      }
    },
    "execute": {
      "type": "object",
      "keys": {
        "form": {
          "type": "object",
          "keys": {
            "title": {
              "type": "string",
              "keys": null
            },
            "choices": {
              "type": "array",
              "itemTypes": [
                {
                  "type": "object",
                  "keys": {
                    "id": {
                      "type": "string",
                      "keys": null
                    },
                    "label": {
                      "type": "string",
                      "keys": null
                    },
                    "description": {
                      "type": "string",
                      "keys": null
                    }
                  }
                }
              ],
              "keys": null
            }
          }
        }
      }
    }
  }
}
```

## Full Expected

```json
{
  "$proba": {
    "ignorePaths": [
      "context.session_id",
      "context.result",
      "context.message",
      "context.execution.routerAnalysis"
    ],
    "inputAbsentPaths": [
      "context.history"
    ]
  },
  "context": {
    "task": "string",
    "execution": {
      "action": "task",
      "step": "router"
    }
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        {
          "id": "string",
          "label": "string",
          "description": "string"
        }
      ]
    }
  }
}
```

## Full Actual

```json
{
  "context": {
    "session_id": "srv_sess_7f351088-719e-4aca-a856-7a4f3e8f32ec",
    "task": "analyze the codebase",
    "execution": {
      "action": "task",
      "step": "router"
    },
    "result": {
      "message": "analyze the codebase"
    },
    "message": "analyze the codebase"
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        {
          "id": "architecture-validator",
          "label": "Validates architectural dependency rules between layers in a Laravel project (mirrors the `architecture-validator.js` script).",
          "description": "*Priority:** 8"
        },
        {
          "id": "batch-generate-patches",
          "label": "Generates patches for Vue components based on migration inventory (mirrors the `batch-generate-patches.js` script).",
          "description": "*Priority:** 7"
        },
        {
          "id": "CLI Hub Action",
          "label": "*ID:** `cli-hub`",
          "description": "*Description:** Dispatch CLI commands to the Laravel agent system core. Acts as a hub for routing commands to appropriate handlers. **Source:** `laravel-agent-workspace-tools/scripts/cli-hub.js`"
        },
        {
          "id": "List Tickets Action",
          "label": "*ID:** `list-tickets`",
          "description": "*Description:** List all tickets from the AI agent system ticket directory. Shows pending, approved, and completed tickets. **Source:** `laravel-agent-workspace-tools/scripts/list-tickets.js`"
        },
        {
          "id": "Migrate PHP Components Action",
          "label": "*ID:** `migrate-php-components`",
          "description": "*Description:** Migrate PHP business logic components (Services, Models, Controllers, Validators, DTOs) through the AI agent ticket system. Validates PHP syntax, creates backups, and categorizes files. **Source:** `laravel-agent-workspace-tools/scripts/migrate-php-components.js`"
        },
        {
          "id": "Migrate Tests Action",
          "label": "*ID:** `migrate-tests`",
          "description": "*Description:** Migrate test files (PHP, JavaScript, TypeScript) through the AI agent system. Handles PHPUnit, Pest, Vitest, Jest, Playwright tests with validation and categorization. **Source:** `laravel-agent-workspace-tools/scripts/migrate-tests.js`"
        },
        {
          "id": "Process Response Patches Action",
          "label": "*ID:** `process-response-patches`",
          "description": "*Description:** Extract patches from AI response, store them using PatchStorage, and return modified response with patch file paths. **Source:** `laravel-agent-workspace-tools/scripts/process-response-patches.js`"
        },
        {
          "id": "Test System Action",
          "label": "*ID:** `test-system`",
          "description": "*Description:** Run system tests using the Laravel agent system core modules. Wrapper for `runSystemTests()`. **Source:** `laravel-agent-workspace-tools/scripts/test-system.js`"
        },
        {
          "id": "validate-config",
          "label": "Validates configuration files against JSON schemas (mirrors the `validate-config.js` script).",
          "description": "*Priority:** 6"
        },
        {
          "id": "dialog",
          "label": "AI діалог з користувачем",
          "description": "Вільний текстовий діалог з моделлю без інструментів коду."
        },
        {
          "id": "agent",
          "label": "Agent (універсальний режим)",
          "description": "Агент з інструментами: пошук по коду, файли, команди."
        },
        {
          "id": "task-decomposition",
          "label": "Декомпозиція задачі",
          "description": "Розбиття задачі на підзадачі та план виконання."
        },
        {
          "id": "fix-vue-imports",
          "label": "Виправлення Vue imports",
          "description": "Скриптований сценарій для виправлення імпортів у Vue."
        },
        {
          "id": "fix-laravel-namespaces-and-uses",
          "label": "Laravel: namespace та use",
          "description": "Скриптований сценарій для PHP namespace та use."
        }
      ]
    }
  }
}
```

## Directive checks

- execute.form.choices: array length 14, expected 1
