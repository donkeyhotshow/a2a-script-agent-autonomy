import axios from 'axios';
import { randomUUID } from 'crypto';

const A2A_TRACE_HEADER = 'X-A2A-Trace-Id';
import { ServerUnavailableError } from './errors.js';
import {
  buildGetSessionValidateOptions,
  isTaskMonitorSessionValidationDisabled,
  validateClientSession,
  validatePartialSessionEnvelope,
} from './task-monitor-validation.js';

class TaskMonitorApi {
  _warnSessionShape(message) {
    if (typeof this.log === 'function') {
      this.log('warn', message);
    } else {
      console.warn(message);
    }
  }

  _validateGetSessionBody(sessionId, data, includeContext) {
    if (isTaskMonitorSessionValidationDisabled() || !data) return;
    const v = validateClientSession(data, buildGetSessionValidateOptions(data, includeContext));
    if (!v.valid) {
      this._warnSessionShape(`[session-shape] GET /sessions/${sessionId}: ${v.errors.join('; ')}`);
    }
  }

  _validateEnvelope(label, data) {
    if (isTaskMonitorSessionValidationDisabled() || !data) return;
    const v = validatePartialSessionEnvelope(data);
    if (!v.valid) {
      this._warnSessionShape(`[session-shape] ${label}: ${v.errors.join('; ')}`);
    }
  }

  async getProjects() {
    try {
      const response = await axios.get(`${this.baseUrl}/projects`);
      return response.data.projects;
    } catch (error) {
      this.logError('getProjects', error);
      return [];
    }
  }

  async createSession(taskText) {
    try {
      // Auto-fetch projectId if not configured
      let projectId = this.projectId;
      if (!projectId) {
        const projects = await this.getProjects();
        if (projects.length > 0) {
          projectId = projects[0].id;
          console.log(`Auto-selected project: ${projects[0].name} (${projectId})`);
        } else {
          this.logError('createSession', new Error('No projects available'));
          return null;
        }
      }

      const response = await axios.post(`${this.baseUrl}/sessions`, {
        projectId: projectId,
        mode: 'agent',
        task: taskText
      });
      // The response format is { success: true, session: { ... } }
      const sess = response.data.session || response.data;
      if (sess && !isTaskMonitorSessionValidationDisabled()) {
        const v = validateClientSession(sess, {
          requireId: true,
          checkContextResult: false,
          checkMessages: false,
          checkAsyncPending: 'asyncPending' in sess,
        });
        if (!v.valid) {
          this._warnSessionShape(`[session-shape] POST /sessions: ${v.errors.join('; ')}`);
        }
      }
      return sess;
    } catch (error) {
      this.logError('createSession', error);
      return null;
    }
  }

  async sendNext(sessionId, payload = {}) {
    try {
      const traceId = randomUUID();
      const response = await axios.post(`${this.baseUrl}/sessions/${sessionId}/next`, payload, {
        headers: { [A2A_TRACE_HEADER]: traceId },
 });
      if (Array.isArray(this.runMetrics?.a2aTraceIds)) {
        this.runMetrics.a2aTraceIds.push(traceId);
      }
      if (typeof this.log === 'function') {
        this.log('info', `[task-monitor] /next trace_id=${traceId} sessionId=${sessionId}`);
      }
      this._validateEnvelope(`POST /next (${sessionId})`, response.data);
      // Handle different response formats
      if (response.data && response.data.execute) {
        return response.data;
      }
      return response.data;
    } catch (error) {
      if (this.isServerUnavailableError(error)) {
        this.logError('sendNext', error, this.state.currentTask);
        throw new ServerUnavailableError(error.response?.data?.error);
      }
      this.logError('sendNext', error, this.state.currentTask);
      return null;
    }
  }

  async pollAsync(sessionId) {
    try {
      const response = await axios.get(`${this.baseUrl}/sessions/${sessionId}/async`, {
        params: { includeContext: '1' },
      });
      this._validateEnvelope(`GET /async (${sessionId})`, response.data);
      return response.data;
    } catch (error) {
      if (this.isServerUnavailableError(error)) {
        this.logError('pollAsync', error, this.state.currentTask);
        throw new ServerUnavailableError(error.response?.data?.error);
      }
      // Don't log every poll error to avoid spam, but track it for analysis
      const classification = this.errorClassifier.classify(error);
      this.errorLog.push({
        timestamp: new Date().toISOString(),
        context: 'pollAsync',
        task: this.state.currentTask,
        type: classification.type,
        subtype: classification.subtype,
        message: classification.message,
        sessionId: sessionId,
        severity: classification.severity
      });
      // If critical error, log it even in poll
      if (classification.severity === 'critical') {
        this.logError('pollAsync', error, this.state.currentTask, { sessionId, phase: 'polling' });
      }
      return null;
    }
  }

  async getSession(sessionId, options = {}) {
    try {
      if (!sessionId) {
        this.log('warn', 'getSession called with empty sessionId');
        return null;
      }
      const q = options.includeContext ? '?includeContext=1' : '';
      const response = await axios.get(`${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}${q}`);
      if (!response.data) {
        this.log('warn', `Session ${sessionId} returned no data`);
        return null;
      }
      this._validateGetSessionBody(sessionId, response.data, options.includeContext);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        this.log('warn', `Session ${sessionId} not found`);
      } else {
        this.logError('getSession', error, this.state.currentTask);
      }
      return null;
    }
  }

  async inspectPromise(promiseId) {
    if (!promiseId) return null;
    try {
      const [statusRes, resultRes] = await Promise.allSettled([
        axios.get(`${this.serverBaseUrl}/requests/${promiseId}`),
        axios.get(`${this.serverBaseUrl}/requests/${promiseId}/result`),
      ]);
      const statusData = statusRes.status === 'fulfilled' ? statusRes.value.data : null;
      const resultData = resultRes.status === 'fulfilled' ? resultRes.value.data : null;
      return {
        status: statusData?.status || resultData?.status || 'unknown',
        action: statusData?.context?.execution?.action || resultData?.context?.execution?.action,
      };
    } catch (error) {
      console.error(`[promise ${promiseId}] inspection failed:`, error.message);
      return null;
    }
  }

  async getCurrentPromiseId(sessionId) {
    try {
      const sessionData = await this.getSession(sessionId);
      return sessionData?.context?.result?.promiseId ||
            sessionData?.execute?.promiseId ||
            sessionData?.result?.promiseId || null;
    } catch (error) {
      console.error(`Error getting promise ID for session ${sessionId}:`, error.message);
      return null;
    }
  }

}

export { TaskMonitorApi };