# Task: Remove static stub from "Оберіть спосіб виконання" router step

## Problem

The router step (step 2 in dialog simulation) returns a hardcoded list of choices:

```json
{
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        { "id": "dialog",             "label": "AI діалог з користувачем" },
        { "id": "auto-ai",            "label": "AI Action Generator — сгенерировать экшен с помощью LLM" },
        { "id": "task-decomposition", "label": "Декомпозиция задачи вручную" }
      ]
    }
  }
}
```

This stub is duplicated in two places in `action-request-processor.ts`:
- `handleTaskRequest` — "action matched" branch (line ~270)
- `handleTaskRequest` — "no action matched" branch (line ~295)

The choices are static strings, not driven by any config or registry.

## Goal

Make the router choices configurable/dynamic so the stub can be replaced or extended without editing source code.

## Affected files

| File | Change |
|------|--------|
| `a2a-server/src/services/core/request-processor/action-request-processor.ts` | Replace hardcoded choices array with a call to a config/registry |
| `a2a-server/src/services/core/request-processor/form-request-processor.ts` | `registerDefaultForms` also has a static `action_selection` form — align or remove |

## Golden standard reference

`simulations/dialog/2/response.json` — canonical shape of the router response:

```json
{
  "context": {
    "task": "...",
    "execution": { "action": "task", "step": "router" }
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        { "id": "dialog",             "label": "AI діалог з користувачем" },
        { "id": "auto-ai",            "label": "AI Action Generator" },
        { "id": "task-decomposition", "label": "Декомпозиція задачі" }
      ]
    }
  }
}
```

Note: simulation uses shorter labels (no Russian text). Labels in the stub differ — fix to match simulation.

## Implementation plan

### 1. Extract router choices to a config constant

In `action-request-processor.ts`, add a top-level constant:

```ts
const ROUTER_CHOICES = [
  { id: 'dialog',             label: 'AI діалог з користувачем' },
  { id: 'auto-ai',            label: 'AI Action Generator' },
  { id: 'task-decomposition', label: 'Декомпозиція задачі' },
];
```

Replace both hardcoded `choices` arrays in `handleTaskRequest` with `ROUTER_CHOICES`.

### 2. "Action matched" branch — prepend matched action

When an action is matched, the matched action choice is prepended. Keep that logic but use `ROUTER_CHOICES` for the fallback tail:

```ts
choices: [
  ...(actionResult.message.action ? [{
    id: actionResult.message.action.id || actionResult.actionId,
    label: actionResult.message.action.title
  }] : []),
  ...ROUTER_CHOICES,
]
```

### 3. Align `form-request-processor.ts`

`registerDefaultForms` registers `action_selection` with different choices (`auto`, `manual`, `ai`). This form is never triggered by the dialog flow (it requires `ctx.form_id = 'action_selection'`). Either:
- Remove it (it's dead code in the dialog flow), or
- Update its choices to match `ROUTER_CHOICES`

Preferred: remove `action_selection` default form registration — it conflicts with the router shape and is not referenced by any simulation.

### 4. Context cleanup

In the "no action matched" branch, `handleTaskRequest` adds `session_id` and `version` to context output:

```ts
context: {
  session_id: sessionId,
  version: '1.0',
  ...
}
```

Per the golden standard (`simulations/dialog/2/response.json`), the response context must NOT contain `session_id` or `version`. Remove them.

## Acceptance criteria

- `simulations/dialog` steps 1–4 pass simulation runner: `npm run test:sim`
- Router response shape matches `simulations/dialog/2/response.json` exactly (no `session_id`, no `version`, correct labels)
- No hardcoded choice strings remain in `action-request-processor.ts` outside `ROUTER_CHOICES`
