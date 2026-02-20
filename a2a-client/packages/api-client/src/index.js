/**
 * @a2a/api-client - HTTP client for A2A server
 * Protocol per requirements.md: context block always present
 * @module @a2a/api-client
 */

const fetch = require('node-fetch');
const {
  buildNewTaskContext,
  buildContinueContext,
  buildConfirmContext,
  buildFileResponseContext,
} = require('./protocol.js');

class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  constructor(config) {
    this.serverUrl = (config.serverUrl || 'http://localhost:3000/api/v1').replace(/\/?$/, '');
    this.token = config.token;
    this.clientId = config.clientId;
    this.timeout = config.timeout || 30000;
  }

  async request(method, path, body = null) {
    const url = `${this.serverUrl}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (this.clientId) headers['X-Client-ID'] = this.clientId;

    const options = { method, headers, timeout: this.timeout };
    if (body) options.body = JSON.stringify(body);

    try {
      const response = await fetch(url, options);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new ApiError(data.error?.message || 'Request failed', response.status, data);
      }
      return data;
    } catch (err) {
      if (err.name === 'AbortError') throw new ApiError('Request timeout', 408);
      throw err;
    }
  }

  /** Send body as per requirements: context block or legacy new_task */
  _sendBody(context, files = []) {
    const body = { context };
    if (files.length) body.files = files.map((f) => ({ path: f.path, content: f.content }));
    return body;
  }

  async createSession(projectId) {
    const res = await this.request('POST', '/sessions', { project_id: projectId });
    return res.data || res;
  }

  /** Adapter: createCard(card) -> createSession + sendMessage. Card needs projectId, userRequest.original */
  async createCard(card) {
    const projectId = card.project?.id || card.projectId;
    if (!projectId) throw new ApiError('projectId required', 400);
    const req = card.userRequest?.original ?? card.request?.raw ?? '';
    const arch = card.architecturalFeatures ?? card.architectural_features;
    return this.createCardByProject(projectId, req, arch);
  }

  async createCardByProject(projectId, userRequest, architecturalFeatures) {
    const session = await this.createSession(projectId);
    const sid = session.session_id;
    const task = Array.isArray(userRequest) ? userRequest : [String(userRequest || '')];
    const msg = await this.sendMessage(sid, task, architecturalFeatures);
    const status = (msg.tasks?.length > 0) ? 'task_created' : 'processing';
    return { ...msg, status, card: { cardId: sid } };
  }

  /** Adapter: reportCommands(sessionId, results) -> continueSession */
  async reportCommands(sessionId, _commandResults) {
    return this.continueSession(sessionId);
  }

  /** Adapter: answerQuestions(sessionId, _answers) -> confirmSession */
  async answerQuestions(sessionId, _answers) {
    return this.confirmSession(sessionId);
  }

  /**
   * Get session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session data
   */
  async getSession(sessionId) {
    const res = await this.request('GET', `/sessions/${sessionId}`);
    return res.data || res;
  }

  /**
   * Send message (new task) to session
   * Per requirements §3.3: context with new_task, architectural_features
   * @param {string} sessionId - Session ID
   * @param {string[]} newTask - Task items [text, hints, ...]
   * @param {string[]} [architecturalFeatures] - Non-standard file layout
   * @returns {Promise<Object>} Response with context
   */
  async sendMessage(sessionId, newTask, architecturalFeatures) {
    const context = buildNewTaskContext(sessionId, newTask, architecturalFeatures);
    const body = { context, new_task: newTask }; // new_task for server compat
    const res = await this.request('POST', `/sessions/${sessionId}/message`, body);
    return res.data || res;
  }

  /**
   * Get session context
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} { context }
   */
  async getSessionContext(sessionId) {
    const res = await this.request('GET', `/sessions/${sessionId}/context`);
    return res.data || res;
  }

  /**
   * Continue session (кнопка "Делаем") - §3.3.4
   */
  async continueSession(sessionId) {
    const context = buildContinueContext(sessionId);
    const res = await this.request('POST', `/sessions/${sessionId}/continue`, { context });
    return res.data || res;
  }

  /**
   * Confirm changes - §3.4.2 verification. Optionally include files for verification.
   * @param {string} sessionId
   * @param {Array<{path:string,content:string}>} [files] - Applied file contents
   */
  async confirmSession(sessionId, files = []) {
    const context = buildConfirmContext(sessionId);
    const body = this._sendBody(context, files);
    const res = await this.request('POST', `/sessions/${sessionId}/confirm`, body);
    return res.data || res;
  }

  /**
   * Send requested files - §7.2
   */
  async sendFiles(sessionId, files) {
    const context = buildFileResponseContext(sessionId);
    const body = this._sendBody(context, files);
    const res = await this.request('POST', `/sessions/${sessionId}/files`, body);
    return res.data || res;
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    await this.request('DELETE', `/sessions/${sessionId}`);
  }

  /**
   * Invoke - send markdown + context + optional code blocks. Server is stateless.
   * @param {Object} opts
   * @param {string} opts.markdown - Markdown content
   * @param {Object} [opts.context] - Side context
   * @param {Array<{path:string,content:string}>} [opts.files] - Attached code blocks
   */
  async invoke({ markdown, context = {}, files = [] }) {
    const res = await this.request('POST', '/invoke', { markdown, context, files });
    return res.data || res;
  }
}

module.exports = { ApiClient, ApiError };
