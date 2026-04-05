# Test Failure Report: agent-tool-execute-command

**Timestamp:** 2026-04-05T19:41:36.160Z

## Summary

- **Status:** FAIL
- **Differences Found:** 1

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"form":{"type": | — |

## Input (Request)

```json
{
  "context": {
    "task": "run npm test",
    "execution": {
      "action": "agent",
      "step": "tool_execute_command"
    },
    "history": [
      {
        "role": "user",
        "message": "run npm test"
      },
      {
        "role": "assistant",
        "step": "tool_execute_command",
        "message": "Command completed: exitCode 0, stdout '3 tests passed'"
      }
    ],
    "workbench": {
      "sections": {}
    }
  },
  "result": {
    "execute-command": {
      "command": "npm test",
      "timeout": 10000
    }
  }
}
```

## Expected Structure

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
            "description": {
              "type": "string",
              "keys": null
            },
            "input": {
              "type": "array",
              "itemTypes": [
                {
                  "type": "object",
                  "keys": {
                    "name": {
                      "type": "string",
                      "keys": null
                    },
                    "type": {
                      "type": "string",
                      "keys": null
                    },
                    "label": {
                      "type": "string",
                      "keys": null
                    },
                    "required": {
                      "type": "boolean",
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

## Actual Structure

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
      "step": "request"
    },
    "workbench": {
      "sections": {}
    }
  },
  "execute": {
    "form": {
      "title": "string",
      "description": "string",
      "input": [
        {
          "name": "string",
          "type": "string",
          "label": "string",
          "required": true
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
    "task": "run npm test",
    "execution": {
      "action": "agent",
      "step": "tool_execute_command"
    },
    "history": [
      {
        "role": "user",
        "message": "run npm test"
      },
      {
        "role": "assistant",
        "step": "tool_execute_command",
        "message": "Command completed: exitCode 0, stdout '3 tests passed'"
      }
    ],
    "workbench": {
      "sections": {}
    }
  },
  "outcome": "failed",
  "error": "Request processing failed"
}
```
