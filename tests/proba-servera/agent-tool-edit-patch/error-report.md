# Test Failure Report: agent-tool-edit-patch

**Timestamp:** 2026-04-05T19:41:36.121Z

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
    "task": "fix helper function",
    "execution": {
      "action": "agent",
      "step": "tool_edit_patch"
    },
    "history": [
      {
        "role": "user",
        "message": "fix helper function"
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
    "edit-patch": {
      "path": "utils/helpers.js"
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
    "task": "fix helper function",
    "execution": {
      "action": "agent",
      "step": "tool_edit_patch"
    },
    "history": [
      {
        "role": "user",
        "message": "fix helper function"
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
  "outcome": "failed",
  "error": "Request processing failed"
}
```
