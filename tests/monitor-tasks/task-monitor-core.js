import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { emitProbeLogLines, probePromiseQueues } from './promise-queue-probe.mjs';

function normalizeLocalhostLoopback(url) {
  if (typeof url !== 'string' || !url) return url;
  return url.replace('://localhost', '://127.0.0.1');
}

class TaskMonitorCore {
  constructor() {
    // Environment-based configuration with defaults
    this.baseUrl = normalizeLocalhostLoopback(
      process.env.TASK_MONITOR_CLIENT_API_URL || 'http://127.0.0.1:5173/api/a2a'
    );
    this.serverBaseUrl = normalizeLocalhostLoopback(
      process.env.TASK_MONITOR_SERVER_API_URL || 'http://127.0.0.1:3000/api/v1'
    );
    this.projectId = process.env.TASK_MONITOR_PROJECT_ID || null; // Will auto-fetch if null
    this.stateFile = path.resolve(process.env.TASK_MONITOR_STATE_FILE || 'task-monitor-state.json');
    this.tasksDir = path.resolve(process.env.TASK_MONITOR_TASKS_DIR || 'prompts-to-agent-mode');
    this.taskListPath = process.env.TASK_MONITOR_TASK_LIST
      ? path.resolve(process.cwd(), process.env.TASK_MONITOR_TASK_LIST)
      : null;
    this.hooksDir = path.join(process.cwd(), 'hooks');
    this.pollIntervalMs = parseInt(process.env.TASK_MONITOR_POLL_INTERVAL_MS || '5000', 10);
    this.pollMinProcessingMs = parseInt(
      process.env.TASK_MONITOR_POLL_MIN_PROCESSING_MS || '1200',
      10
    );
    this.pollIdleMaxMs = parseInt(process.env.TASK_MONITOR_POLL_IDLE_MAX_MS || '30000', 10);
    this.idleEarlyStallPolls = parseInt(
      process.env.TASK_MONITOR_IDLE_EARLY_STALL_POLLS || '12',
      10
    );
    // Defaults: 120 × 5s ≈ 10m wall time (local LLM agent turns often exceed 5m; old 60×5s ≈ 301s false timeouts)
    this.maxPollAttempts = parseInt(process.env.TASK_MONITOR_MAX_POLL_ATTEMPTS || '120', 10);
    this.pollTimeoutMs = parseInt(process.env.TASK_MONITOR_POLL_TIMEOUT_MS || '600000', 10);
    // Fail faster when async status/step does not change for too many polls (0 disables).
    this.stallPolls = parseInt(process.env.TASK_MONITOR_STALL_POLLS || '40', 10);
    /** Wall clock while agent stays in tool_* steps (async busy); 0 disables. Default 3m — faster than full poll timeout when tools keep rotating. */
    const _ats = parseInt(process.env.TASK_MONITOR_AGENT_TOOL_STALL_MS || '180000', 10);
    this.agentToolStallMs = Number.isFinite(_ats) && _ats >= 0 ? _ats : 0;
    /** 0 = no limit. With `node … --once`, entry defaults env to 1 unless TASK_MONITOR_MAX_TASKS_PER_RUN is set. */
    const _maxTasks = parseInt(process.env.TASK_MONITOR_MAX_TASKS_PER_RUN || '0', 10);
    this.maxTasksPerRun = Number.isFinite(_maxTasks) && _maxTasks >= 0 ? _maxTasks : 0;
    this.logLevel = process.env.TASK_MONITOR_LOG_LEVEL || 'info';
    this.maxRetriesPerFingerprint = parseInt(
      process.env.TASK_MONITOR_MAX_RETRIES_PER_FINGERPRINT || '2',
      10
    );
    this.promiseErrorFreshWindowMinutes = parseInt(
      process.env.TASK_MONITOR_PROMISE_ERROR_FRESH_MINUTES || '60',
      10
    );
    this.promiseErrorMaintenanceDays = parseInt(
      process.env.TASK_MONITOR_PROMISE_ERROR_MAINTENANCE_DAYS || '0',
      10
    );
    this.promiseErrorMaintenanceAction = String(
      process.env.TASK_MONITOR_PROMISE_ERROR_MAINTENANCE_ACTION || 'none'
    ).toLowerCase();
    this.aiHubUrl = normalizeLocalhostLoopback(
      (process.env.TASK_MONITOR_AI_HUB_URL || 'http://127.0.0.1:11434').replace(
      /\/$/,
      ''
      )
    );
    this.skipPromiseGate =
      process.env.TASK_MONITOR_SKIP_PROMISE_GATE === '1' ||
      process.env.TASK_MONITOR_SKIP_PROMISE_GATE === 'true' ||
      process.env.TASK_MONITOR_SKIP_PROMISE_GATE === 'yes';

    this.hardbitState = { server: false, llm: false, client: true };
    this.activeTasks = new Map(); // sessionId -> task metadata
    this.errorLog = []; // Track errors for pattern analysis
    this.runMetrics = {
      startedAt: new Date().toISOString(),
      promiseErrors: { newThisRun: 0, fresh: 0, old401: 0, staleCandidates: 0, staleHandled: 0 },
    };
    this.loadState();
  }

  /** Client API web origin for `/api/a2a/hub/*` probes (from `TASK_MONITOR_WEB_BASE`, `WEB_BASE`, or `baseUrl`). */
  _clientWebOrigin() {
    const explicit = (process.env.TASK_MONITOR_WEB_BASE || process.env.WEB_BASE || '').replace(
      /\/$/,
      ''
    );
    if (explicit) return explicit;
    const bu = String(this.baseUrl || '').replace(/\/$/, '');
    if (/\/api\/a2a$/i.test(bu)) return bu.replace(/\/api\/a2a$/i, '');
    return '';
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        this.state = JSON.parse(data);
        if (!this.state.taskSessions || typeof this.state.taskSessions !== 'object') {
          this.state.taskSessions = {};
        }
        if (!this.state.taskRuntime || typeof this.state.taskRuntime !== 'object') {
          this.state.taskRuntime = {};
        }
        if (!this.state.promiseQueue || typeof this.state.promiseQueue !== 'object') {
          this.state.promiseQueue = { knownErrorIds: {}, lastMaintenanceAt: null };
        }
        if (
          !this.state.promiseQueue.knownErrorIds ||
          typeof this.state.promiseQueue.knownErrorIds !== 'object'
        ) {
          this.state.promiseQueue.knownErrorIds = {};
        }

        // Restore active tasks if in daemon mode
        if (this.state.activeTasks) {
          this.activeTasks = new Map(Object.entries(this.state.activeTasks));
        }

        if (process.env.TASK_MONITOR_QUIET !== '1') {
          console.log(`Loaded state: ${JSON.stringify(this.state)}`);
        }
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
      activeTasks: {},
      /** One Client API session id per prompts-to-agent-mode markdown task (monitor self-check loop). */
      taskSessions: {},
      /** Per task retry/fingerprint telemetry (resume policy). */
      taskRuntime: {},
      promiseQueue: {
        knownErrorIds: {},
        lastMaintenanceAt: null,
      },
    };
  }

  _safeObject(input, fallback = {}) {
    return input && typeof input === 'object' ? input : fallback;
  }

  _hashText(input) {
    const s = String(input || '');
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return `h${(h >>> 0).toString(16)}`;
  }

  buildFailureFingerprint(detail, stageHint = '') {
    const raw = `${String(detail || '').trim()}|${String(stageHint || '').trim()}`.toLowerCase();
    return this._hashText(raw);
  }

  getTaskRuntime(taskName) {
    this.state.taskRuntime = this._safeObject(this.state.taskRuntime, {});
    this.state.taskRuntime[taskName] = this._safeObject(this.state.taskRuntime[taskName], {
      retryCount: 0,
      lastFailureFingerprint: null,
      lastFailureDetail: null,
      lastSessionId: null,
      lastDecision: null,
      updatedAt: null,
    });
    return this.state.taskRuntime[taskName];
  }

  noteTaskFailure(taskName, sessionId, detail, stageHint = '') {
    if (!taskName) return;
    const row = this.getTaskRuntime(taskName);
    const fp = this.buildFailureFingerprint(detail, stageHint);
    row.retryCount = row.lastFailureFingerprint === fp ? Number(row.retryCount || 0) + 1 : 1;
    row.lastFailureFingerprint = fp;
    row.lastFailureDetail = String(detail || '').slice(0, 1000) || null;
    row.lastSessionId = sessionId || null;
    row.updatedAt = new Date().toISOString();
    this.saveState();
  }

  noteTaskSuccess(taskName) {
    if (!taskName) return;
    const row = this.getTaskRuntime(taskName);
    row.retryCount = 0;
    row.lastFailureFingerprint = null;
    row.lastFailureDetail = null;
    row.lastSessionId = null;
    row.lastDecision = 'completed';
    row.updatedAt = new Date().toISOString();
    this.saveState();
  }

  decideResumePolicy(taskName, resumeSid) {
    const row = this.getTaskRuntime(taskName);
    const cap = Number.isFinite(this.maxRetriesPerFingerprint) ? this.maxRetriesPerFingerprint : 2;
    const shouldForceNew =
      Boolean(resumeSid) &&
      Boolean(row.lastFailureFingerprint) &&
      Number(row.retryCount || 0) >= Math.max(1, cap) &&
      (!row.lastSessionId || row.lastSessionId === resumeSid);
    row.lastDecision = shouldForceNew ? 'new-session' : 'rewind-resume';
    row.updatedAt = new Date().toISOString();
    this.saveState();
    return { shouldForceNew, reason: row.lastDecision };
  }

  computePollDelayMs({ isAsyncPending, idleStablePolls = 0 }) {
    const base = Math.max(500, this.pollIntervalMs || 5000);
    if (isAsyncPending) {
      return Math.max(800, Math.min(base, this.pollMinProcessingMs || 1200));
    }
    const backoff = Math.min(this.pollIdleMaxMs || 30000, base * Math.pow(2, Math.max(0, idleStablePolls)));
    return Math.max(base, backoff);
  }

  /**
   * Bind `taskName` -> `sessionId` so each monitor task uses at most one session until done or explicit reset.
   * @param {string} taskName
   * @param {{ id: string }} sessionData
   */
  recordTaskSessionSnapshot(taskName, sessionData) {
    if (!taskName || !sessionData?.id) return;
    this.state.taskSessions = this.state.taskSessions && typeof this.state.taskSessions === 'object' ? this.state.taskSessions : {};
    this.state.taskSessions[taskName] = {
      sessionId: sessionData.id,
      updatedAt: new Date().toISOString()
    };
    this.saveState();
  }

  /** Drop binding after the task is marked completed (prompt file updated). */
  clearTaskSessionBinding(taskName) {
    if (!taskName || !this.state.taskSessions?.[taskName]) return;
    delete this.state.taskSessions[taskName];
    this.saveState();
  }

  resetStateForFreshRun() {
    console.log(
      'Preparing run: clearing activeTasks map only — sessionId / currentTask stay in state file for resume.'
    );
    this.activeTasks.clear();
    if (!this.state || typeof this.state !== 'object') {
      this.state = this.buildInitialState();
    }
    this.state.activeTasks = {};
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

  /**
   * @param {string} taskName
   * @param {'completed'|'failed'} status
   * @param {string|null} detail
   * @param {{ sessionId?: string|null, projectId?: string|null }} [meta]
   */
  recordProcessedTask(taskName, status, detail, meta = {}) {
    this.state.processedTasks = this.state.processedTasks || [];
    this.state.processedTasks = this.state.processedTasks.filter((entry) => entry.name !== taskName);
    const sessionId =
      meta.sessionId != null && String(meta.sessionId).trim() !== ''
        ? String(meta.sessionId).trim()
        : null;
    const projectId =
      meta.projectId != null && String(meta.projectId).trim() !== ''
        ? String(meta.projectId).trim()
        : null;
    const row = {
      name: taskName,
      status,
      detail: detail || null,
      updatedAt: new Date().toISOString(),
    };
    if (sessionId) row.sessionId = sessionId;
    if (projectId) row.projectId = projectId;
    this.state.processedTasks.push(row);
    if (status === 'completed' && sessionId) {
      this.appendCompletedSessionsLedger(taskName, sessionId, projectId);
    }
  }

  /** Entries with a Client API session that finished the monitor prompt (for scripts / operators). */
  getCompletedTasksWithSessions() {
    return (this.state.processedTasks || [])
      .filter((t) => t.status === 'completed' && t.sessionId)
      .map((t) => ({
        taskName: t.name,
        sessionId: t.sessionId,
        projectId: t.projectId || null,
        updatedAt: t.updatedAt,
      }));
  }

  /**
   * One row per prompt file for downstream scripts: `processedTasks` wins for `sessionId` / `projectId` /
   * `updatedAt`; ledger supplies `completedAt` when present. Ledger-only rows survive a partial state reset.
   * @param {Array<{taskName: string, sessionId: string, projectId?: string|null, updatedAt?: string}>} fromState
   * @param {Array<{taskName: string, sessionId: string, projectId?: string|null, completedAt?: string}>} fromLedger
   */
  mergeCompletedSessionsForExport(fromState, fromLedger) {
    const map = new Map();
    for (const i of fromLedger) {
      if (!i?.taskName || !i?.sessionId) continue;
      map.set(i.taskName, {
        taskName: i.taskName,
        sessionId: String(i.sessionId),
        projectId: i.projectId ?? null,
        completedAt: i.completedAt || null,
        updatedAt: null,
        sources: ['ledger'],
      });
    }
    for (const r of fromState) {
      if (!r?.taskName || !r?.sessionId) continue;
      const prev = map.get(r.taskName);
      if (!prev) {
        map.set(r.taskName, {
          taskName: r.taskName,
          sessionId: String(r.sessionId),
          projectId: r.projectId ?? null,
          completedAt: null,
          updatedAt: r.updatedAt || null,
          sources: ['state'],
        });
      } else {
        prev.sessionId = String(r.sessionId);
        if (r.projectId != null && String(r.projectId).trim() !== '') prev.projectId = String(r.projectId).trim();
        if (r.updatedAt) prev.updatedAt = r.updatedAt;
        if (!prev.sources.includes('state')) prev.sources.push('state');
      }
    }
    return [...map.values()]
      .filter((row) => row.sessionId)
      .sort((a, b) =>
        String(b.completedAt || b.updatedAt || '').localeCompare(String(a.completedAt || a.updatedAt || ''))
      );
  }

  /** @returns {{ file: string|null, items: Array<{taskName: string, sessionId: string, projectId?: string|null, completedAt?: string}> }} */
  readCompletedSessionsLedger() {
    if (process.env.TASK_MONITOR_COMPLETED_SESSIONS_FILE === '0') {
      return { file: null, items: [] };
    }
    const file = path.resolve(
      process.env.TASK_MONITOR_COMPLETED_SESSIONS_FILE ||
        path.join(path.dirname(this.stateFile), 'task-monitor-completed-sessions.json')
    );
    if (!fs.existsSync(file)) {
      return { file, items: [] };
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      return { file, items };
    } catch {
      return { file, items: [] };
    }
  }

  /**
   * Operator / CI: map finished prompts → Client API `sessionId` (disk under `a2a-client/storage/sessions/{id}/`).
   * @param {string[]} argv
   */
  printCompletedSessionsExport(argv = []) {
    const asJson = argv.includes('--json');
    const fromState = this.getCompletedTasksWithSessions();
    const { file: ledgerFile, items: fromLedger } = this.readCompletedSessionsLedger();
    if (asJson) {
      const merged = this.mergeCompletedSessionsForExport(fromState, fromLedger);
      console.log(
        JSON.stringify(
          {
            stateFile: this.stateFile,
            ledgerFile,
            merged,
            fromState,
            fromLedger,
          },
          null,
          2
        )
      );
      return;
    }
    console.log('Task Monitor — completed prompts ↔ Client API sessions\n');
    console.log(`stateFile: ${this.stateFile}`);
    if (fromState.length === 0) {
      console.log('fromState: (no completed rows with sessionId)');
    } else {
      console.log(`fromState (${fromState.length}):`);
      for (const r of fromState) {
        const p = r.projectId ? ` projectId=${r.projectId}` : '';
        console.log(`  • ${r.taskName}  sessionId=${r.sessionId}${p}  updatedAt=${r.updatedAt}`);
      }
    }
    if (ledgerFile) {
      console.log(`\nledgerFile: ${ledgerFile} (${fromLedger.length} row(s), newest first)`);
      const tail = fromLedger.slice(0, 25);
      for (const i of tail) {
        const p = i.projectId ? ` projectId=${i.projectId}` : '';
        console.log(
          `  • ${i.taskName}  sessionId=${i.sessionId}${p}  completedAt=${i.completedAt || ''}`
        );
      }
      if (fromLedger.length > tail.length) {
        console.log(`  … +${fromLedger.length - tail.length} more`);
      }
    }
    const merged = this.mergeCompletedSessionsForExport(fromState, fromLedger);
    console.log(`\nmerged (${merged.length}): one row per prompt — use \`--json\` → \`merged\` for scripts`);
    const mtail = merged.slice(0, 15);
    for (const r of mtail) {
      const p = r.projectId ? ` projectId=${r.projectId}` : '';
      const ca = r.completedAt ? ` completedAt=${r.completedAt}` : '';
      const ua = r.updatedAt ? ` updatedAt=${r.updatedAt}` : '';
      console.log(`  • ${r.taskName}  sessionId=${r.sessionId}${p}${ca}${ua}  [${r.sources.join('+')}]`);
    }
    if (merged.length > mtail.length) console.log(`  … +${merged.length - mtail.length} more`);
    console.log(
      '\nTip: `node monitor-and-process-tasks.js --list-completed --json` → field `merged` (canonical for automation).'
    );
  }

  logCompletedSessionsSummary() {
    const rows = this.getCompletedTasksWithSessions();
    if (rows.length === 0) {
      console.log('[task-monitor] No completed monitor tasks with sessionId on record yet.');
      return;
    }
    const tail = rows.slice(-20);
    console.log(
      `[task-monitor] Completed prompts ↔ Client API sessions (${rows.length} on record, showing last ${tail.length}):`
    );
    for (const r of tail) {
      const p = r.projectId ? ` projectId=${r.projectId}` : '';
      console.log(`  • ${r.taskName}  sessionId=${r.sessionId}${p}`);
    }
    const exportHint =
      process.env.TASK_MONITOR_COMPLETED_SESSIONS_FILE === '0'
        ? '(ledger export disabled)'
        : `ledger: ${path.join(path.dirname(this.stateFile), 'task-monitor-completed-sessions.json')}`;
    console.log(
      `[task-monitor] Canonical: ${path.basename(this.stateFile)} → processedTasks[]  ${exportHint}`
    );
  }

  /**
   * Append-only friendly file (same dir as state unless TASK_MONITOR_COMPLETED_SESSIONS_FILE is set).
   * Set TASK_MONITOR_COMPLETED_SESSIONS_FILE=0 to disable.
   */
  appendCompletedSessionsLedger(taskName, sessionId, projectId) {
    if (process.env.TASK_MONITOR_COMPLETED_SESSIONS_FILE === '0') {
      return;
    }
    const file = path.resolve(
      process.env.TASK_MONITOR_COMPLETED_SESSIONS_FILE ||
        path.join(path.dirname(this.stateFile), 'task-monitor-completed-sessions.json')
    );
    let data = { version: 1, items: [] };
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (parsed && Array.isArray(parsed.items)) {
          data = { version: 1, items: parsed.items };
        }
      }
    } catch {
      /* reset */
    }
    data.items = data.items.filter((i) => i && i.taskName !== taskName);
    data.items.unshift({
      taskName,
      sessionId,
      projectId: projectId || null,
      completedAt: new Date().toISOString(),
    });
    data.items = data.items.slice(0, 250);
    data.updatedAt = new Date().toISOString();
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) {
      this.log('warn', `[task-monitor] Could not write completed-sessions ledger: ${e.message}`);
    }
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
    console.log('   Local LLM upstream:       curl http://localhost:11435/api/tags');
    console.log('   Reset monitor JSON:  npm run monitor:reset');
    console.log('   Full local wipe:     npm run cleanup:fresh  (then start-all.bat)');
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
    console.log(`  Local LLM upstream:     ${health.compat_llm ? '✅' : '❌'} ${health.details.compat_llm}`);
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
      'Options (async contract — keep PROMISE_DAEMON_ONLY on):',
      `  1) Keep the promise-queue daemon running (stack start / ai-integration daemon).`,
      `  2) Execute manually: GET ${this.aiHubUrl}/promises/pending then`,
      `     POST ${this.aiHubUrl}/promise/<promiseId>/execute`,
      `  3) Do not switch the proxy to synchronous forwarding; draining this queue is the supported path.`,
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
      await this.logHubPromiseQueueSnapshot();
      return;
    }

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      console.warn(
        '[task-monitor] Non-interactive terminal: not waiting for input. Set TASK_MONITOR_SKIP_PROMISE_GATE=1 in CI, or ensure the promise daemon is running.'
      );
      await this.logHubPromiseQueueSnapshot();
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
    await this.logHubPromiseQueueSnapshot();
  }

  /**
   * Hub `/promises/pending` + `/promises/errors` (with error text previews) + optional Client API hub proxy.
   * Same probes as `npm run check:promise-queue` (shared `probePromiseQueues` in `promise-queue-probe.mjs`).
   */
  async logHubPromiseQueueSnapshot() {
    if (process.env.TASK_MONITOR_SKIP_HUB_PENDING_PROBE === '1') {
      return;
    }
    const checkErrors = process.env.PROMISES_CHECK_ERRORS !== '0';
    const checkHealth = process.env.TASK_MONITOR_HUB_PROBE_HEALTH === '1';
    const probeMs = parseInt(process.env.TASK_MONITOR_HUB_PENDING_TIMEOUT_MS || '20000', 10);
    try {
      const result = await probePromiseQueues({
        hubBase: this.aiHubUrl,
        webBase: this._clientWebOrigin(),
        timeoutMs: probeMs,
        checkHealth,
        checkErrors,
        pendingNonOkIsError: false,
      });
      emitProbeLogLines(result, (level, text) => this.log(level, text));
      await this.applyPromiseQueueMaintenance(result);
      if (result.errors.count > 0) {
        this.log(
          'warn',
          `[task-monitor] Hub /promises/errors: ${result.errors.count} ticket(s) (see lines above). Fix: POST .../promise/<id>/retry + /execute or DELETE — PROXY_API.md`
        );
      }
      if (result.pending.count > 0) {
        this.log(
          'warn',
          `[task-monitor] If async stays pending/processing, ensure promise-queue-daemon hits ${this.aiHubUrl} (start-all.bat step 4b).`
        );
      }
    } catch (err) {
      this.log('warn', `[task-monitor] Promise queue probe failed: ${err.message}`);
    }
  }

  _isFreshPromiseErrorRow(row, nowMs) {
    const updatedRaw = row?.updated_at || row?.created_at;
    if (!updatedRaw) return false;
    const ts = Date.parse(String(updatedRaw));
    if (!Number.isFinite(ts)) return false;
    const ageMin = (nowMs - ts) / 60000;
    return ageMin <= Math.max(1, this.promiseErrorFreshWindowMinutes || 60);
  }

  _is401PromiseErrorRow(row) {
    const msg = String(row?.error || '').toLowerCase();
    return msg.includes('401') || msg.includes('unauthorized');
  }

  async applyPromiseQueueMaintenance(result) {
    this.state.promiseQueue = this._safeObject(this.state.promiseQueue, {
      knownErrorIds: {},
      lastMaintenanceAt: null,
    });
    this.state.promiseQueue.knownErrorIds = this._safeObject(this.state.promiseQueue.knownErrorIds, {});
    const rows = Array.isArray(result?.errors?.rows) ? result.errors.rows : [];
    const nowMs = Date.now();
    let fresh = 0;
    let old401 = 0;
    let newThisRun = 0;
    let staleCandidates = 0;
    let staleHandled = 0;
    const staleDays = Math.max(0, this.promiseErrorMaintenanceDays || 0);
    const staleCutoff = staleDays > 0 ? nowMs - staleDays * 24 * 60 * 60 * 1000 : 0;
    const archived = [];
    for (const row of rows) {
      const pid = String(row?.promiseId ?? row?.id ?? '').trim();
      if (!pid) continue;
      const isFresh = this._isFreshPromiseErrorRow(row, nowMs);
      if (isFresh) fresh++;
      if (!isFresh && this._is401PromiseErrorRow(row)) old401++;
      if (isFresh && !this.state.promiseQueue.knownErrorIds[pid]) {
        newThisRun++;
      }
      this.state.promiseQueue.knownErrorIds[pid] = new Date().toISOString();
      const updatedRaw = row?.updated_at || row?.created_at;
      const rowTs = Date.parse(String(updatedRaw || ''));
      if (staleCutoff > 0 && Number.isFinite(rowTs) && rowTs < staleCutoff) {
        staleCandidates++;
        if (this.promiseErrorMaintenanceAction === 'archive' || this.promiseErrorMaintenanceAction === 'delete') {
          archived.push(row);
        }
      }
    }
    if (archived.length > 0 && this.promiseErrorMaintenanceAction === 'archive') {
      const dir = path.join(path.dirname(this.stateFile), 'monitor-artifacts');
      fs.mkdirSync(dir, { recursive: true });
      const f = path.join(dir, `promise-errors-archive-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(f, JSON.stringify({ archivedAt: new Date().toISOString(), items: archived }, null, 2));
      staleHandled = archived.length;
      this.log('info', `[task-monitor] Archived ${archived.length} stale promise error row(s): ${f}`);
    }
    if (archived.length > 0 && this.promiseErrorMaintenanceAction === 'delete') {
      for (const row of archived) {
        const pid = String(row?.promiseId ?? row?.id ?? '').trim();
        if (!pid) continue;
        try {
          const r = await fetch(`${this.aiHubUrl}/promise/${encodeURIComponent(pid)}`, {
            method: 'DELETE',
            signal: AbortSignal.timeout(8000),
          });
          if (r.ok) staleHandled += 1;
        } catch {
          // best effort; keep monitor stable
        }
      }
      this.log('warn', `[task-monitor] Deleted ${staleHandled}/${archived.length} stale promise error row(s)`);
    }
    this.runMetrics.promiseErrors = {
      newThisRun,
      fresh,
      old401,
      staleCandidates,
      staleHandled,
    };
    this.state.promiseQueue.lastMaintenanceAt = new Date().toISOString();
    this.saveState();
    if (old401 > 0 || newThisRun > 0) {
      this.log(
        'warn',
        `[task-monitor] Promise errors: fresh=${fresh}, old401=${old401}, newThisRun=${newThisRun}`
      );
    }
  }

  writeRunArtifact(summary = {}) {
    const dir = path.join(path.dirname(this.stateFile), 'monitor-artifacts');
    fs.mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const finalStage = summary.finalStage || this.state.status || 'unknown';
    const rootCauseClass = summary.rootCauseClass || this.errorLog[0]?.type || 'none';
    const sessionId = summary.sessionId || this.state.sessionId || null;
    const nextAction =
      summary.nextAction ||
      (finalStage === 'completed' ? 'none' : 'inspect latest failure and retry with resume policy');
    const payload = {
      generatedAt: new Date().toISOString(),
      mode: summary.mode || 'run',
      finalStage,
      sessionId,
      rootCauseClass,
      nextAction,
      promiseErrors: this.runMetrics.promiseErrors,
    };
    const jsonPath = path.join(dir, `monitor-run-${ts}.json`);
    const mdPath = path.join(dir, `monitor-run-${ts}.md`);
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
    const md = [
      '# Monitor Run Artifact',
      '',
      `- final stage: ${payload.finalStage}`,
      `- sessionId: ${payload.sessionId || 'n/a'}`,
      `- root cause class: ${payload.rootCauseClass}`,
      `- next action: ${payload.nextAction}`,
      `- promise errors: fresh=${payload.promiseErrors.fresh}, old401=${payload.promiseErrors.old401}, newThisRun=${payload.promiseErrors.newThisRun}`,
      '',
    ].join('\n');
    fs.writeFileSync(mdPath, md);
    this.log('info', `[task-monitor] Run artifact written: ${jsonPath}`);
    return { jsonPath, mdPath };
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