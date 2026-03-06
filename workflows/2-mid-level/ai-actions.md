# AI Actions Workflow

> **Files:** `components/ai-actions/*.js`, `js/components/ai-actions.js`

## Overview

AI Actions system handles LLM-driven workflows. Uses canonical transform pattern where LLM controls execution flow via `context.execution.step`.

## Architecture

```
TransportManager
    ↓
ai-actions/index.js (entry)
    ↓
core.js (execution engine)
    ↓
handlers.js (action handlers)
    ↓
renderer.js (UI updates)
```

## File Structure

```
components/ai-actions/
├── index.js        # Entry point, exports
├── core.js         # Execution engine, step management
├── handlers.js     # Action-type handlers (script, form, etc.)
├── renderer.js     # UI rendering logic
├── session.js      # Session state management
├── execute.js      # Execution helpers
└── integration.js  # External integrations
```

## When to Edit

| Task | File | Method/Area |
|------|------|-------------|
| Add action type | `handlers.js` | New handler function |
| Change execution flow | `core.js` | `executeStep()` |
| Modify UI rendering | `renderer.js` | Render methods |
| Add session logic | `session.js` | Session helpers |

## Core Flow: Execute AI Action

```javascript
// 1. Receive execute message
TransportManager.on('ai-action:execute', (payload) => {
  AIActions.execute(payload);
});

// 2. Parse canonical format
const { step, message, execute, completed } = payload;

// 3. Execute based on action-key
const [actionType, params] = Object.entries(execute)[0];
const handler = handlers[actionType];
const result = await handler(params);

// 4. Update session state
Session.setExecutionStep(step, result);

// 5. Render UI
Renderer.update(result);
```

## Adding New Action Handler

```javascript
// handlers.js

export const handlers = {
  script: handleScript,
  form: handleForm,
  message: handleMessage,
  'read-file': handleReadFile,
  'write-file': handleWriteFile,
  // Add new handler here
  'new-action': handleNewAction
};

async function handleNewAction(params) {
  // 1. Validate params
  if (!params.requiredField) {
    throw new Error('Missing requiredField');
  }

  // 2. Execute action
  const result = await performAction(params);

  // 3. Return canonical format
  return {
    step: 'new-action-complete',
    message: 'Action completed',
    execute: { 'new-action': result },
    completed: false
  };
}
```

## Canonical Response Format

All handlers must return:

```javascript
{
  step: 'semantic_step_name',     // 'plan', 'clarify', 'execute', 'completed'
  message: 'User visible text',    // Markdown supported
  execute: {
    '<action_type>': {            // ONE action-key only
      // action-specific params
    }
  },
  completed: false                 // true only when fully done
}
```

## Execution Context

```javascript
// core.js maintains execution context
const executionContext = {
  step: 'current_step',
  history: [
    { step: 'step1', result: {...}, timestamp: 12345 },
    { step: 'step2', result: {...}, timestamp: 12346 }
  ],
  variables: {},  // Cross-step data
  metadata: {}    // Execution metadata
};
```

## Testing

```bash
# Test AI Actions
npm run test:ai-actions

# Test specific handler
npm run test:ai-actions:handlers

# Integration test
npm run test:ai-actions:integration
```

## Debugging

```javascript
// Enable verbose logging
AIActions.setDebug(true);

// Check execution history
console.log(AIActions.getExecutionHistory());

// Pause execution
AIActions.pause();
```
