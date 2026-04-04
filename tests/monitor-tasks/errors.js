class ServerUnavailableError extends Error {
  constructor(message = 'A2A server unavailable') {
    super(message);
    this.name = 'ServerUnavailableError';
  }
}

class ErrorClassifier {
  constructor() {
    this.errorPatterns = [
      // Connection errors
      { pattern: /ECONNREFUSED/i, type: 'connection', subtype: 'refused',
        hint: 'Service not running. Run: .\\start-all.bat',
        severity: 'critical' },
      { pattern: /ENOTFOUND|getaddrinfo/i, type: 'connection', subtype: 'dns',
        hint: 'DNS resolution failed. Check hostname in env vars',
        severity: 'critical' },
      { pattern: /ETIMEDOUT|timeout/i, type: 'connection', subtype: 'timeout',
        hint: 'Connection timeout. Check if service is overloaded or increase FORWARD_TIMEOUT_SECONDS',
        severity: 'high' },
      { pattern: /ECONNRESET/i, type: 'connection', subtype: 'reset',
        hint: 'Connection reset. Service may have crashed. Check logs',
        severity: 'high' },
      { pattern: /ECONNABORTED/i, type: 'connection', subtype: 'aborted',
        hint: 'Connection aborted. Network issue or service restart',
        severity: 'medium' },
      { pattern: /EPIPE/i, type: 'connection', subtype: 'broken-pipe',
        hint: 'Broken pipe. Service closed connection unexpectedly',
        severity: 'medium' },

      // HTTP status errors
      { pattern: /status\s*400|400/i, type: 'http', subtype: 'bad-request',
        hint: 'Bad request. Check JSON payload structure and required fields',
        severity: 'high' },
      { pattern: /status\s*401|401/i, type: 'http', subtype: 'auth',
        hint: 'Authentication failed. Check JWT_SECRET/ENCRYPTION_KEY (32 chars), or set SKIP_AUTH=1 for dev',
        severity: 'critical' },
      { pattern: /status\s*403|403/i, type: 'http', subtype: 'forbidden',
        hint: 'Access denied. Check permissions or token validity',
        severity: 'high' },
      { pattern: /status\s*404|404/i, type: 'http', subtype: 'notfound',
        hint: 'Resource not found. Check URL path and session/project IDs',
        severity: 'medium' },
      { pattern: /status\s*408|408/i, type: 'http', subtype: 'timeout',
        hint: 'Request timeout. Service took too long to respond',
        severity: 'high' },
      { pattern: /status\s*409|409/i, type: 'http', subtype: 'conflict',
        hint: 'Conflict. Resource state incompatible with request',
        severity: 'medium' },
      { pattern: /status\s*422|422/i, type: 'http', subtype: 'unprocessable',
        hint: 'Unprocessable entity. Validation failed on submitted data',
        severity: 'high' },
      { pattern: /status\s*429|429/i, type: 'http', subtype: 'rate-limit',
        hint: 'Too many requests. Rate limited by server',
        severity: 'medium' },
      { pattern: /status\s*500|500/i, type: 'http', subtype: 'internal-error',
        hint: 'Internal server error. Check a2a-server logs immediately',
        severity: 'critical' },
      { pattern: /status\s*502|502/i, type: 'http', subtype: 'bad-gateway',
        hint: 'Bad gateway. AI hub or upstream service unavailable',
        severity: 'critical' },
      { pattern: /status\s*503|503/i, type: 'http', subtype: 'unavailable',
        hint: 'Service unavailable. Ollama may be down or AI hub not responding',
        severity: 'critical' },
      { pattern: /status\s*504|504/i, type: 'http', subtype: 'gateway-timeout',
        hint: 'Gateway timeout. AI hub timeout - increase FORWARD_TIMEOUT_SECONDS',
        severity: 'high' },

      // Schema/validation errors
      { pattern: /action.key|action-key|invalid.*shape/i, type: 'schema', subtype: 'action-key',
        hint: 'Action-Key Shape violation. Use { "execute": { "script": {...} } } format. See AGENTS.md#action-key-shape',
        severity: 'critical' },
      { pattern: /validation|schema|invalid.*json/i, type: 'schema', subtype: 'validation',
        hint: 'Schema validation failed. Run: npm run sim:lint -- --all',
        severity: 'high' },
      { pattern: /missing.*required|required.*field/i, type: 'schema', subtype: 'missing-field',
        hint: 'Missing required field. Check request structure against API spec',
        severity: 'high' },
      { pattern: /type.*error|cannot.*read|property.*of.*undefined/i, type: 'schema', subtype: 'type-error',
        hint: 'Type error in response. Check data types match expected schema',
        severity: 'medium' },

      // LLM/Ollama errors
      { pattern: /ollama|model.*not.*found|no.*such.*model/i, type: 'llm', subtype: 'model',
        hint: 'Ollama model issue. Check: curl http://localhost:11435/api/tags. Pull model: ollama pull qwen3:8b',
        severity: 'critical' },
      { pattern: /context.*length|token.*limit|too.*long/i, type: 'llm', subtype: 'context',
        hint: 'Context too long for model. Gray room is on by default; raise A2A_GRAY_ROOM_MAX_TURNS or compress history. To strip interrupt chain: A2A_GRAY_ROOM_ENABLED=0',
        severity: 'high' },
      { pattern: /rate.*limit|too.*many.*request/i, type: 'llm', subtype: 'rate-limit',
        hint: 'Rate limited by LLM provider. Wait or switch model',
        severity: 'medium' },
      { pattern: /cuda|gpu|out.*of.*memory/i, type: 'llm', subtype: 'gpu-memory',
        hint: 'GPU/CUDA out of memory. Switch to CPU model or reduce batch size',
        severity: 'high' },
      { pattern: /load.*model|loading.*model/i, type: 'llm', subtype: 'loading',
        hint: 'Model still loading. Wait for Ollama to finish loading',
        severity: 'medium' },

      // Session/state errors
      { pattern: /session.*not.*found|invalid.*session/i, type: 'session', subtype: 'not-found',
        hint: 'Session expired or invalid. Create new session',
        severity: 'medium' },
      { pattern: /promise.*not.*found|invalid.*promise/i, type: 'session', subtype: 'promise',
        hint: 'Promise ID invalid or expired. Poll /async instead of /promise/{id}',
        severity: 'medium' },
      { pattern: /state.*invalid|corrupt.*state/i, type: 'session', subtype: 'state-corrupt',
        hint: 'Session state corrupted. Reset with: npm run monitor:reset',
        severity: 'high' },

      // Router/dialog errors
      { pattern: /router|choice.*not.*found|invalid.*choice/i, type: 'router', subtype: 'choice',
        hint: 'Router choice invalid. Inspect session form.choices before sending choice ID',
        severity: 'high' },
      { pattern: /no.*form|missing.*form/i, type: 'router', subtype: 'form',
        hint: 'No form in session. Check if task sent as message or choice at wrong beat',
        severity: 'high' },
      { pattern: /beat.*error|wrong.*beat/i, type: 'router', subtype: 'beat',
        hint: 'Router dialog beat error. See AGENTS.md Router dialog section',
        severity: 'high' },

      // Task processing errors
      { pattern: /no.*task.*files|empty.*queue/i, type: 'task', subtype: 'no-tasks',
        hint: 'No task files found in prompts-to-agent-mode directory',
        severity: 'low' },
      { pattern: /task.*timeout|timed.*out/i, type: 'task', subtype: 'timeout',
        hint: 'Task processing timeout. Check if Ollama is generating or stuck',
        severity: 'high' },
      { pattern: /extract.*task|parse.*task/i, type: 'task', subtype: 'parse-error',
        hint: 'Failed to extract task from file. Check markdown format',
        severity: 'medium' },
      { pattern: /router.*stuck|no.*choices|beat.*error/i, type: 'task', subtype: 'router-stuck',
        hint: 'Router dialog stuck. Verify Beat A (message) vs Beat B (choice). See AGENTS.md Router dialog section',
        severity: 'high' },
      { pattern: /promise.*stuck|processing.*forever/i, type: 'task', subtype: 'promise-stuck',
        hint: 'Promise stuck in processing. Check Ollama status with curl http://localhost:11435/api/ps',
        severity: 'high' },
      { pattern: /session.*expired|invalid.*session/i, type: 'task', subtype: 'session-invalid',
        hint: 'Session expired or invalid. Clear state: npm run monitor:reset',
        severity: 'medium' },

      // Gray room / server-side errors
      { pattern: /gray.*room|compress.*history/i, type: 'gray-room', subtype: 'processing',
        hint: 'Gray room processing error. Check A2A_GRAY_ROOM_MAX_TURNS setting',
        severity: 'medium' },
      { pattern: /interrupt.*loop/i, type: 'gray-room', subtype: 'interrupt',
        hint: 'Server interrupt loop issue. Check interrupt.reason in context',
        severity: 'medium' },

      // File system errors
      { pattern: /ENOENT|no.*such.*file/i, type: 'filesystem', subtype: 'not-found',
        hint: 'File not found. Check paths in TASK_MONITOR_* environment variables',
        severity: 'medium' },
      { pattern: /EACCES|permission.*denied/i, type: 'filesystem', subtype: 'permission',
        hint: 'Permission denied. Check file/directory permissions',
        severity: 'high' },
      { pattern: /EISDIR|is.*a.*directory/i, type: 'filesystem', subtype: 'is-directory',
        hint: 'Expected file but found directory. Check path configuration',
        severity: 'medium' },

      // JSON parsing errors
      { pattern: /JSON.*parse|unexpected.*token|syntax.*error.*json/i, type: 'parse', subtype: 'json',
        hint: 'Invalid JSON received. Check if service returned HTML error page instead of JSON',
        severity: 'high' },
      { pattern: /undefined.*is.*not.*valid.*json|cannot.*serialize/i, type: 'parse', subtype: 'serialization',
        hint: 'Data serialization failed. Check for circular references or undefined values',
        severity: 'medium' },

      // Axios/network specific errors
      { pattern: /socket.*hang.*up|socket.*timeout/i, type: 'network', subtype: 'socket',
        hint: 'Socket connection issue. Service may have restarted or network unstable',
        severity: 'high' },
      { pattern: /network.*error|xhr.*error/i, type: 'network', subtype: 'generic',
        hint: 'Network error. Check connectivity and service status',
        severity: 'high' },
      { pattern: /certificate|cert.*error|ssl/i, type: 'network', subtype: 'tls',
        hint: 'TLS/SSL certificate error. Check HTTPS configuration or use HTTP for dev',
        severity: 'medium' },

      // Request/payload errors
      { pattern: /request.*entity.*too.*large|payload.*too.*large/i, type: 'request', subtype: 'payload-size',
        hint: 'Payload too large. Reduce context size or enable compression',
        severity: 'medium' },
      { pattern: /unable.*to.*verify.*response/i, type: 'request', subtype: 'verification',
        hint: 'Response verification failed. Check if middleware is interfering',
        severity: 'medium' },

      // Task monitor specific
      { pattern: /max.*attempts.*exceeded|too.*many.*retries/i, type: 'monitor', subtype: 'retry-exhausted',
        hint: 'Max retry attempts reached. Check TASK_MONITOR_MAX_POLL_ATTEMPTS setting',
        severity: 'medium' },
      { pattern: /state.*corrupted|invalid.*state/i, type: 'monitor', subtype: 'state-error',
        hint: 'Monitor state corrupted. Reset with: npm run monitor:reset',
        severity: 'high' },
      { pattern: /concurrent.*modification|race.*condition/i, type: 'monitor', subtype: 'concurrency',
        hint: 'Concurrent state modification detected. Only run one monitor instance',
        severity: 'medium' },

      // Gray room / async specific
      { pattern: /async.*pending.*forever|never.*completes/i, type: 'async', subtype: 'infinite-pending',
        hint: 'Async operation never completed. Check Ollama status and restart if idle',
        severity: 'high' },
      { pattern: /promise.*leak|unresolved.*promise/i, type: 'async', subtype: 'leak',
        hint: 'Promise leak detected. Some async operations not properly tracked',
        severity: 'medium' },

      // Module/import errors
      { pattern: /cannot.*find.*module|module.*not.*found/i, type: 'module', subtype: 'import',
        hint: 'Module import failed. Run: npm install in all package directories',
        severity: 'critical' },
      { pattern: /require.*esm|esm.*error|cannot.*use.*import/i, type: 'module', subtype: 'esm',
        hint: 'ESM/CJS module conflict. Check package.json type field and file extensions',
        severity: 'high' }
    ];

    this.directTests = {
      connection: '.\\tests\\direct-tests\\run-checks.ps1 -Scope ClientServerLLM',
      schema: '.\\tests\\direct-tests\\test-dialog-flow.ps1',
      dialog: '.\\tests\\direct-tests\\dialog\\run-dialog-direct-ollama.ps1',
      sim: 'npm run sim:lint -- --all --json',
      simValidate: 'npm run sim:validate -- --all --json',
      health: 'curl http://localhost:3000/health && curl http://localhost:5173/api/a2a/projects',
      ollama: 'curl http://localhost:11435/api/tags',
      ollamaPs: 'curl http://localhost:11435/api/ps',
      ollamaLogs: 'docker logs ollama 2>&1 | tail -50',
      stack: '.\\start-all.bat (from repo root)',
      sessionInspect: 'curl http://localhost:5173/api/a2a/sessions/{sessionId}?includeContext=1',
      sessionSteps: 'curl http://localhost:5173/api/a2a/sessions/{sessionId}/steps',
      reset: 'npm run monitor:reset',
      promiseCheck: 'curl http://localhost:3000/api/v1/requests/{promiseId}/result',
      logsClient: 'cat a2a-client/logs/*.log | tail -100',
      logsServer: 'cat a2a-server/logs/*.log | tail -100',
      logsAiHub: 'cat ai-integration/proxy_logs/*.log | tail -100'
    };

    this.diagnosticScripts = {
      full: [
        { step: 1, name: 'Stack Health Check', cmd: 'health', critical: true },
        { step: 2, name: 'Connection Check', cmd: 'connection', critical: true },
        { step: 3, name: 'Ollama Models', cmd: 'ollama', critical: false },
        { step: 4, name: 'Ollama Status', cmd: 'ollamaPs', critical: false },
        { step: 5, name: 'Schema Validation', cmd: 'sim', critical: false }
      ],
      connection: [
        { step: 1, name: 'Stack Health', cmd: 'health', critical: true },
        { step: 2, name: 'Connection Test', cmd: 'connection', critical: true }
      ],
      llm: [
        { step: 1, name: 'Ollama Models', cmd: 'ollama', critical: true },
        { step: 2, name: 'Ollama Running', cmd: 'ollamaPs', critical: true },
        { step: 3, name: 'Full Stack', cmd: 'connection', critical: false }
      ],
      schema: [
        { step: 1, name: 'Schema Lint', cmd: 'sim', critical: true },
        { step: 2, name: 'Dialog Flow', cmd: 'dialog', critical: false }
      ]
    };
  }

  classify(error) {
    const message = error?.message || String(error);
    const status = error?.response?.status;
    const data = error?.response?.data;

    // Find matching pattern
    for (const { pattern, type, subtype, hint } of this.errorPatterns) {
      if (pattern.test(message) || (status && pattern.test(`status ${status}`))) {
        return {
          type,
          subtype,
          hint,
          message,
          status,
          responseData: data,
          diagnostic: this.buildDiagnostic(type, subtype, error)
        };
      }
    }

    // Default classification
    return {
      type: 'unknown',
      subtype: 'unclassified',
      hint: 'Unknown error. Check full error details and run diagnostics',
      message,
      status,
      responseData: data,
      diagnostic: this.buildDiagnostic('unknown', 'unclassified', error)
    };
  }

  buildDiagnostic(type, subtype, error) {
    const steps = [];
    let stepNum = 1;

    // Helper to add numbered steps
    const addStep = (title, commands) => {
      steps.push(`STEP ${stepNum}: ${title}`);
      if (Array.isArray(commands)) {
        for (const cmd of commands) {
          steps.push(`  ${cmd}`);
        }
      } else {
        steps.push(`  ${commands}`);
      }
      stepNum++;
    };

    // Stack status check - always first
    addStep('Verify stack is running', [
      `Command: ${this.directTests.health}`,
      `Or run: ${this.directTests.connection}`
    ]);

    // Type-specific diagnostics with more detailed steps
    switch (type) {
      case 'connection':
        addStep('Diagnose connection failure', [
          `Run full check: ${this.directTests.connection}`,
          'Check .env.local ports match actual allocations in task-monitor-state.json',
          `Verify services: ${this.directTests.health}`
        ]);
        if (subtype === 'refused') {
          steps.push('  Check if services started: .\\start-all.bat');
          steps.push('  Verify ports not blocked by firewall');
        }
        if (subtype === 'timeout') {
          steps.push('  Check FORWARD_TIMEOUT_SECONDS in .env (default 60, try 180)');
          steps.push('  Verify network latency with ping localhost');
        }
        break;

      case 'http':
        if (subtype === 'auth') {
          addStep('Fix authentication issues', [
            'Verify ENCRYPTION_KEY is exactly 32 characters in .env',
            'Verify JWT_SECRET is set (32+ characters)',
            'Or set SKIP_AUTH=1 in .env.local for development'
          ]);
        } else if (subtype === 'unavailable' || subtype === 'bad-gateway') {
          addStep('Check upstream services', [
            `Check Ollama: ${this.directTests.ollama}`,
            `Check AI Hub: curl http://localhost:11434/health`,
            `Check Ollama status: ${this.directTests.ollamaPs}`
          ]);
        } else {
          addStep('Check server health', [
            `Run: ${this.directTests.connection}`,
            'Check a2a-server console for stack traces',
            `View logs: ${this.directTests.logsServer}`
          ]);
        }
        break;

      case 'schema':
        addStep('Validate schema compliance', [
          `Run lint: ${this.directTests.sim}`,
          `Run validation: ${this.directTests.simValidate}`,
          'Check Action-Key Shape: { "execute": { "script": {...} } } format'
        ]);
        if (subtype === 'action-key') {
          steps.push('  See AGENTS.md#action-key-shape for examples');
          steps.push('  Ensure ONE action type per execute/result object');
        }
        break;

      case 'llm':
        addStep('Check LLM/Ollama status', [
          `List models: ${this.directTests.ollama}`,
          `Check running: ${this.directTests.ollamaPs}`,
          'Verify model is pulled: ollama pull qwen3:8b'
        ]);
        if (subtype === 'context') {
          steps.push('  Consider: A2A_GRAY_ROOM_ENABLED=1 for long context handling');
          steps.push('  Or reduce task complexity in prompt');
        }
        if (subtype === 'gpu-memory') {
          steps.push('  Switch to CPU: Set OLLAMA_GPU=0 or use smaller model');
        }
        break;

      case 'router':
        addStep('Debug router dialog flow', [
          `Run dialog test: ${this.directTests.schema}`,
          'Inspect session before sending choice',
          'Verify Beat A (message) sent before Beat B (choice)'
        ]);
        steps.push(`  Inspect session: ${this.directTests.sessionInspect.replace('{sessionId}', '<session-id>')}`);
        break;

      case 'session':
        addStep('Check session state', [
          `Inspect: ${this.directTests.sessionInspect.replace('{sessionId}', '<id>')}`,
          `Reset: ${this.directTests.reset}`,
          'Verify session ID format: sess_{timestamp}_{random}'
        ]);
        break;

      case 'task':
        if (subtype === 'timeout' || subtype === 'promise-stuck') {
          addStep('Diagnose task timeout', [
            `Check Ollama: ${this.directTests.ollamaPs}`,
            `Check if generating: ${this.directTests.ollamaPs}`,
            `View AI Hub logs: ${this.directTests.logsAiHub}`
          ]);
          steps.push('  DO NOT restart if Ollama is actively generating');
          steps.push('  Wait for generation to complete or model to load');
        }
        if (subtype === 'router-stuck') {
          addStep('Fix router dialog', [
            `Run: ${this.directTests.dialog}`,
            'Check form.choices in session response',
            'Ensure choice ID matches form.choices[*].id'
          ]);
        }
        break;

      case 'gray-room':
        addStep('Check gray room settings', [
          'Default: gray room on if A2A_GRAY_ROOM_ENABLED unset; set to 0 to disable interrupt chain',
          'Check A2A_GRAY_ROOM_MAX_TURNS and A2A_MAX_INTERRUPT_TURNS (budget)',
          'Review interrupt.reason in session context'
        ]);
        break;
    }

    // Session inspection for critical errors
    if (error?.sessionId) {
      addStep('Inspect failing session', [
        `GET: ${this.directTests.sessionInspect.replace('{sessionId}', error.sessionId)}`,
        `Steps: ${this.directTests.sessionSteps.replace('{sessionId}', error.sessionId)}`
      ]);
    }

    // Logs inspection
    addStep('Check recent logs', [
      `Client: ${this.directTests.logsClient}`,
      `Server: ${this.directTests.logsServer}`,
      `AI Hub: ${this.directTests.logsAiHub}`
    ]);

    // Final recovery options
    addStep('If issues persist', [
      `Full diagnostic: ${this.directTests.connection}`,
      `Full stack restart: ${this.directTests.stack}`,
      `Reset monitor state: ${this.directTests.reset}`
    ]);

    return steps.join('\n');
  }

  suggestQuickFix(classification) {
    const fixes = {
      'connection:refused': 'Start services: .\\start-all.bat',
      'connection:timeout': 'Increase timeout: $env:FORWARD_TIMEOUT_SECONDS=180',
      'connection:dns': 'Check .env.local for correct hostnames/ports',
      'connection:reset': 'Check if service crashed: .\\tests\\direct-tests\\run-checks.ps1 -Scope ClientServer',
      'http:auth': 'Set SKIP_AUTH=1 in .env.local',
      'http:notfound': 'Check URL paths in TASK_MONITOR_*_URL vars',
      'http:unavailable': 'Check Ollama: curl http://localhost:11435/api/ps',
      'http:bad-gateway': 'Check AI Hub and Ollama are running',
      'schema:action-key': 'Fix JSON shape: single key per execute/result object',
      'schema:validation': 'Run: npm run sim:lint -- --all',
      'llm:model': 'Pull model: ollama pull qwen3:8b',
      'llm:context': 'Gray room on by default; increase budgets or disable with A2A_GRAY_ROOM_ENABLED=0',
      'llm:gpu-memory': 'Switch to CPU: $env:OLLAMA_GPU=0',
      'llm:loading': 'Wait for model to load, then retry',
      'session:not-found': 'Clear state: npm run monitor:reset',
      'session:state-corrupt': 'Reset: npm run monitor:reset && restart',
      'router:choice': 'Check form.choices before sending choice ID',
      'router:beat': 'See AGENTS.md Router dialog section',
      'task:timeout': 'Check Ollama generating: curl http://localhost:11435/api/ps',
      'task:promise-stuck': 'DO NOT restart if Ollama generating; wait or kill process',
      'task:router-stuck': 'Verify Beat A/B: Run .\\tests\\direct-tests\\test-dialog-flow.ps1',
      'gray-room:processing': 'Check A2A_GRAY_ROOM_MAX_TURNS setting',
      'filesystem:not-found': 'Check TASK_MONITOR_TASKS_DIR path exists',
      'filesystem:permission': 'Check file permissions: icacls <path>',
      'parse:json': 'Check response format: curl <url> | head -20',
      'parse:serialization': 'Check data types before sending',
      'network:socket': 'Check service restarted: curl http://localhost:3000/health',
      'network:generic': 'Verify network connectivity',
      'network:tls': 'Use HTTP for dev: TASK_MONITOR_CLIENT_API_URL=http://localhost:5173/api/a2a',
      'request:payload-size': 'Reduce payload or increase limits',
      'monitor:retry-exhausted': 'Increase TASK_MONITOR_MAX_POLL_ATTEMPTS',
      'monitor:state-error': 'Reset: npm run monitor:reset',
      'monitor:concurrency': 'Stop other monitor instances',
      'async:infinite-pending': 'Check Ollama: curl http://localhost:11435/api/ps',
      'async:leak': 'Restart monitor and check for leaks',
      'module:import': 'Run: npm install in all packages',
      'module:esm': 'Check package.json type field'
    };

    const key = `${classification.type}:${classification.subtype}`;
    return fixes[key] || `Check diagnostic steps above (type: ${classification.type})`;
  }

  /**
   * Get specific direct test command for error type
   */
  getDirectTest(type, subtype) {
    const testMap = {
      'connection': 'connection',
      'http': 'connection',
      'schema': 'schema',
      'llm': 'ollama',
      'router': 'dialog',
      'task': 'schema',
      'gray-room': 'sim'
    };

    const testKey = testMap[type] || 'connection';
    return this.directTests[testKey];
  }

  /**
   * Build a comprehensive error report with all diagnostic info
   */
  buildErrorReport(classification, context = {}) {
    return {
      error: {
        type: classification.type,
        subtype: classification.subtype,
        severity: classification.severity,
        message: classification.message,
        status: classification.status
      },
      hint: classification.hint,
      quickFix: this.suggestQuickFix(classification),
      directTest: this.getDirectTest(classification.type, classification.subtype),
      diagnosticSteps: classification.diagnostic,
      context: context,
      timestamp: new Date().toISOString()
    };
  }
}

export { ServerUnavailableError, ErrorClassifier };