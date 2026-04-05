# Transform / execute / result validation codes

**Source:** [`a2a-server/src/services/core/request-processor/validators/transform-execute-validator.ts`](../../a2a-server/src/services/core/request-processor/validators/transform-execute-validator.ts)

Strict enforcement: set **`A2A_TRANSFORM_STRICT=1`** (`shouldEnforceTransformStrictMode()`).

## Dialog execute (`validateDialogExecuteShape`)

| Code | Meaning |
|------|---------|
| `DIALOG_EXECUTE_MISSING` | `execute` missing or not object |
| `DIALOG_EXECUTE_EMPTY` | `execute` has no keys |
| `DIALOG_EXECUTE_MULTIPLE_ACTIONS` | More than one of: form, tool keys |
| `DIALOG_EXECUTE_UNKNOWN_SHAPE` | Neither router/chat form nor single tool |
| `DIALOG_EXECUTE_MESSAGE_MISSING` | Pattern A: `form.textarea` without `execute.message` |

## Form choice pipeline (`validateFormChoiceProcessResult`)

| Code | Meaning |
|------|---------|
| `FORM_CHOICE_RESULT_MISSING` | Null result |
| `FORM_CHOICE_OUTCOME_MISSING` | Missing `outcome` |
| `FORM_CHOICE_EXECUTE_MISSING` | Missing `execute` object |

## Router (`validateRouterResultShape`)

| Code | Meaning |
|------|---------|
| `ROUTER_CHOICES_MISSING` | `execute.form.choices` not an array |
| `ROUTER_CHOICES_EMPTY` | Choices array length 0 |

## LLM output / message placement (`validateLlmOutputShape`)

| Code | Meaning |
|------|---------|
| `TOP_LEVEL_MESSAGE_WITH_TOOL` | Top-level `message` + tool in `execute` |
| `DUPLICATE_TOP_AND_EXECUTE_MESSAGE` | Same text twice |
| `TOP_AND_EXECUTE_MESSAGE_MISMATCH` | Different top vs `execute.message` with tools |
| `EXECUTE_MESSAGE_ONLY` | Only `execute.message`, no form/tools |

## Client `result` (`validateResultShape`)

| Code | Meaning |
|------|---------|
| `RESULT_NOT_OBJECT` | Result not an object |
| `RESULT_EMPTY` | `{}` |
| `RESULT_BARE_BLOB_CONTENT` | Legacy `{ "content": "..." }` |
| `RESULT_BARE_BLOB_RESULTS` | Legacy `{ "results": [...] }` |

## Agent execute (`validateAgentExecuteShape`)

| Code | Meaning |
|------|---------|
| `AGENT_EXECUTE_MISSING` | No `execute` |
| `AGENT_EXECUTE_EMPTY` | Empty `execute` |
| `AGENT_EXECUTE_MULTIPLE_ACTIONS` | Multiple actions |
| `AGENT_EXECUTE_UNKNOWN_SHAPE` | Not single-tool and not chat-shape (no message) |

**Tool keys** aligned with prompts: `SINGLE_TOOL_EXECUTE_KEYS` in the same file.
