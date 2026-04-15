import axios from 'axios';

/**
 * Try Client API on alternate loopback hosts (IPv4 / name / IPv6) when one bind family fails.
 * @param {string} baseUrl e.g. http://127.0.0.1:5173/api/a2a
 * @returns {string[]}
 */
export function loopbackClientApiBaseUrlCandidates(baseUrl) {
  const trimmed = String(baseUrl || '').replace(/\/$/, '');
  try {
    const u = new URL(trimmed);
    const host = u.hostname;
    const loopbacks = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
    if (!loopbacks.has(host)) return [trimmed];
    const order = ['127.0.0.1', 'localhost', '[::1]'];
    const seen = new Set();
    const variants = [];
    for (const h of order) {
      const c = new URL(trimmed);
      c.hostname = h;
      const s = c.toString().replace(/\/$/, '');
      if (!seen.has(s)) {
        seen.add(s);
        variants.push(s);
      }
    }
    const rest = variants.filter((x) => x !== trimmed);
    return [trimmed, ...rest];
  } catch {
    return [trimmed];
  }
}

/**
 * Action-key shape for Client API session payloads (projected execute / result).
 * @param {object} obj
 * @param {'execute'|'result'} type
 */
export function validateActionKeyShape(obj, type) {
  if (!obj || typeof obj !== 'object') return false;
  const keys = Object.keys(obj);
  if (type === 'execute') {
    const aux = new Set(['message', 'completed', 'llmMessage', 'attachments', 'form']);
    const actionKeys = keys.filter((k) => !aux.has(k));
    if (actionKeys.length === 0) {
      return keys.length > 0;
    }
    if (actionKeys.length !== 1) return false;
    return actionKeys[0] !== 'result';
  }
  const auxResult = new Set(['message', 'completed', 'llmMessage']);
  const actionKeys = keys.filter((k) => !auxResult.has(k));
  if (actionKeys.length === 0) return keys.length > 0;
  if (actionKeys.length !== 1) return false;
  return actionKeys[0] !== 'execute';
}

/**
 * Validate a GET /api/a2a/sessions/:id body (Vite storage-mode: top-level session DTO).
 * @param {object|null|undefined} sessionData
 * @param {{ requireId?: boolean, checkMessages?: boolean, checkAsyncPending?: boolean, checkContextResult?: boolean }} [options]
 * @returns {{ valid: boolean, error?: string, errors: string[] }}
 */
/** Default: validation on. Set `TASK_MONITOR_VALIDATE_SESSION=0` to skip shape warnings on Client API traffic. */
export function isTaskMonitorSessionValidationDisabled() {
  const v = process.env.TASK_MONITOR_VALIDATE_SESSION;
  if (v == null || String(v).trim() === '') return false;
  return /^(0|false|no)$/i.test(String(v).trim());
}

/**
 * Options for {@link validateClientSession} after GET /sessions/:id.
 * @param {object} data
 * @param {boolean} includeContext
 */
export function buildGetSessionValidateOptions(data, includeContext) {
  return {
    requireId: true,
    checkContextResult: includeContext === true,
    checkMessages:
      includeContext === true &&
      data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      'messages' in data &&
      data.messages != null,
    checkAsyncPending: !!(data && typeof data === 'object' && !Array.isArray(data) && 'asyncPending' in data),
  };
}

/**
 * Validate top-level `execute` / `result` only (e.g. /next ack, /async envelope).
 * @param {object|null|undefined} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePartialSessionEnvelope(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: true, errors: [] };
  }
  if (data.execute != null) {
    if (typeof data.execute !== 'object' || Array.isArray(data.execute)) {
      errors.push('execute must be a plain object when present');
    } else if (!validateActionKeyShape(data.execute, 'execute')) {
      errors.push('Invalid execute action-key shape');
    }
  }
  if (data.result != null) {
    if (typeof data.result !== 'object' || Array.isArray(data.result)) {
      errors.push('result must be a plain object when present');
    } else if (!validateActionKeyShape(data.result, 'result')) {
      errors.push('Invalid result action-key shape');
    }
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

export function validateClientSession(sessionData, options = {}) {
  const errors = [];
  const requireId = options.requireId !== false;
  const checkMessages = options.checkMessages === true;
  const checkAsyncPending = options.checkAsyncPending === true;
  const checkContextResult = options.checkContextResult !== false;

  if (!sessionData || typeof sessionData !== 'object' || Array.isArray(sessionData)) {
    const msg = 'Session must be a non-null plain object';
    return { valid: false, error: msg, errors: [msg] };
  }

  const sid = sessionData.id ?? sessionData.sessionId;
  if (requireId && (typeof sid !== 'string' || !sid.trim())) {
    errors.push('Missing session id (expected string id or sessionId)');
  }

  if (sessionData.execute != null) {
    if (typeof sessionData.execute !== 'object' || Array.isArray(sessionData.execute)) {
      errors.push('execute must be a plain object when present');
    } else if (!validateActionKeyShape(sessionData.execute, 'execute')) {
      errors.push('Invalid execute action-key shape');
    }
  }

  if (sessionData.result != null) {
    if (typeof sessionData.result !== 'object' || Array.isArray(sessionData.result)) {
      errors.push('result must be a plain object when present');
    } else if (!validateActionKeyShape(sessionData.result, 'result')) {
      errors.push('Invalid result action-key shape');
    }
  }

  if (checkContextResult && sessionData.context != null && typeof sessionData.context === 'object') {
    const ctxRes = sessionData.context.result;
    if (ctxRes != null && typeof ctxRes === 'object' && !Array.isArray(ctxRes)) {
      if (!validateActionKeyShape(ctxRes, 'result')) {
        errors.push('Invalid context.result action-key shape');
      }
    }
  }

  if (checkMessages && 'messages' in sessionData && sessionData.messages != null) {
    if (!Array.isArray(sessionData.messages)) {
      errors.push('messages must be an array when present');
    }
  }

  if (checkAsyncPending && 'asyncPending' in sessionData && typeof sessionData.asyncPending !== 'boolean') {
    errors.push('asyncPending must be boolean when present');
  }

  if (errors.length === 0) {
    return { valid: true, errors: [] };
  }
  return { valid: false, error: errors[0], errors };
}

class TaskMonitorValidation {
  validateActionKeyShape(obj, type) {
    return validateActionKeyShape(obj, type);
  }

  validateSessionResponse(response) {
    if (!response) return { valid: false, error: 'No response' };
    const r = validatePartialSessionEnvelope(response);
    if (!r.valid) return { valid: false, error: r.errors[0] };
    return { valid: true };
  }

  /**
   * Full client session DTO check (id, execute/result, optional context.result).
   * Same as exported {@link validateClientSession}.
   */
  validateClientSession(sessionData, options) {
    return validateClientSession(sessionData, options);
  }

  validateReportState() {
    const hasProcessedTasks = this.state.processedTasks && this.state.processedTasks.length > 0;
    const hasRecentActivity = this.state.lastChecked;
    return { hasData: hasProcessedTasks, recent: !!hasRecentActivity };
  }

  isServerUnavailableError(error) {
    return (
      error &&
      error.response &&
      error.response.status === 503 &&
      typeof error.response.data?.error === 'string' &&
      error.response.data.error.toLowerCase().includes('a2a server unavailable')
    );
  }

  async healthCheck() {
    const results = {
      clientApi: false,
      a2aServer: false,
      compat_llm: false,
      aiHub: false,
      allOk: false,
      details: {}

    };

    // Proxy-first stack: compat check uses proxy tags endpoint unless explicitly overridden.
    const aiHubUrl = process.env.AI_HUB_URL || 'http://localhost:11434';
    const compat_llmUrl = process.env.LOCAL_LLM_UPSTREAM_URL || aiHubUrl;

    const healthTimeout = parseInt(process.env.TASK_MONITOR_HEALTH_TIMEOUT_MS || '15000', 10);

    try {
      const bases = loopbackClientApiBaseUrlCandidates(this.baseUrl);
      let lastMsg = '';
      for (const base of bases) {
        try {
          const clientRes = await axios.get(`${base}/projects`, { timeout: healthTimeout });
          if (clientRes.status === 200 && Array.isArray(clientRes.data.projects)) {
            results.clientApi = true;
            results.details.clientApi = base === this.baseUrl.replace(/\/$/, '') ? 'OK' : `OK (${base})`;
            lastMsg = '';
            break;
          }
          lastMsg = 'Unexpected response shape';
        } catch (error) {
          lastMsg = error.message;
        }
      }
      if (!results.clientApi) {
        results.details.clientApi = lastMsg ? `Error: ${lastMsg}` : 'Failed';
      }
    } catch (error) {
      results.details.clientApi = `Error: ${error.message}`;
    }

    try {
      // Check A2A Server
      const serverRes = await axios.get(`${this.serverBaseUrl}/health`, { timeout: healthTimeout });
      results.a2aServer = serverRes.status === 200;
      results.details.a2aServer = results.a2aServer ? 'OK' : 'Failed';
    } catch (error) {
      results.details.a2aServer = `Error: ${error.message}`;
    }

    try {
      // Check Local LLM upstream
      const compat_llmRes = await axios.get(`${compat_llmUrl}/api/tags`, { timeout: healthTimeout });
      results.compat_llm = compat_llmRes.status === 200 && Array.isArray(compat_llmRes.data.models);
      results.details.compat_llm = results.compat_llm ? 'OK' : 'Failed';
    } catch (error) {
      results.details.compat_llm = `Error: ${error.message}`;
    }

    try {
      // Check AI Hub
      const aiHubRes = await axios.get(`${aiHubUrl}/health`, { timeout: healthTimeout });
      results.aiHub = aiHubRes.status === 200;
      results.details.aiHub = results.aiHub ? 'OK' : 'Failed';
    } catch (error) {
      results.details.aiHub = `Error: ${error.message}`;
    }

    results.allOk = results.clientApi && results.a2aServer && results.compat_llm && results.aiHub;

    if (typeof this.scanApplicationLogs === 'function') {
      try {
        const logScan = this.scanApplicationLogs();
        results.details.logScan = {
          filesScanned: logScan.filesScanned,
          hitCount: logScan.hitCount,
          skipped: logScan.skipped || false,
        };
        if (logScan.hitCount > 0 && typeof this.reportLogScanHits === 'function') {
          this.reportLogScanHits(logScan.hits);
        }
      } catch (e) {
        results.details.logScan = { error: e?.message || String(e) };
      }
    }

    return results;
  }
}

export { TaskMonitorValidation };