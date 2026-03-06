# Task Execution Workflow

> **End-to-end flow for executing a task**

## Overview

Complete flow from user input to task completion, including AI actions and server processing.

## Flow Diagram

```
User enters task
  ↓
Web UI: TaskPanel
  ↓
TransportManager.send({ task: '...' })
  ↓
API Server → a2a-server
  ↓
RequestProcessor.process()
  ↓
PhaseMachine: idle → discovery → recognition → action
  ↓
[AI Mode]: LLM Adapter
  ↓
[Action Mode]: ActionService
  ↓
Response via SSE
  ↓
AIActions.execute()
  ↓
Handler executes (script/form/message)
  ↓
UI updates
  ↓
Storage saves
```

## Detailed Flow

### 1. User Input

```javascript
// Task panel input
const input = document.getElementById('task-input');
const submitButton = document.getElementById('submit');

submitButton.addEventListener('click', () => {
  const task = input.value;
  executeTask(task);
});
```

### 2. Send Task

```javascript
async function executeTask(task) {
  // Show loading
  UI.setLoading(true);

  // Send to server
  const response = await TransportManager.send({
    type: 'task:execute',
    payload: {
      sessionId: State.currentSessionId,
      task: task,
      timestamp: Date.now()
    }
  });

  // Store promise ID for polling
  State.setCurrentPromise(response.promiseId);
}
```

### 3. Server Processing

```typescript
// a2a-server: request-processor.service.ts
class RequestProcessor {
  async processRequest(request: Request) {
    // Initialize phase machine
    const phaseMachine = new PhaseMachine(request);

    // Phase 1: Discovery
    await phaseMachine.transition('discovery');
    const frameworks = await this.detectFrameworks(request);

    // Phase 2: Recognition
    await phaseMachine.transition('recognition');
    const entities = await this.recognizeEntities(request);

    // Phase 3: Action
    await phaseMachine.transition('action');

    if (request.requiresAI) {
      return await this.processAI(request, entities);
    } else {
      return await this.processAction(request, entities);
    }
  }
}
```

### 4. AI Processing

```typescript
// AI mode
async processAI(request, entities) {
  // Build prompt from simulation template
  const prompt = await this.buildPrompt(request, entities);

  // Call LLM
  const llmResponse = await this.llmAdapter.call(prompt);

  // Parse canonical format
  const parsed = JSON.parse(llmResponse);

  // Validate
  validateCanonicalFormat(parsed);

  // Build response
  return {
    promiseId: request.promiseId,
    status: 'executing',
    execute: parsed.execute,
    context: {
      execution: { step: parsed.step }
    }
  };
}
```

### 5. Action Processing

```typescript
// Action mode (no AI)
async processAction(request, entities) {
  // Find matching action
  const action = await this.actionService.findAction(request.task);

  if (!action) {
    return { status: 'no_action_found' };
  }

  // Execute first step
  const result = await this.actionService.executeStep(action);

  return {
    promiseId: request.promiseId,
    status: 'executing',
    executingAction: action,
    execute: result.execute
  };
}
```

### 6. Client Execution

```javascript
// AIActions receives response
TransportManager.on('ai-action:execute', (response) => {
  AIActions.execute(response);
});

// AIActions.execute
async execute(response) {
  const { execute, context } = response;
  const [actionType, params] = Object.entries(execute)[0];

  // Get handler
  const handler = this.handlers[actionType];
  if (!handler) {
    throw new Error(`Unknown action type: ${actionType}`);
  }

  // Execute
  const result = await handler(params);

  // Update context
  context.execution.step = result.step;
  context.execution.completed = result.completed;

  // Save state
  await Storage.saveExecution(context);

  // If not completed, send follow-up
  if (!result.completed) {
    await this.sendFollowUp(result);
  }
}
```

### 7. Handlers

```javascript
// handlers.js
const handlers = {
  script: async (params) => {
    // Execute code
    const output = await executeScript(params.code, params.input);
    return { output };
  },

  form: async (params) => {
    // Show form, wait for user input
    const input = await UI.showForm(params.fields);
    return { input };
  },

  message: async (params) => {
    // Display message
    UI.showMessage(params.text);
    return { displayed: true };
  }
};
```

## State Transitions

```
Request States:
  pending → processing → completed
                   ↓
                failed

Execution States:
  idle → plan → execute → completed
    ↓        ↓
  clarify ← need_info
```

## Testing

```bash
# Full task execution test
npm run test:e2e:task

# Simulation test
npm run test:sim

# Specific handler test
npm run test:handlers:script
```
