# VueFlow Migration Plan for a2a-client/web

> **⚠️ УСТАРЕВШИЙ ДОКУМЕНТ**
> 
> Этот документ описывает старый формат протокола. Актуальный формат см.:
> - [docs/new-request-flow/PROTOCOL.md](../new-request-flow/PROTOCOL.md)
> - [docs/new-request-flow/SESSION-FLOW.md](../new-request-flow/SESSION-FLOW.md)
> - [simulations/SCHEMA.md](../simulations/SCHEMA.md)

## Overview

Migrate `a2a-client/web` to fully use VueFlow for A2A Protocol visualization. The web already has VueFlow dependencies
installed and partial implementation in `js/flow/` folder.

## Current State Analysis

### Already Implemented (Partial)

- `js/flow/index.js` - A2AFlowManager class for VueFlow initialization
- `js/flow/nodes.js` - Custom node type definitions (using old API)
- `js/flow/protocol.js` - Protocol to VueFlow mapping utilities
- Dependencies installed in `package.json`

### Issues to Fix

1. Custom nodes in `nodes.js` use deprecated VueFlow API (template strings)
2. Flow only shown in modal overlay (`#flow-container`)
3. Custom nodes not properly registered
4. Flow integration could be more prominent in the UI

---

## Action Flow Understanding (from Simulations)

Based on `simulations/pilot/` data, here's the complete action execution flow:

> **⚠️ УСТАРЕВШЕЕ:** Ранее использовался формат `proposedActions` → `executingAction` → `actionId` → `subActions` → `dslScript`.
> 
> **Актуальный формат см.:** [docs/new-request-flow/PROTOCOL.md](../new-request-flow/PROTOCOL.md)

### Flow Sequence:

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  task_request   │────▶│  action_proposal    │────▶│  action_executing   │
│  (initial task) │     │  (proposed action) │     │  (sub-action 1)    │
└─────────────────┘     └─────────────────────┘     └─────────────────────┘
                                                                       │
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  action_complete│◀────│  action_executing  │◀────│  action_executing   │
│  (final result) │     │  (sub-action 3)    │     │  (sub-action 2)    │
└─────────────────┘     └─────────────────────┘     └─────────────────────┘
```

### Response Types & Data Structures:

> **⚠️ УСТАРЕВШЕЕ:** 
> ```json
> {
>   "outcome": "action_proposal",
>   "proposedActions": [...],
>   "subActions": [...]
> }
> ```
> 
> **Актуальный формат:** используйте `execute.form.choices` вместо `proposedActions`.

#### 1. task_request → action_proposal (Simulation 1)

```
json
{
  "outcome": "action_proposal",
  "message": "Найден подходящий экшен в базе",
  "context": { "task": "исправить импорты в vue компонентах" },
  "proposedActions": [
    {
      "actionId": "fix-vue-imports",
      "title": "Исправить сломанные импорты",
      "description": "...",
      "matchScore": 0.95,
      "subActions": [
        { "actionId": "vue-import-detect", "title": "Определить сломанные импорты", ... },
        { "actionId": "vue-import-resolve", "title": "Разрешить правильные пути", ... },
        { "actionId": "vue-import-apply", "title": "Применить исправления", ... },
        { "actionId": "vue-import-cleanup", "title": "Очистить временные файлы", ... }
      ]
    }
  ]
}
```

> **⚠️ УСТАРЕВШЕЕ:** 
> ```json
> {
>   "executingAction": { "actionId": "...", "dsl": {...} }
> }
> ```
> 
> **Актуальный формат:** используйте `execute` с action-key shape:
> ```json
> {
>   "execute": { "script": { "input": {...}, "output": "...", "code": "..." } }
> }
> ```

#### 2. action_proposal → action_executing (Simulation 2)

```
json
{
  "outcome": "action_executing",
  "executingAction": {
    "actionId": "vue-import-detect",
    "title": "Определить сломанные импорты",
    "description": "Сканирует Vue файлы...",
    "dsl": { "script": "vue-import-detect", "input": {...}, "output": "broken_imports[]" }
  },
  "nextSteps": [
    { "actionId": "vue-import-resolve", "title": "Разрешить правильные пути" },
    ...
  ]
}
```

> **⚠️ УСТАРЕВШЕЕ:** 
> ```json
> {
>   "executingAction": { "actionId": "..." },
>   "nextSteps": [...]
> }
> ```

#### 3-4. Step Execution (Simulations 3-4)

```json
{
  "outcome": "action_executing",
  "previousStep": {
    "actionId": "vue-import-detect",
    "result": { "broken_imports": 3 }
  },
  "executingAction": { "actionId": "vue-import-resolve", ... },
  "context": {
    "execution": {
      "actionId": "fix-vue-imports",
      "currentActionId": "vue-import-resolve",
      "history": [
        { "step": 1, "actionId": "vue-import-detect", "status": "completed", "result": {...} }
      ]
    }
  }
}
```

> **⚠️ УСТАРЕВШЕЕ:** 
> ```json
> {
>   "outcome": "action_complete",
>   "finalResult": { "actionId": "...", "summary": {...} }
> }
> ```

#### 5. action_complete (Simulation 5)

```
json
{
  "outcome": "action_complete",
  "finalResult": {
    "actionId": "fix-vue-imports",
    "summary": {
      "broken_imports_found": 3,
      "patches_resolved": 3,
      "files_fixed": 3,
      "cleanup_count": 0
    }
  },
  "context": {
    "execution": {
      "status": "completed",
      "history": [
        { "step": 1, "actionId": "vue-import-detect", "status": "completed", "result": {...} },
        { "step": 2, "actionId": "vue-import-resolve", "status": "completed", "result": {...} },
        { "step": 3, "actionId": "vue-import-apply", "status": "completed", "result": {...} },
        { "step": 4, "actionId": "vue-import-cleanup", "status": "completed", "result": {...} }
      ]
    }
  }
}
```

---

## Migration Tasks

### Phase 1: Fix Custom Nodes (Critical) ✅ COMPLETED

```
Task 1.1: Update js/flow/nodes.js to use Vue 3 functional components
- ✅ Convert template strings to proper Vue 3 components (using h() function)
- ✅ Use plain objects with @vue-flow/core

Task 1.2: Register custom nodes properly in js/flow/index.js
- ✅ Use nodeTypes option in VueFlow constructor

Task 1.3: Add new node types for sub-actions
- ✅ SubActionNode - for each step in execution
- ✅ Handle: dsl, input/output, progress tracking
```

### Phase 2: Data Mapping (Protocol → Nodes) ✅ COMPLETED

```
Task 2.1: Update protocol.js for new response structures
- ✅ Map **proposedActions** → используйте `execute.form.choices`
- ✅ Map **executingAction** → используйте `execute` с action-key shape
- ✅ Map **history** → используйте `context.history`
- ✅ Map **finalResult** → используйте `context.execution.status: "completed"`
- ✅ Added mapSimulationResponseToFlow() function

Task 2.2: Add edge animations
- ✅ Animate edges to currently running sub-action
- ✅ Show completed steps in green
```

### Phase 3: Enhance Flow UI Integration

```
Task 3.1: Make VueFlow canvas more prominent
- Consider persistent side panel or tab instead of modal

Task 3.2: Add more interactive features
- Node click handlers for details (show dsl, input/output)
- Progress tracking visualization
- History view for completed steps
```

### Phase 4: Real-time Updates ✅ COMPLETED

```
Task 4.1: Integrate with Sessions.js
- ✅ Connect flow updates to session polling
- ✅ Auto-add nodes on new responses
- ✅ Added addTaskToFlow() - adds task when sending message
- ✅ Added updateFlowWithResponse() - updates flow on server response
- ✅ Added updateFlowFromMessages() - loads existing messages to flow
- ✅ Flow updates on step execution

Task 4.2: Visual feedback
- ✅ Animate edge to running step
- ✅ Update node status in real-time
```

---

## Node Types Required

| Node Type        | Purpose                  | Color            | Data Fields (УСТАРЕВШЕЕ)                                                    | Data Fields (АКТУАЛЬНО)                                                                                             |
|------------------|--------------------------|------------------|----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `taskInput`      | Initial task request     | #22c55e (green)  | task, timestamp                                                            | task, timestamp                                                                                                  |
| `actionProposal` | Proposed action(s)       | #eab308 (yellow) | actionId, title, description, matchScore, **subActions[]** (устарело)    | action, title, description, matchScore, **steps[]** → используйте `execute.form.choices` (см. PROTOCOL.md)       |
| `subAction`      | Currently executing step | #3b82f6 (blue)   | actionId, title, description, **dsl**, input, output, stepIndex (устарело) | action, title, description, **script** с input/output/code → используйте action-key shape (см. PROTOCOL.md)       |
| `result`         | Step result (optional)   | #6b7280 (gray)   | actionId, result data                                                       | используйте action-key shape: `{ "result": { "script": {...} } }`                                              |
| `actionComplete` | Final action result      | #22c55e (green)  | actionId, summary, totalSteps, duration                                   | action, summary, используйте `execution.status: "completed"`                                                     |

---

## Files to Modify

1. `a2a-client/web/js/flow/nodes.js` - Fix custom node definitions + add new types
2. `a2a-client/web/js/flow/protocol.js` - Update mapping for simulation data
3. `a2a-client/web/js/flow/index.js` - Fix node registration + edge animations
4. `a2a-client/web/js/sessions.js` - Integrate flow updates with session polling
5. `a2a-client/web/index.html` - Enhance flow container (optional)
6. `a2a-client/web/css/style.css` - Add styles for new nodes

---

## VueFlow API Reference

### Modern Custom Node Pattern (Vue 3)

```
javascript
import { Handle, Position } from '@vue-flow/core'

// Functional component approach with h()
export const TaskInputNode = {
  name: 'TaskInputNode',
  type: 'taskInput',
  nodeType: 'input',
  props: ['data'],
  setup(props, { slots }) {
    return () => h('div', { class: 'task-input-node' }, [
      h(Handle, { type: 'target', position: Position.Top }),
      // ... node content
      h(Handle, { type: 'source', position: Position.Bottom })
    ])
  }
}
```

### Node Registration

```
javascript
import { VueFlow } from '@vue-flow/core'
import { TaskInputNode, ActionProposalNode, SubActionNode } from './nodes.js'

const nodeTypes = {
  taskInput: TaskInputNode,
  actionProposal: ActionProposalNode,
  subAction: SubActionNode,
  // ...
}

const vueflow = new VueFlow({
  nodeTypes,
  // ...
})
```

---

## Success Criteria

1. Custom nodes render correctly without errors
2. Flow displays protocol messages properly from simulations
3. Sub-action nodes show progress (current step, history)
4. Edge animations show flow direction
5. No console errors on page load
6. Basic interactivity works (zoom, pan, click)
7. Flow updates when session receives new responses
