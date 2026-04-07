import axios from 'axios';

class TaskMonitorValidation {
  validateActionKeyShape(obj, type) {
    if (!obj || typeof obj !== 'object') return false;
    const keys = Object.keys(obj);
    if (type === 'execute') {
      // Align with web DTO / server: message, form, attachments are not a second tool key.
      const aux = new Set(['message', 'completed', 'llmMessage', 'attachments', 'form']);
      const actionKeys = keys.filter((k) => !aux.has(k));
      if (actionKeys.length === 0) {
        // e.g. natural-language completion: { message } only — valid surface
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

  validateSessionResponse(response) {
    if (!response) return { valid: false, error: 'No response' };
    if (response.execute && !this.validateActionKeyShape(response.execute, 'execute')) {
      return { valid: false, error: 'Invalid execute action-key shape' };
    }
    if (response.result && !this.validateActionKeyShape(response.result, 'result')) {
      return { valid: false, error: 'Invalid result action-key shape' };
    }
    return { valid: true };
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

    // Use environment variables for service URLs or fall back to defaults
    const compat_llmUrl = process.env.LOCAL_LLM_UPSTREAM_URL || 'http://localhost:11435';
    const aiHubUrl = process.env.AI_HUB_URL || 'http://localhost:11434';

    const healthTimeout = parseInt(process.env.TASK_MONITOR_HEALTH_TIMEOUT_MS || '15000', 10);

    try {
      // Check Client API
      const clientRes = await axios.get(`${this.baseUrl}/projects`, { timeout: healthTimeout });
      results.clientApi = clientRes.status === 200 && Array.isArray(clientRes.data.projects);
      results.details.clientApi = results.clientApi ? 'OK' : 'Failed';
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