# Task: Real search for "Оберіть спосіб виконання" router step

## Problem

The router step currently does keyword matching against MD action definitions
(`src/actions/definitions`). When no action matches (score < 0.5), it falls
back to a hardcoded list of three modes:

```
dialog / auto-ai / task-decomposition
```

This is not a real search — it is a static UI stub. The user sees the same
three choices regardless of what they typed.

## What "real search" means

The router must use the LLM to analyse the task and return a ranked list of
**concrete actions** (scripts from the registry) that fit the task, plus the
three generic modes as a fallback tail.

Flow after the change:

```
client sends result.message = "fix vue imports"
        │
        ▼
ActionRegistry.findActions()          ← keyword pre-filter (keep as cheap gate)
        │
        ├─ matches found (score ≥ 0.5) → include in choices (ranked)
        │
        ▼
LLM call via dialog transform pipeline
  prompt: task + list of all registered actions (id, title, description, triggers)
  expected LLM output: ranked list of action ids relevant to the task
        │
        ▼
merge: LLM-ranked actions first, then ROUTER_CHOICES fallback tail
        │
        ▼
response.execute.form.choices = [
  { id: "fix-vue-imports", label: "Fix Vue imports (matched)" },
  ...other LLM-ranked actions...
  { id: "dialog",             label: "AI діалог з користувачем" },
  { id: "auto-ai",            label: "AI Action Generator" },
  { id: "task-decomposition", label: "Декомпозиція задачі" }
]
```

## Affected files

| File | Change |
|------|--------|
| `a2a-server/src/actions/action-registry.ts` | Add `getAllActions()` — already exists, no change needed |
| `a2a-server/prompts/transforms/server-transforms-request.json` (router schema) | New or extend: build prompt with task + action catalogue |
| `a2a-server/prompts/transforms/server-transforms-response.json` (router schema) | Parse LLM JSON → ranked `choices` array |
| `a2a-server/src/services/core/request-processor/action-request-processor.ts` | `handleTaskRequest`: when no keyword match, route through LLM transform instead of returning static choices |
| `simulations/dialog/2/server-transforms-request.json` | Update to reflect new prompt shape |
| `simulations/dialog/2/server-transforms-response.json` | Update to reflect new parse shape |

## Current keyword search — keep as pre-filter

`ActionRegistry.findAction()` does word-overlap scoring (score ≥ 0.5 = match).
Keep it. Use it to:
1. Short-circuit: if score is high (≥ 0.8) skip LLM, return matched action directly.
2. Pre-filter: pass only candidate actions (score ≥ 0.3) to LLM to reduce prompt size.
3. If registry is empty — pass all three ROUTER_CHOICES directly (no LLM needed).

## LLM prompt schema — new transform: `router`

### `prompts/transforms/router-request.json`

Pipeline that builds the prompt:

```json
{
  "type": "pipeline",
  "steps": [
    {
      "op": "render-markdown",
      "templateRef": "a2a-server/prompts/router-request.md",
      "data": "$",
      "outputFile": "request.md"
    }
  ]
}
```

### `prompts/router-request.md`

```markdown
You are a task router. Given the user task and a list of available actions,
return a JSON array of action ids ranked by relevance (most relevant first).
Return ONLY the JSON array, no explanation.

Task: {{context.task}}

Available actions:
{{#each context.availableActions}}
- id: {{id}}
  title: {{title}}
  description: {{description}}
{{/each}}

Response format:
["action-id-1", "action-id-2"]
```

### `prompts/transforms/router-response.json`

Pipeline that parses LLM output:

```json
{
  "type": "pipeline",
  "steps": [
    {
      "op": "parse-json-from-md",
      "fromFile": "response.md",
      "jsonPath": "$",
      "to": "$rankedIds"
    },
    {
      "op": "set",
      "path": "$.execute.form.choices",
      "value": "$rankedIds"
    }
  ]
}
```

(Actual merging of ids → choice objects with labels happens in
`action-request-processor.ts` after the transform, not in the pipeline.)

## Changes to `action-request-processor.ts`

### `handleTaskRequest` — new logic

```
1. keywordMatches = actionRegistry.findActions(task)  // existing

2. if keywordMatches[0].matchScore >= 0.8:
     return proposal with that action + ROUTER_CHOICES tail  // existing fast path

3. candidates = keywordMatches (score >= 0.3) || getAllActions() if empty
   if candidates.length === 0:
     return static ROUTER_CHOICES  // no registry, skip LLM

4. ctx.availableActions = candidates.map(m => m.action)  // inject into context
   run DialogRequestProcessor with schema = "router"
   parse LLM response → rankedIds: string[]

5. rankedChoices = rankedIds
     .map(id => candidates.find(c => c.action.id === id)?.action)
     .filter(Boolean)
     .map(a => ({ id: a.id, label: a.title }))

6. return {
     execute: { form: { title: "Оберіть спосіб виконання",
       choices: [...rankedChoices, ...ROUTER_CHOICES] } },
     context: { task, execution: { action: "task", step: "router" } }
   }
```

## Simulation update — `simulations/dialog/2`

Step 2 in the dialog simulation must be updated to reflect the new router
behaviour. The golden standard `response.json` shape stays the same (choices
array), but `server-transforms-request.json` and
`server-transforms-response.json` must match the new `router` schema.

## Acceptance criteria

- `npm run test:sim` passes for `simulations/dialog` steps 1–4
- When task matches a registered action with score ≥ 0.8 → no LLM call, fast path
- When task has no keyword match → LLM is called with action catalogue in prompt
- LLM response is parsed into ranked choices prepended before ROUTER_CHOICES
- If LLM is unavailable → graceful fallback to static ROUTER_CHOICES (no crash)
- No hardcoded choice labels outside `ROUTER_CHOICES` constant
