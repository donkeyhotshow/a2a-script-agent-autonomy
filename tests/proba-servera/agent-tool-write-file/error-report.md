# Test Failure Report: agent-tool-write-file

**Timestamp:** 2026-04-06T16:52:29.466Z

## Summary

- **Status:** FAIL
- **Differences Found:** 1

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"execute-comman | — |

## Input (Request)

```json
{
  "context": {
    "task": "зчитати файл і знайти функцію",
    "execution": {
      "action": "agent",
      "step": "tool_write_file"
    },
    "history": [
      {
        "role": "user",
        "message": "Знайди функцію calculateTotal в utils/helpers.js"
      },
      {
        "role": "assistant",
        "step": "tool_rag",
        "message": "rag-search: simulations sync agent SCHEMA received.json — 2 top hits"
      },
      {
        "role": "assistant",
        "step": "tool_list_directory",
        "message": "Listed directory: simulations, a2a-client, a2a-server"
      },
      {
        "role": "assistant",
        "step": "tool_read_file",
        "message": "Read utils/helpers.js (3 lines)"
      },
      {
        "role": "assistant",
        "step": "tool_grep_search",
        "message": "Grep search for 'calculateTotal' found 1 match"
      },
      {
        "role": "assistant",
        "step": "tool_file_exists",
        "message": "File exists: utils/helpers.js"
      },
      {
        "role": "assistant",
        "step": "tool_edit_patch",
        "message": "Applied patch to utils/helpers.js"
      }
    ],
    "workbench": {
      "sections": {}
    }
  },
  "result": {
    "write-file": {
      "path": "utils/helpers.js",
      "success": true
    }
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
        },
        "workbench": {
          "type": "object",
          "keys": {
            "sections": {
              "type": "object",
              "keys": {}
            }
          }
        },
        "history": {
          "type": "array",
          "itemTypes": [
            {
              "type": "object",
              "keys": {
                "role": {
                  "type": "string",
                  "keys": null
                },
                "message": {
                  "type": "string",
                  "keys": null
                }
              }
            }
          ],
          "keys": null
        }
      }
    },
    "execute": {
      "type": "object",
      "keys": {
        "execute-command": {
          "type": "object",
          "keys": {
            "command": {
              "type": "string",
              "keys": null
            },
            "timeout": {
              "type": "number",
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
        "session_id": {
          "type": "string",
          "keys": null
        },
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
        },
        "history": {
          "type": "array",
          "itemTypes": [
            {
              "type": "object",
              "keys": {
                "role": {
                  "type": "string",
                  "keys": null
                },
                "message": {
                  "type": "string",
                  "keys": null
                }
              }
            }
          ],
          "keys": null
        },
        "workbench": {
          "type": "object",
          "keys": {
            "sections": {
              "type": "object",
              "keys": {}
            }
          }
        },
        "result": {
          "type": "object",
          "keys": {
            "write-file": {
              "type": "object",
              "keys": {
                "path": {
                  "type": "string",
                  "keys": null
                },
                "success": {
                  "type": "boolean",
                  "keys": null
                }
              }
            },
            "message": {
              "type": "string",
              "keys": null
            }
          }
        },
        "requestPhase": {
          "type": "string",
          "keys": null
        },
        "hubLlmResubmitCount": {
          "type": "number",
          "keys": null
        },
        "llmPromiseId": {
          "type": "string",
          "keys": null
        }
      }
    },
    "outcome": {
      "type": "string",
      "keys": null
    },
    "error": {
      "type": "string",
      "keys": null
    }
  }
}
```

## Full Expected

```json
{
  "context": {
    "execution": {
      "action": "agent",
      "step": "tool_execute_command"
    },
    "workbench": {
      "sections": {}
    },
    "history": [
      {
        "role": "string",
        "message": "string"
      },
      {
        "role": "string",
        "message": "string"
      },
      {
        "role": "string",
        "message": "string"
      },
      {
        "role": "string",
        "message": "string"
      },
      {
        "role": "string",
        "message": "string"
      },
      {
        "role": "string",
        "message": "string"
      },
      {
        "role": "string",
        "message": "string"
      },
      {
        "role": "string",
        "message": "string"
      }
    ]
  },
  "execute": {
    "execute-command": {
      "command": "node -e \"const h = require('./utils/helpers'); console.log(h.calculateTotal([{price: 10}, {price: 20}]));\"",
      "timeout": 10000
    }
  }
}
```

## Full Actual

```json
{
  "context": {
    "session_id": "srv_sess_201505ec-bea6-471c-868b-dad4fe5cee33",
    "task": "зчитати файл і знайти функцію",
    "execution": {
      "action": "agent",
      "step": "tool_write_file"
    },
    "history": [
      {
        "role": "user",
        "message": "Знайди функцію calculateTotal в utils/helpers.js"
      },
      {
        "role": "assistant",
        "step": "tool_rag",
        "message": "rag-search: simulations sync agent SCHEMA received.json — 2 top hits"
      },
      {
        "role": "assistant",
        "step": "tool_list_directory",
        "message": "Listed directory: simulations, a2a-client, a2a-server"
      },
      {
        "role": "assistant",
        "step": "tool_read_file",
        "message": "Read utils/helpers.js (3 lines)"
      },
      {
        "role": "assistant",
        "step": "tool_grep_search",
        "message": "Grep search for 'calculateTotal' found 1 match"
      },
      {
        "role": "assistant",
        "step": "tool_file_exists",
        "message": "File exists: utils/helpers.js"
      },
      {
        "role": "assistant",
        "step": "tool_edit_patch",
        "message": "Applied patch to utils/helpers.js"
      }
    ],
    "workbench": {
      "sections": {}
    },
    "result": {
      "write-file": {
        "path": "utils/helpers.js",
        "success": true
      },
      "message": "зчитати файл і знайти функцію"
    },
    "requestPhase": "llm_error",
    "hubLlmResubmitCount": 14,
    "llmPromiseId": "6a6669f23f40483aa5dfda03caff7b16"
  },
  "outcome": "failed",
  "error": "LLM hub promise lost after 2 resubmit(s); start a new turn or check AI hub"
}
```

## Directive checks

- context.history: array length 7, expected 8
- execute: expected object, got undefined
