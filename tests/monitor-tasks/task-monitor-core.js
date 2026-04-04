import path from 'path';
import fs from 'fs';
import axios from 'axios';

class TaskMonitorCore {
  constructor() {
    // Environment-based configuration with defaults
    this.baseUrl = process.env.TASK_MONITOR_CLIENT_API_URL || 'http://localhost:5173/api/a2a';
    this.serverBaseUrl = process.env.TASK_MONITOR_SERVER_API_URL || 'http://localhost:3000/api/v1';
    this.projectId = process.env.TASK_MONITOR_PROJECT_ID || null; // Will auto-fetch if null
    this.stateFile = path.resolve(process.env.TASK_MONITOR_STATE_FILE || 'task-monitor-state.json');
    this.tasksDir = path.resolve(process.env.TASK_MONITOR_TASKS_DIR || 'prompts-to-agent-mode');
    this.hooksDir = path.join(process.cwd(), 'hooks');
    this.pollIntervalMs = parseInt(process.env.TASK_MONITOR_POLL_INTERVAL_MS || '5000', 10);
    this.maxPollAttempts = parseInt(process.env.TASK_MONITOR_MAX_POLL_ATTEMPTS || '60', 10);
    this.pollTimeoutMs = parseInt(process.env.TASK_MONITOR_POLL_TIMEOUT_MS || '300000', 10);
    this.logLevel = process.env.TASK_MONITOR_LOG_LEVEL || 'info';
    this.aiHubUrl = (process.env.TASK_MONITOR_AI_HUB_URL || 'http://localhost:11434').replace(
      /\/$/,
      ''
    );
    this.skipPromiseGate =
      process.env.TASK_MONITOR_SKIP_PROMISE_GATE === '1' ||
      process.env.TASK_MONITOR_SKIP_PROMISE_GATE === 'true' ||
      process.env.TASK_MONITOR_SKIP_PROMISE_GATE === 'yes';

    this.hardbitState = { server: false, llm: false, client: true };
    this.activeTasks = new Map(); // sessionId -> task metadata
    this.errorLog = []; // Track errors for pattern analysis
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        this.state = JSON.parse(data);

        // Restore active tasks if in daemon mode
        if (this.state.activeTasks) {
          this.activeTasks = new Map(Object.entries(this.state.activeTasks));
        }

        console.log(`Loaded state: ${JSON.stringify(this.state)}`);
      } else {
        this.state = this.buildInitialState();
        this.saveState();
      }
    } catch (error) {
      this.logError('loadState', error);
      this.state = this.buildInitialState();
      this.state.status = 'error';
      this.activeTasks.clear();
    }
  }

  buildInitialState() {
    return {
      lastChecked: null,
      processedTasks: [],
      currentTask: null,
      sessionId: null,
      status: 'idle',
      activeTasks: {}
    };
  }

  resetStateForFreshRun() {
    console.log('Clearing previous monitor state for a fresh run...');
    this.activeTasks.clear();
    // Keep processedTasks to avoid reprocessing completed/failed tasks
    const processedTasks = this.state.processedTasks || [];
    this.state = this.buildInitialState();
    this.state.processedTasks = processedTasks;
    this.saveState();
  }

  saveState() {
    try {
      this.state.lastChecked = new Date().toISOString();
      // Convert Map to object for JSON serialization
      this.state.activeTasks = Object.fromEntries(this.activeTasks);
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      this.logError('saveState', error);
    }
  }

  recordProcessedTask(taskName, status, detail) {
    this.state.processedTasks = this.state.processedTasks || [];
    this.state.processedTasks = this.state.processedTasks.filter(entry => entry.name !== taskName);
    this.state.processedTasks.push({
      name: taskName,
      status,
      detail: detail || null,
      updatedAt: new Date().toISOString()
    });
  }

  log(level, message, ...args) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[this.logLevel] ?? 2;
    const msgLevel = levels[level] ?? 2;
    if (msgLevel <= currentLevel) {
      const prefix = `[${level.toUpperCase()}]`;
      if (args.length > 0) {
        console.log(prefix, message, ...args);
      } else {
        console.log(prefix, message);
      }
    }
  }

  logError(context, error, taskName = null, extraContext = {}) {
    // Build full context including session info
    const fullContext = {
      task: taskName,
      sessionId: extraContext.sessionId || this.state?.sessionId || null,
      phase: extraContext.phase || null,
      attempts: extraContext.attempts || null,
      ...extraContext
    };

    // Add sessionId to error object for diagnostic use
    if (fullContext.sessionId) {
      error.sessionId = fullContext.sessionId;
    }

    const classification = this.errorClassifier.classify(error);
    const quickFix = this.errorClassifier.suggestQuickFix(classification);
    const directTest = this.errorClassifier.getDirectTest(classification.type, classification.subtype);

    // Track error for pattern analysis
    this.errorLog.push({
      timestamp: new Date().toISOString(),
      context,
      task: taskName,
      type: classification.type,
      subtype: classification.subtype,
      message: classification.message,
      severity: classification.severity,
      sessionId: fullContext.sessionId
    });

    // Print detailed error report
    console.error(`\n${'='.repeat(70)}`);
    console.error(`❌ ERROR in ${context}${taskName ? ` (task: ${taskName})` : ''}`);
    console.error(`${'='.repeat(70)}`);
    console.error(`Type: ${classification.type}:${classification.subtype}`);
    console.error(`Severity: ${classification.severity?.toUpperCase() || 'UNKNOWN'}`);
    console.error(`Message: ${classification.message}`);
    if (classification.status) {
      console.error(`HTTP Status: ${classification.status}`);
    }
    if (fullContext.sessionId) {
      console.error(`Session: ${fullContext.sessionId}`);
    }
    if (fullContext.phase) {
      console.error(`Phase: ${fullContext.phase}`);
    }

    console.error(`\n💡 HINT: ${classification.hint}`);
    console.error(`\n🔧 QUICK FIX: ${quickFix}`);
    console.error(`\n🧪 DIRECT TEST: ${directTest}`);
    console.error(`\n📋 DIAGNOSTIC STEPS:\n${classification.diagnostic}`);

    // Print full error report object in debug mode
    if (this.logLevel === 'debug') {
      const report = this.errorClassifier.buildErrorReport(classification, fullContext);
      console.error(`\n📄 FULL ERROR REPORT (JSON):`);
      console.error(JSON.stringify(report, null, 2));
    }

    console.error(`${'='.repeat(70)}\n`);

    // Log response data if available
    if (classification.responseData) {
      this.log('debug', 'Response data:', JSON.stringify(classification.responseData, null, 2));
    }

    return classification;
  }

  getErrorPatterns() {
    const patterns = {};
    for (const entry of this.errorLog) {
      const key = `${entry.type}:${entry.subtype}`;
      patterns[key] = (patterns[key] || 0) + 1;
    }
    return Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ pattern: key, count }));
  }

  suggestDiagnostic() {
    const patterns = this.getErrorPatterns();
    if (patterns.length === 0) return null;

    const topPattern = patterns[0];
    const [type, subtype] = topPattern.pattern.split(':');

    return {
      mostFrequent: topPattern,
      allPatterns: patterns,
      suggestion: this.errorClassifier.buildDiagnostic(type, subtype, null)
    };
  }

  printDiagnosticSummary() {
    const patterns = this.getErrorPatterns();
    const diagnostic = this.suggestDiagnostic();

    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log(`${'='.repeat(70)}`);
    console.log(`Total errors logged: ${this.errorLog.length}`);

    if (patterns.length > 0) {
      console.log('\n🔍 Error pattern breakdown:');
      for (const { pattern, count } of patterns.slice(0, 5)) {
        const [type, subtype] = pattern.split(':');
        const severity = this.errorClassifier.errorPatterns.find(p =>
          p.type === type && p.subtype === subtype
        )?.severity || 'unknown';
        const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '⚪';
        console.log(`  ${icon} ${pattern}: ${count} occurrence(s)`);
      }
    }

    if (diagnostic) {
      console.log(`\n⚠️  Most frequent issue: ${diagnostic.mostFrequent.pattern}`);
      console.log(`   Count: ${diagnostic.mostFrequent.count}`);
      console.log('\n📋 Recommended diagnostic steps:');
      console.log(diagnostic.suggestion);
    }

    console.log('\n🚀 Quick commands to run:');
    console.log('   Full check:   .\\tests\\direct-tests\\run-checks.ps1 -Scope Full');
    console.log('   Dialog flow:  .\\tests\\direct-tests\\test-dialog-flow.ps1');
    console.log('   Sim lint:     npm run sim:lint -- --all');
    console.log('   Sim validate: npm run sim:validate -- --all');
    console.log('   Health:       curl http://localhost:3000/health');
    console.log('   Ollama:       curl http://localhost:11435/api/tags');
    console.log('   Reset state:  npm run monitor:reset');
    console.log(`${'='.repeat(70)}\n`);
  }

  /**
   * Run a quick health diagnostic and print results
   */
  async runQuickDiagnostic() {
    console.log('\n🔍 Running quick health diagnostic...\n');

    const health = await this.healthCheck();

    console.log('Service Status:');
    console.log(`  Client API: ${health.clientApi ? '✅' : '❌'} ${health.details.clientApi}`);
    console.log(`  A2A Server: ${health.a2aServer ? '✅' : '❌'} ${health.details.a2aServer}`);
    console.log(`  Ollama:     ${health.ollama ? '✅' : '❌'} ${health.details.ollama}`);
    console.log(`  AI Hub:     ${health.aiHub ? '✅' : '❌'} ${health.details.aiHub}`);

    if (!health.allOk) {
      console.log('\n⚠️  Some services are not healthy. Run:');
      console.log('   .\\tests\\direct-tests\\run-checks.ps1 -Scope Full');
    }

    return health;
  }

  /**
   * When ai-integration runs with PROMISE_DAEMON_ONLY=true, LLM calls with ?promise=1 stay pending
   * until the promise daemon or a manual POST /promise/{id}/execute runs. Warn and optionally block.
   */
  async promptPromiseManualGateIfNeeded() {
    let data;
    try {
      const response = await axios.get(`${this.aiHubUrl}/health`, {
        timeout: 8000,
        validateStatus: () => true
      });
      if (response.status !== 200 || !response.data || typeof response.data !== 'object') {
        this.log(
          'warn',
          `AI hub health at ${this.aiHubUrl}/health not OK (status ${response.status}); skipping promise-mode gate`
        );
        return;
      }
      data = response.data;
    } catch (err) {
      this.log(
        'warn',
        `Could not reach AI hub at ${this.aiHubUrl} (${err.message}); skipping promise-mode gate`
      );
      return;
    }

    if (data.promise_daemon_only !== true) {
      return;
    }

    const lines = [
      '',
      '='.repeat(72),
      'AI INTEGRATION: PROMISE_DAEMON_ONLY is ON',
      '='.repeat(72),
      'Async LLM requests (?promise=1) are NOT forwarded immediately. They wait in',
      `${data.storage_dir || 'proxy_logs'}/promises/ until something executes them.`,
      '',
      'Options:',
      `  1) Keep the promise-queue daemon running (stack start / ai-integration daemon).`,
      `  2) Execute manually: GET ${this.aiHubUrl}/promises/pending then`,
      `     POST ${this.aiHubUrl}/promise/<promiseId>/execute`,
      `  3) Or set PROMISE_DAEMON_ONLY=false in ai-integration env for inline execution.`,
      '',
      'Inspect prompts: meta.json → log_folder → request.json (body), or',
      `  GET ${this.aiHubUrl}/promise/<promiseId>/request`,
      `  UI: ${this.aiHubUrl}/ui/promises/view`,
      '',
      'Docs: ai-integration/docs/workflows/WORKFLOWS.md — MONITOR-QUICK-START.md (promise gate)',
      '='.repeat(72),
      ''
    ];
    console.log(lines.join('\n'));

    if (this.skipPromiseGate || process.env.CI === 'true') {
      console.log(
        '[task-monitor] TASK_MONITOR_SKIP_PROMISE_GATE or CI set — continuing without confirmation.'
      );
      return;
    }

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      console.warn(
        '[task-monitor] Non-interactive terminal: not waiting for input. Set TASK_MONITOR_SKIP_PROMISE_GATE=1 in CI, or ensure the promise daemon is running.'
      );
      return;
    }

    const readline = await import('node:readline/promises');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    try {
      let answer = '';
      while (!/^ok$/i.test(answer)) {
        answer = (
          await rl.question(
            'Type OK and press Enter when promises will be executed (daemon on or you accept manual runs): '
          )
        ).trim();
        if (!/^ok$/i.test(answer)) {
          console.log('  Expected exactly: OK');
        }
      }
    } finally {
      rl.close();
    }
    console.log('[task-monitor] Continuing.\n');
  }

  logHardBit({ phase, serverBusy = false, llmBusy = false, detail = '' }) {
    // Only update state if explicitly set (avoid overwriting with false)
    if (serverBusy !== false || llmBusy !== false) {
      this.hardbitState.server = serverBusy;
      this.hardbitState.llm = llmBusy;
    }
    this.hardbitState.client = Boolean(this.state.sessionId);
    const bits = [
      this.hardbitState.server ? 'S' : '-',
      this.hardbitState.llm ? 'L' : '-',
      this.hardbitState.client ? 'C' : '-',
    ].join('');
    const meta = detail ? ' ' + detail : '';
    console.log(`[hardbit:${bits}] phase=${phase}${meta}`);
  }
}

export { TaskMonitorCore };