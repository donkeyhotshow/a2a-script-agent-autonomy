# Test Failure Report: agent-workspace-chain

**Timestamp:** 2026-04-06T17:14:04.392Z

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
    "task": "Golden: workspace tools chain (grep, exists, patch, run-script).",
    "execution": {
      "action": "agent",
      "step": "workspace_chain"
    },
    "history": [
      {
        "role": "user",
        "message": "Find usages of createApp under src/"
      },
      {
        "role": "assistant",
        "step": "workspace_chain",
        "message": "Searching the repo for createApp under src/."
      }
    ],
    "workbench": {
      "sections": {}
    }
  },
  "result": {
    "grep-search": {
      "pattern": "createApp",
      "path": "src",
      "matches": [
        {
          "file": "src/main.ts",
          "line": 4,
          "content": "createApp("
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
            },
            "type": {
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
      "step": "workspace_chain"
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
      }
    ]
  },
  "execute": {
    "file-exists": {
      "path": "src/main.ts",
      "type": "file"
    }
  }
}
```

## Full Actual

```json
{
  "context": {
    "session_id": "srv_sess_f3385a86-a525-438c-9d32-9d3f00bd1c81",
    "task": "Golden: workspace tools chain (grep, exists, patch, run-script).",
    "execution": {
      "action": "agent",
      "step": "workspace_chain"
    },
    "history": [
      {
        "role": "user",
        "message": "Find usages of createApp under src/"
      },
      {
        "role": "assistant",
        "step": "workspace_chain",
        "message": "Searching the repo for createApp under src/."
      }
    ],
    "workbench": {
      "sections": {}
    },
    "result": {
      "grep-search": {
        "pattern": "createApp",
        "path": "src",
        "matches": [
          {
            "file": "src/main.ts",
            "line": 4,
            "content": "createApp("
          }
        ]
      },
      "message": "Golden: workspace tools chain (grep, exists, patch, run-script)."
    },
    "requestPhase": "llm_error",
    "hubLlmResubmitCount": 14,
    "llmPromiseId": "855a460d1745424e82ec2253989d5eb9"
  },
  "outcome": "failed",
  "error": "LLM hub promise lost after 2 resubmit(s); start a new turn or check AI hub"
}
```

## Directive checks

- context.history: array length 2, expected 4
- execute: expected object, got undefined
