# Execute Processing Errors

Issues with execute object handling, action processing, and result submissions.

## Malformed Execute Objects

### Invalid Execute Structure

**Symptoms:**
- Execute received but not processed
- `processExecute()` returns `{ type: 'unknown' }`
- UI doesn't respond to server messages

**Common Issues:**
- Missing action-type key
- Incorrect property names
- Nested structure problems

**Diagnostic:**
```javascript
function validateExecuteObject(execute) {
  if (!execute || typeof execute !== 'object') {
    return { valid: false, error: 'Execute is not an object' };
  }

  const actionTypes = ['form', 'message', 'script', 'rag-search',
                      'read-file', 'write-file', 'execute-command'];

  const foundTypes = actionTypes.filter(type => execute[type]);

  if (foundTypes.length === 0) {
    return { valid: false, error: 'No recognized action type found' };
  }

  if (foundTypes.length > 1) {
    return { valid: false, error: `Multiple action types found: ${foundTypes.join(', ')}` };
  }

  return { valid: true, type: foundTypes[0] };
}

// Test execute processing
function debugExecuteProcessing(execute) {
  const validation = validateExecuteObject(execute);
  const processed = ActionHandler.processExecute(execute);

  console.log('Execute validation:', validation);
  console.log('Processed result:', processed);

  if (!validation.valid) {
    console.error('Execute processing failed:', validation.error);
  }

  return { validation, processed };
}
```

**Fixes:**

1. **Server-Side Corrections**
```javascript
// Ensure server sends properly structured execute
function formatExecuteObject(type, data) {
  const execute = {};
  execute[type] = data;
  return execute;
}

// Example usage
const execute = formatExecuteObject('form', {
  choices: ['option1', 'option2'],
  input: { type: 'text', placeholder: 'Enter value' }
});
```

2. **Client-Side Normalization**
```javascript
function normalizeExecuteObject(execute) {
  // Handle legacy formats
  if (execute.action && execute.data) {
    // Convert legacy { action, data } to { [action]: data }
    const normalized = {};
    normalized[execute.action] = execute.data;
    return normalized;
  }

  // Handle flat content structure
  if (execute.content && !execute.form && !execute.message) {
    return { message: { content: execute.content } };
  }

  return execute;
}
```

### Missing Execute Properties

**Symptoms:**
- Execute processed but missing required fields
- Form choices not showing
- Script execution fails due to missing code

**Validation:**
```javascript
function validateExecuteContent(execute, type) {
  const validations = {
    form: (data) => {
      if (!data.choices && !data.input) {
        return 'Form execute must have choices or input';
      }
      return null;
    },
    script: (data) => {
      if (!data.code && !data.input) {
        return 'Script execute must have code or input';
      }
      return null;
    },
    'read-file': (data) => {
      if (!data.path) {
        return 'Read-file execute must have path';
      }
      return null;
    },
    'write-file': (data) => {
      if (!data.path || !data.content) {
        return 'Write-file execute must have path and content';
      }
      return null;
    },
    'execute-command': (data) => {
      if (!data.command) {
        return 'Execute-command must have command';
      }
      return null;
    }
  };

  const validator = validations[type];
  return validator ? validator(execute[type]) : null;
}
```

## Action Submission Failures

### Action-Key Shape Violations

**Symptoms:**
- Submission rejected with validation error
- "Result must have exactly one action-type key" error
- Server returns 400 Bad Request

**Diagnostic:**
```javascript
function validateActionKeyShape(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, error: 'Result is not an object' };
  }

  const keys = Object.keys(result);
  if (keys.length === 0) {
    return { valid: false, error: 'Result has no keys' };
  }

  if (keys.length > 1) {
    return { valid: false, error: `Result has multiple keys: ${keys.join(', ')}` };
  }

  const actionType = keys[0];
  const validTypes = ['choice', 'message', 'script', 'rag-search',
                     'read-file', 'write-file', 'execute-command'];

  if (!validTypes.includes(actionType)) {
    return { valid: false, error: `Invalid action type: ${actionType}` };
  }

  return { valid: true, actionType };
}

// Test before submission
function safeSubmit(sessionId, projectId, result) {
  const validation = validateActionKeyShape(result);

  if (!validation.valid) {
    console.error('Invalid action-key shape:', validation.error);
    throw new Error(validation.error);
  }

  return ActionHandler.submit(sessionId, projectId, result);
}
```

**Fixes:**

1. **Correct Result Construction**
```javascript
// ✅ Correct action-key shapes
const correctResults = {
  choice: { choice: 'option_1' },
  message: { message: 'continue' },
  script: { script: { output: 'result', success: true } },
  'read-file': { 'read-file': { path: '/file.txt', content: '...' } },
  'write-file': { 'write-file': { path: '/file.txt', success: true } },
  'execute-command': { 'execute-command': { command: 'ls', exitCode: 0, stdout: '...' } }
};

// ❌ Incorrect shapes
const incorrectResults = {
  wrong1: { content: 'result' },           // Missing action key
  wrong2: { action: 'script', data: {} }, // Generic keys
  wrong3: { script: {}, choice: {} }      // Multiple action keys
};
```

2. **Builder Functions**
```javascript
function buildCorrectResult(actionType, data) {
  return { [actionType]: data };
}

// Usage
const result = buildCorrectResult('script', {
  output: 'Hello World',
  success: true
});
```

### Network Submission Errors

**Symptoms:**
- Submission promise rejects
- HTTP errors (401, 403, 500)
- Timeout errors

**Diagnostic:**
```javascript
function diagnoseSubmissionError(sessionId, projectId, result, error) {
  console.log('Submission diagnostic:', {
    sessionId,
    projectId,
    resultKeys: Object.keys(result || {}),
    error: error.message,
    status: error.status,
    isNetworkError: error.name === 'TypeError',
    isAuthError: error.status === 401 || error.status === 403,
    isServerError: error.status >= 500
  });

  // Check connectivity
  if (navigator.onLine === false) {
    return 'No internet connection';
  }

  // Check session validity
  if (!sessionId || !projectId) {
    return 'Invalid session or project ID';
  }

  // Check token validity
  const token = global.apiIntegration?.token;
  if (!token) {
    return 'Missing authentication token';
  }

  return 'Unknown error - check server logs';
}
```

**Recovery Strategies:**
```javascript
async function resilientSubmit(sessionId, projectId, result, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ActionHandler.submit(sessionId, projectId, result);
    } catch (error) {
      lastError = error;

      if (error.status === 401) {
        // Auth error - don't retry
        throw error;
      }

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Submission failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

## Timeout Handling

### Execution Timeouts

**Symptoms:**
- Long-running actions never complete
- UI becomes unresponsive
- No feedback on progress

**Timeout Management:**
```javascript
function setupExecutionTimeout(executeId, timeoutMs = 30000) {
  const timeout = setTimeout(() => {
    console.warn(`Execute ${executeId} timed out after ${timeoutMs}ms`);

    // Show timeout message
    PanelManager.open('logs').setContent(`
      <div class="error-message">
        Execution timed out. The operation may still be running on the server.
      </div>
    `);

    // Attempt recovery
    attemptTimeoutRecovery(executeId);
  }, timeoutMs);

  return () => clearTimeout(timeout);
}

function attemptTimeoutRecovery(executeId) {
  // Check server status
  fetch(`/api/executions/${executeId}/status`)
    .then(response => response.json())
    .then(status => {
      if (status.completed) {
        console.log('Execution actually completed');
        // Process results
      } else {
        console.log('Execution still running');
        // Show progress or cancel option
      }
    })
    .catch(() => {
      console.log('Could not check execution status');
    });
}
```

### Network Timeouts
```javascript
// Configure fetch timeouts
function fetchWithTimeout(url, options, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal
  })
  .finally(() => clearTimeout(timeoutId));
}

// Use in ActionHandler
ActionHandler._request = async function(method, path, body) {
  const url = `${this.apiBase}${path}`;

  try {
    const response = await fetchWithTimeout(url, {
      method,
      headers: this._getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error?.message || `Request failed: ${response.status}`);
    }

    return data.data || data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
};
```

## Result Validation Issues

### Invalid Result Data

**Symptoms:**
- Submission succeeds but server rejects result
- "Invalid result format" errors
- Action execution fails

**Validation Rules:**
```javascript
function validateResultData(actionType, data) {
  const validations = {
    choice: (data) => {
      if (typeof data !== 'string') {
        return 'Choice must be a string';
      }
      return null;
    },
    message: (data) => {
      if (typeof data !== 'string') {
        return 'Message must be a string';
      }
      return null;
    },
    script: (data) => {
      if (typeof data !== 'object') {
        return 'Script result must be an object';
      }
      if (typeof data.output !== 'string') {
        return 'Script output must be a string';
      }
      return null;
    },
    'read-file': (data) => {
      if (!data.path || !data.content) {
        return 'Read-file result must have path and content';
      }
      return null;
    },
    'write-file': (data) => {
      if (!data.path || typeof data.success !== 'boolean') {
        return 'Write-file result must have path and success flag';
      }
      return null;
    },
    'execute-command': (data) => {
      if (typeof data.exitCode !== 'number') {
        return 'Command result must have numeric exitCode';
      }
      return null;
    }
  };

  const validator = validations[actionType];
  return validator ? validator(data) : null;
}
```

**Pre-Submission Validation:**
```javascript
function validateAndSubmit(sessionId, projectId, result) {
  // Validate action-key shape
  const shapeValidation = validateActionKeyShape(result);
  if (!shapeValidation.valid) {
    throw new Error(shapeValidation.error);
  }

  // Validate result data
  const actionType = shapeValidation.actionType;
  const dataValidation = validateResultData(actionType, result[actionType]);
  if (dataValidation) {
    throw new Error(dataValidation);
  }

  // Submit if valid
  return ActionHandler.submit(sessionId, projectId, result);
}
```

## Execute Processing Pipeline

### Processing Order Issues

**Symptoms:**
- Executes processed out of order
- Race conditions between actions
- State corruption from concurrent processing

**Sequential Processing:**
```javascript
class ExecuteProcessor {
  constructor() {
    this.processing = false;
    this.queue = [];
  }

  async process(execute) {
    return new Promise((resolve, reject) => {
      this.queue.push({ execute, resolve, reject });
      this._processNext();
    });
  }

  async _processNext() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const { execute, resolve, reject } = this.queue.shift();

    try {
      const result = await this._handleExecute(execute);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.processing = false;
      this._processNext();
    }
  }

  async _handleExecute(execute) {
    const processed = ActionHandler.processExecute(execute);

    switch (processed.type) {
      case 'form':
        return this._handleForm(processed.data);
      case 'script':
        return this._handleScript(processed.data);
      // ... other handlers
    }
  }
}
```

### State Consistency Checks
```javascript
function checkExecuteStateConsistency() {
  const issues = [];

  // Check if waiting for input but no pending form
  if (SessionStore.status === 'waiting' && !SessionStore.pendingForm) {
    issues.push('Waiting status without pending form');
  }

  // Check if has pending form but not waiting
  if (SessionStore.pendingForm && SessionStore.status !== 'waiting') {
    issues.push('Pending form without waiting status');
  }

  // Check if execute present but not being processed
  if (SessionStore.execute && SessionStore.status === 'idle') {
    issues.push('Execute present in idle state');
  }

  return issues;
}

// Monitor state consistency
setInterval(() => {
  const issues = checkExecuteStateConsistency();
  if (issues.length > 0) {
    console.warn('Execute state inconsistencies:', issues);
  }
}, 1000);
```

## Debugging Tools

### Execute Inspector
```javascript
function createExecuteInspector() {
  return {
    inspect(execute) {
      console.group('Execute Inspector');
      console.log('Raw execute:', execute);

      const validation = validateExecuteObject(execute);
      console.log('Validation:', validation);

      if (validation.valid) {
        const processed = ActionHandler.processExecute(execute);
        console.log('Processed:', processed);

        const contentValidation = validateExecuteContent(execute, validation.type);
        console.log('Content validation:', contentValidation || 'Valid');
      }

      console.groupEnd();
    },

    traceSubmission(result) {
      console.group('Submission Trace');
      console.log('Result:', result);

      const shapeValidation = validateActionKeyShape(result);
      console.log('Shape validation:', shapeValidation);

      if (shapeValidation.valid) {
        const dataValidation = validateResultData(shapeValidation.actionType, result[shapeValidation.actionType]);
        console.log('Data validation:', dataValidation || 'Valid');
      }

      console.groupEnd();
    }
  };
}

// Usage
window.executeInspector = createExecuteInspector();
// executeInspector.inspect(someExecute);
// executeInspector.traceSubmission(someResult);
```

### Execution Monitor
```javascript
function createExecutionMonitor() {
  let activeExecutions = new Map();

  return {
    start(executionId, execute) {
      activeExecutions.set(executionId, {
        execute,
        startTime: Date.now(),
        status: 'running'
      });
      console.log(`Started execution ${executionId}`);
    },

    complete(executionId, result) {
      const execution = activeExecutions.get(executionId);
      if (execution) {
        execution.status = 'completed';
        execution.endTime = Date.now();
        execution.duration = execution.endTime - execution.startTime;
        execution.result = result;
        console.log(`Completed execution ${executionId} in ${execution.duration}ms`);
      }
    },

    fail(executionId, error) {
      const execution = activeExecutions.get(executionId);
      if (execution) {
        execution.status = 'failed';
        execution.endTime = Date.now();
        execution.duration = execution.endTime - execution.startTime;
        execution.error = error;
        console.error(`Failed execution ${executionId}:`, error);
      }
    },

    getStats() {
      return {
        active: activeExecutions.size,
        executions: Array.from(activeExecutions.entries())
      };
    }
  };
}

// Usage
window.executionMonitor = createExecutionMonitor();
```

## Emergency Recovery

### Clear Execute State
```javascript
function clearExecuteState() {
  console.log('Clearing execute state...');

  // Clear session store execute
  SessionStore.setExecute(null);
  SessionStore.clearPendingForm();

  // Reset status if stuck
  if (SessionStore.status === 'waiting' || SessionStore.status === 'error') {
    SessionStore.setStatus('active');
  }

  // Close any execute-related panels
  PanelManager.closeAll('task');

  console.log('Execute state cleared');
}
```

### Force Execute Processing
```javascript
function forceExecuteProcessing(execute) {
  console.log('Force processing execute:', execute);

  try {
    // Validate and normalize
    const normalized = normalizeExecuteObject(execute);
    const validation = validateExecuteObject(normalized);

    if (validation.valid) {
      // Process manually
      const processed = ActionHandler.processExecute(normalized);
      console.log('Forced processing result:', processed);

      // Apply to UI
      handleProcessedExecute(processed);
    } else {
      console.error('Cannot force process invalid execute:', validation.error);
    }
  } catch (error) {
    console.error('Force processing failed:', error);
  }
}
```

### Diagnostic Report
```javascript
function generateExecuteDiagnosticReport() {
  return {
    timestamp: new Date().toISOString(),
    sessionState: SessionStore.toJSON(),
    transportState: TransportManager.getState(),
    currentExecute: SessionStore.execute,
    pendingForm: SessionStore.pendingForm,
    executeValidation: SessionStore.execute ?
      validateExecuteObject(SessionStore.execute) : null,
    stateIssues: checkExecuteStateConsistency(),
    networkStatus: navigator.onLine,
    tokenPresent: !!global.apiIntegration?.token
  };
}

// Generate report
console.log('Execute Diagnostic Report:', generateExecuteDiagnosticReport());
```