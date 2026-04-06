# Test Failure Report: dialog-message

**Timestamp:** 2026-04-06T17:24:19.480Z

## Summary

- **Status:** FAIL
- **Differences Found:** 2

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute.message` | missing-key | {"type":"string","keys":null} | — |
| `execute.form.textarea` | missing-key | {"type":"object","keys":{"name":{"type": | — |

## Input (Request)

```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "dialog",
      "step": "request"
    }
  },
  "result": {
    "message": "Hello, this is a test message"
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
        "message": {
          "type": "string",
          "keys": null
        },
        "form": {
          "type": "object",
          "keys": {
            "textarea": {
              "type": "object",
              "keys": {
                "name": {
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
        "result": {
          "type": "object",
          "keys": {
            "message": {
              "type": "string",
              "keys": null
            }
          }
        },
        "message": {
          "type": "string",
          "keys": null
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

## Full Expected

```json
{
  "$proba": {
    "ignorePaths": [
      "context.workbench"
    ],
    "inputAbsentPaths": [
      "context.history"
    ]
  },
  "context": {
    "task": "string",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "history": [
      {
        "role": "user",
        "message": "string"
      },
      {
        "role": "assistant",
        "message": "string"
      }
    ]
  },
  "execute": {
    "message": "string",
    "form": {
      "textarea": {
        "name": "string",
        "label": "string",
        "required": true
      }
    }
  }
}
```

## Full Actual

```json
{
  "context": {
    "session_id": "srv_sess_15db8ba4-f615-40d6-92a9-1489b44d5d9c",
    "task": "диалог",
    "execution": {
      "action": "dialog",
      "step": "request"
    },
    "result": {
      "message": "Hello, this is a test message"
    },
    "message": "Hello, this is a test message",
    "history": [
      {
        "role": "user",
        "message": "Hello, this is a test message"
      }
    ],
    "workbench": {
      "sections": {}
    }
  },
  "execute": {
    "form": {
      "title": "AI Assistant",
      "description": "Enter your message",
      "input": [
        {
          "name": "message",
          "type": "text",
          "label": "Message",
          "required": true
        }
      ]
    }
  }
}
```

## Directive checks

- context.history: array length 1, expected 2
- execute.form.textarea: expected object, got undefined
