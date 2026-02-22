/**
 * @a2a/api-client - HTTP client for A2A server with async protocol support
 * Protocol: Promise/Polling based async communication
 * @module @a2a/api-client
 */

const fetch = require('node-fetch');

class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * PromisePoller - manages polling for request results
 */
class PromisePoller {
  constructor(apiClient, options = {}) {
    this.api = apiClient;
    this.interval = options.interval || 5000; // 5 seconds default
    this.maxAttempts = options.maxAttempts || 720; // 1 hour max (720 * 5s)
    this.activePollers = new Map(); // promiseId -> { timerId, callbacks, attempts }
  }

  /**
   * Start polling for a promiseId
   * @param {string} promiseId 
   * @param {Object} callbacks - { onComplete, onError, onStatus }
   */
  start(promiseId, callbacks) {
    if (this.activePollers.has(promiseId)) {
      return; // Already polling
    }

    const pollState = {
      timerId: null,
      callbacks,
      attempts: 0,
    };

    this.activePollers.set(promiseId, pollState);
    this._poll(promiseId);
  }

  async _poll(promiseId) {
    const pollState = this.activePollers.get(promiseId);
    if (!pollState) return;

    pollState.attempts++;

    try {
      const status = await this.api.getRequestStatus(promiseId);

      if (pollState.callbacks.onStatus) {
        pollState.callbacks.onStatus(status);
      }

      if (status.status === 'completed') {
        const result = await this.api.getRequestResult(promiseId);
        if (pollState.callbacks.onComplete) {
          pollState.callbacks.onComplete(result);
        }
        this.stop(promiseId);
      } else if (status.status === 'failed') {
        const result = await this.api.getRequestResult(promiseId);
        if (pollState.callbacks.onError) {
          pollState.callbacks.onError(result.error || { message: 'Request failed' });
        }
        this.stop(promiseId);
      } else if (status.status === 'cancelled') {
        if (pollState.callbacks.onError) {
          pollState.callbacks.onError({ message: 'Request was cancelled' });
        }
        this.stop(promiseId);
      } else if (pollState.attempts >= this.maxAttempts) {
        if (pollState.callbacks.onError) {
          pollState.callbacks.onError({ message: 'Polling timeout exceeded' });
        }
        this.stop(promiseId);
      } else {
        // Continue polling
        pollState.timerId = setTimeout(() => this._poll(promiseId), this.interval);
      }
    } catch (error) {
      if (pollState.callbacks.onError) {
        pollState.callbacks.onError({ message: error.message });
      }
      this.stop(promiseId);
    }
  }

  /**
   * Stop polling for a promiseId
   * @param {string} promiseId 
   */
  stop(promiseId) {
    const pollState = this.activePollers.get(promiseId);
    if (pollState) {
      if (pollState.timerId) {
        clearTimeout(pollState.timerId);
      }
      this.activePollers.delete(promiseId);
    }
  }

  /**
   * Stop all active pollers
   */
  stopAll() {
    for (const promiseId of this.activePollers.keys()) {
      this.stop(promiseId);
    }
  }

  /**
   * Get active poller count
   */
  getActiveCount() {
    return this.activePollers.size;
  }
}

class ApiClient {
  constructor(config) {
    this.serverUrl = (config.serverUrl || 'http://localhost:3000/api/v1').replace(/\/?$/, '');
    this.token = config.token;
    this.clientId = config.clientId;
    this.timeout = config.timeout || 30000;
    this.poller = new PromisePoller(this, config.polling || {});
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

  // ============================================
  // Session Management
  // ============================================

  /**
   * Create a new session
   * @param {string} projectId 
   * @param {string} [title] 
   */
  async createSession(projectId, title) {
    const res = await this.request('POST', '/sessions', { projectId, title });
    return res.data;
  }

  /**
   * Get session by ID with messages
   * @param {string} sessionId 
   */
  async getSession(sessionId) {
    const res = await this.request('GET', `/sessions/${sessionId}`);
    return res.data;
  }

  /**
   * List sessions for a project
   * @param {string} projectId 
   * @param {Object} [options] 
   */
  async listSessions(projectId, options = {}) {
    const params = new URLSearchParams({ projectId });
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', String(options.limit));
    if (options.offset) params.append('offset', String(options.offset));
    
    const res = await this.request('GET', `/sessions?${params}`);
    return res.data;
  }

  /**
   * Update session
   * @param {string} sessionId 
   * @param {Object} data 
   */
  async updateSession(sessionId, data) {
    const res = await this.request('PATCH', `/sessions/${sessionId}`, data);
    return res.data;
  }

  /**
   * Delete session
   * @param {string} sessionId 
   */
  async deleteSession(sessionId) {
    const res = await this.request('DELETE', `/sessions/${sessionId}`);
    return res.data;
  }

  // ============================================
  // Messages
  // ============================================

  /**
   * Get messages for a session
   * @param {string} sessionId 
   * @param {Object} [options] 
   */
  async getMessages(sessionId, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', String(options.limit));
    if (options.offset) params.append('offset', String(options.offset));
    
    const query = params.toString() ? `?${params}` : '';
    const res = await this.request('GET', `/sessions/${sessionId}/messages${query}`);
    return res.data;
  }

  /**
   * Add a message to a session
   * @param {string} sessionId 
   * @param {Object} message 
   */
  async addMessage(sessionId, message) {
    const res = await this.request('POST', `/sessions/${sessionId}/messages`, message);
    return res.data;
  }

  // ============================================
  // Async Request/Promise API
  // ============================================

  /**
   * Create a new async request
   * @param {Object} data - { sessionId?, context, message?, codeBlocks?, priority? }
   * @returns {Promise<{promiseId: string, requestId: string, status: string}>}
   */
  async createRequest(data) {
    const res = await this.request('POST', '/requests', data);
    return res.data;
  }

  /**
   * Get request status by promiseId
   * @param {string} promiseId 
   */
  async getRequestStatus(promiseId) {
    const res = await this.request('GET', `/requests/${promiseId}/status`);
    return res.data;
  }

  /**
   * Get request result by promiseId
   * @param {string} promiseId 
   */
  async getRequestResult(promiseId) {
    const res = await this.request('GET', `/requests/${promiseId}/result`);
    return res.data;
  }

  /**
   * Cancel a pending request
   * @param {string} promiseId 
   */
  async cancelRequest(promiseId) {
    const res = await this.request('DELETE', `/requests/${promiseId}`);
    return res.data;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const res = await this.request('GET', '/requests/queue/stats');
    return res.data;
  }

  // ============================================
  // High-level convenience methods
  // ============================================

  /**
   * Start a new session with package.json and composer.json
   * @param {Object} opts - { projectPath, task, packageJson, composerJson }
   * @param {Object} [callbacks] - { onStatus, onComplete, onError }
   * @returns {Promise<Object>} - { outcome, frameworks, graph, questions, missing }
   */
  async startSession(opts, callbacks = {}) {
    const { projectPath, task, packageJson, composerJson } = opts;
    
    const codeBlocks = [];
    if (packageJson) {
      codeBlocks.push({ path: 'package.json', content: packageJson });
    }
    if (composerJson) {
      codeBlocks.push({ path: 'composer.json', content: composerJson });
    }

    const { promiseId } = await this.createRequest({
      context: {
        project_path: projectPath,
        new_task: task ? [task] : undefined,
      },
      codeBlocks,
    });

    return new Promise((resolve, reject) => {
      this.poller.start(promiseId, {
        onStatus: callbacks.onStatus,
        onComplete: (result) => {
          if (callbacks.onComplete) callbacks.onComplete(result);
          resolve(result);
        },
        onError: (error) => {
          if (callbacks.onError) callbacks.onError(error);
          reject(new ApiError(error.message || 'Request failed', 0, error));
        },
      });
    });
  }

  /**
   * Send code blocks with existing graph (iteration)
   * @param {Object} opts - { projectPath, graph, codeBlocks }
   * @param {Object} [callbacks] - { onStatus, onComplete, onError }
   * @returns {Promise<Object>} - { outcome, graph, questions, missing, activated_neuron_ids }
   */
  async sendCodeBlocks(opts, callbacks = {}) {
    const { projectPath, graph, codeBlocks } = opts;

    const { promiseId } = await this.createRequest({
      context: {
        project_path: projectPath,
        graph,
      },
      codeBlocks,
    });

    return new Promise((resolve, reject) => {
      this.poller.start(promiseId, {
        onStatus: callbacks.onStatus,
        onComplete: (result) => {
          if (callbacks.onComplete) callbacks.onComplete(result);
          resolve(result);
        },
        onError: (error) => {
          if (callbacks.onError) callbacks.onError(error);
          reject(new ApiError(error.message || 'Request failed', 0, error));
        },
      });
    });
  }

  /**
   * Run full session cycle with RAG integration
   * @param {Object} opts - { projectPath, task, rag, maxIterations }
   * @param {Object} [callbacks] - { onIteration, onStatus, onComplete, onError }
   * @returns {Promise<Object>} - final result
   */
  async runSessionWithRAG(opts, callbacks = {}) {
    const { projectPath, task, rag, maxIterations = 10 } = opts;
    
    // Read package.json and composer.json
    const fs = require('fs');
    const path = require('path');
    
    let packageJson = null;
    let composerJson = null;
    
    try {
      packageJson = fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8');
    } catch (e) { /* ignore */ }
    
    try {
      composerJson = fs.readFileSync(path.join(projectPath, 'composer.json'), 'utf-8');
    } catch (e) { /* ignore */ }

    // Start session
    let result = await this.startSession({
      projectPath,
      task,
      packageJson,
      composerJson,
    }, { onStatus: callbacks.onStatus });

    let iteration = 1;
    let graph = result.graph || { entities: [], relations: [] };

    // Iterate until completed or max iterations
    while (result.outcome === 'graph_incomplete' && iteration < maxIterations) {
      if (callbacks.onIteration) {
        callbacks.onIteration(iteration, result);
      }

      // Use RAG to find files based on questions
      const codeBlocks = [];
      
      if (rag && result.questions && result.questions.length > 0) {
        for (const question of result.questions) {
          const searchResults = await rag.searcher.search(question, { limit: 3 });
          
          for (const searchResult of searchResults) {
            const filePath = searchResult.chunk.filePath;
            const fullPath = path.join(projectPath, filePath);
            
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              codeBlocks.push({ path: filePath, content });
            } catch (e) {
              // File not found, skip
            }
          }
        }
      }

      if (codeBlocks.length === 0) {
        // No files found, break
        break;
      }

      // Send found files
      result = await this.sendCodeBlocks({
        projectPath,
        graph,
        codeBlocks,
      }, { onStatus: callbacks.onStatus });

      graph = result.graph || graph;
      iteration++;
    }

    if (callbacks.onComplete) {
      callbacks.onComplete(result);
    }

    return result;
  }

  /**
   * Send a message and wait for result (with polling)
   * @param {string} sessionId 
   * @param {string} message 
   * @param {Object} [context] 
   * @param {Object} [callbacks] - { onStatus, onComplete, onError }
   */
  async sendMessage(sessionId, message, context = {}, callbacks = {}) {
    // Create request
    const { promiseId } = await this.createRequest({
      sessionId,
      message,
      context: {
        version: '1.0',
        session_id: sessionId,
        ...context,
      },
    });

    // Return promise that resolves when complete
    return new Promise((resolve, reject) => {
      this.poller.start(promiseId, {
        onStatus: callbacks.onStatus,
        onComplete: (result) => {
          if (callbacks.onComplete) callbacks.onComplete(result);
          resolve(result);
        },
        onError: (error) => {
          if (callbacks.onError) callbacks.onError(error);
          reject(new ApiError(error.message || 'Request failed', 0, error));
        },
      });
    });
  }

  /**
   * Legacy invoke method - creates request and returns promiseId
   * @param {Object} opts 
   */
  async invoke(opts) {
    const res = await this.request('POST', '/invoke', {
      context: opts.context,
      message: opts.markdown,
      code_blocks: opts.files,
      sessionId: opts.sessionId,
    });
    return res.data;
  }

  /**
   * Wait for request result with polling
   * @param {string} promiseId 
   * @param {Object} [callbacks] 
   */
  async waitForResult(promiseId, callbacks = {}) {
    return new Promise((resolve, reject) => {
      this.poller.start(promiseId, {
        onStatus: callbacks.onStatus,
        onComplete: (result) => {
          if (callbacks.onComplete) callbacks.onComplete(result);
          resolve(result);
        },
        onError: (error) => {
          if (callbacks.onError) callbacks.onError(error);
          reject(new ApiError(error.message || 'Request failed', 0, error));
        },
      });
    });
  }
}

module.exports = { ApiClient, ApiError, PromisePoller };
