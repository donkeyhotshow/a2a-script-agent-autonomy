# Test Failure Report: agent-tool-grep-search

**Timestamp:** 2026-04-06T19:32:10.378Z

## Summary

- **Status:** FAIL
- **Differences Found:** 1

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"file-exists":{ | — |

## Input (Request)

```json
{
  "context": {
    "task": "зчитати файл і знайти функцію",
    "execution": {
      "action": "agent",
      "step": "tool_grep_search"
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
      }
    ],
    "workbench": {
      "sections": {}
    }
  },
  "result": {
    "grep-search": {
      "pattern": "calculateTotal",
      "path": ".",
      "matches": [
        {
          "file": "utils/helpers.js",
          "line": 1,
          "content": "function calculateTotal(items) {"
        }
      ]
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
        "file-exists": {
          "type": "object",
          "keys": {
            "path": {
              "type": "string",
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
            "grep-search": {
              "type": "object",
              "keys": {
                "pattern": {
                  "type": "string",
                  "keys": null
                },
                "path": {
                  "type": "string",
                  "keys": null
                },
                "matches": {
                  "type": "array",
                  "itemTypes": [
                    {
                      "type": "object",
                      "keys": {
                        "file": {
                          "type": "string",
                          "keys": null
                        },
                        "line": {
                          "type": "number",
                          "keys": null
                        },
                        "content": {
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
      "step": "tool_file_exists"
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
      }
    ]
  },
  "execute": {
    "file-exists": {
      "path": "utils/helpers.js"
    }
  }
}
```

## Full Actual

```json
{
  "context": {
    "session_id": "srv_sess_21c909e5-61bd-4e8c-977b-c724d5a6f2f8",
    "task": "зчитати файл і знайти функцію",
    "execution": {
      "action": "agent",
      "step": "tool_grep_search"
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
      }
    ],
    "workbench": {
      "sections": {}
    },
    "result": {
      "grep-search": {
        "pattern": "calculateTotal",
        "path": ".",
        "matches": [
          {
            "file": "utils/helpers.js",
            "line": 1,
            "content": "function calculateTotal(items) {"
          }
        ]
      },
      "message": "зчитати файл і знайти функцію"
    },
    "requestPhase": "llm_error",
    "hubLlmResubmitCount": 14,
    "llmPromiseId": "2350ccaa18e14b559e6fdc1b00eaad23"
  },
  "outcome": "failed",
  "error": "LLM hub promise lost after 2 resubmit(s); start a new turn or check AI hub"
}
```

## Directive checks

- context.history: array length 4, expected 6
- execute: expected object, got undefined
