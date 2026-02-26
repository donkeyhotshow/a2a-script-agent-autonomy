/**
 * SSE Client Manager
 * Real-time event streaming from server with A2A API integration
 */

const SSEClient = {
  eventSource: null,
  sessionId: null,
  promiseId: null,
  handlers: {},
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectDelay: 3000,
  isConnecting: false,
  lastEventId: null,
  _errorNotification: null,
  
  // A2A API configuration
  apiBase: '/api/v1',
  apiClient: null,

  /**
   * Configure API client
   */
  configureApi(apiBase, token = null) {
    this.apiBase = apiBase.replace(/\/?$/, '');
    this.apiClient = {
      baseUrl: this.apiBase,
      token: token,
      
      async request(method, path, body = null) {
        const url = `${this.baseUrl}${path}`;
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);
        
        try {
          const response = await fetch(url, options);
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            const error = new Error(data?.error?.message || 'Request failed');
            error.response = data;
            this.handleApiError(error);
            throw error;
          }
          return data;
        } catch (err) {
          // Re-throw network errors but handle them
          if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
            this.handleApiError({ message: 'Network error. Server may be unreachable.' });
          }
          throw err;
        }
      },

      // Session endpoints
      async createSession(projectId, title) {
        const res = await this.request('POST', '/sessions', { projectId, title });
        return res.data;
      },

      async getSession(sessionId) {
        const res = await this.request('GET', `/sessions/${sessionId}`);
        return res.data;
      },

      async listSessions(projectId) {
        const res = await this.request('GET', `/sessions?projectId=${projectId}`);
        return res.data;
      },

      // Request/Task endpoints
      async createRequest(data) {
        const res = await this.request('POST', '/requests', data);
        return res.data;
      },

      async getRequestStatus(promiseId) {
        const res = await this.request('GET', `/requests/${promiseId}/status`);
        return res.data;
      },

      async getRequestResult(promiseId) {
        const res = await this.request('GET', `/requests/${promiseId}/result`);
        return res.data;
      },

      async cancelRequest(promiseId) {
        const res = await this.request('DELETE', `/requests/${promiseId}`);
        return res.data;
      },

      // Action approval
      async approveAction(sessionId, approved) {
        const res = await this.request('POST', `/sessions/${sessionId}/actions/approve`, { approved });
        return res.data;
      },

      // Send step result
      async sendStepResult(sessionId, stepResult) {
        const res = await this.request('POST', `/sessions/${sessionId}/steps`, stepResult);
        return res.data;
      }
    };
  },

  /**
   * Connect to SSE endpoint
   */
  connect(sessionId, apiBase = '/api/v1') {
    this.sessionId = sessionId;
    
    // Configure API if not already done
    if (!this.apiClient || this.apiBase !== apiBase) {
      this.configureApi(apiBase);
    }
    
    // Close existing connection
    if (this.eventSource) {
      this.disconnect();
    }

    const url = sessionId 
      ? `${apiBase}/sse/${sessionId}`
      : `${apiBase}/sse`;

    console.log('[SSE] Connecting to:', url);
    this.isConnecting = true;
    
    try {
      this.eventSource = new EventSource(url);
      
      this.eventSource.onopen = (event) => {
        console.log('[SSE] Connected!', event);
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emit('connected', { sessionId: this.sessionId });
        this._handleReconnect();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Message:', data);
          this.lastEventId = event.lastEventId;
          this.emit('message', data);
        } catch (e) {
          console.error('[SSE] Failed to parse message:', e);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[SSE] Error:', error);
        this.isConnecting = false;
        this.emit('error', error);
        this._handleDisconnect();
        
        // Try to reconnect if not manually closed
        if (this.eventSource && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[SSE] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.showErrorNotification(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'reconnect');
          setTimeout(() => this.connect(this.sessionId, apiBase), this.reconnectDelay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('[SSE] Max reconnection attempts reached');
          this.emit('maxReconnect', { attempts: this.reconnectAttempts });
          this.showErrorNotification('Connection failed. Please refresh the page.', 'sse');
        }
      };

      // Register event handlers
      this.setupEventHandlers();

    } catch (e) {
      console.error('[SSE] Failed to create EventSource:', e);
      this.isConnecting = false;
    }
  },

  /**
   * Setup named event handlers for A2A protocol
   */
  setupEventHandlers() {
    if (!this.eventSource) return;

    // Connected event - session established
    this.eventSource.addEventListener('connected', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Connected event:', data);
        this.sessionId = data.sessionId || this.sessionId;
        this.promiseId = data.promiseId || this.promiseId;
        this.emit('connected', data);
      } catch (e) {
        console.error('[SSE] Failed to parse connected event:', e);
      }
    });

    // Log event - streaming logs
    this.eventSource.addEventListener('log', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Log:', data);
        this.emit('log', data);
      } catch (e) {
        console.error('[SSE] Failed to parse log event:', e);
      }
    });

    // Progress event - task progress updates
    this.eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Progress:', data);
        this.emit('progress', data);
      } catch (e) {
        console.error('[SSE] Failed to parse progress event:', e);
      }
    });

    // Status event - request status changes
    this.eventSource.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Status:', data);
        this.promiseId = data.promiseId || this.promiseId;
        this.emit('status', data);
      } catch (e) {
        console.error('[SSE] Failed to parse status event:', e);
      }
    });

    // Task response event - A2A protocol response
    this.eventSource.addEventListener('task_response', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Task Response:', data);
        this.emit('task_response', data);
      } catch (e) {
        console.error('[SSE] Failed to parse task_response event:', e);
      }
    });

    // Action proposal event
    this.eventSource.addEventListener('action_proposal', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Action Proposal:', data);
        this.emit('action_proposal', data);
      } catch (e) {
        console.error('[SSE] Failed to parse action_proposal event:', e);
      }
    });

    // Action executing event
    this.eventSource.addEventListener('action_executing', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Action Executing:', data);
        this.emit('action_executing', data);
      } catch (e) {
        console.error('[SSE] Failed to parse action_executing event:', e);
      }
    });

    // Step result event
    this.eventSource.addEventListener('step_result', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Step Result:', data);
        this.emit('step_result', data);
      } catch (e) {
        console.error('[SSE] Failed to parse step_result event:', e);
      }
    });

    // Complete event - request completed
    this.eventSource.addEventListener('complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Complete:', data);
        this.emit('complete', data);
      } catch (e) {
        console.error('[SSE] Failed to parse complete event:', e);
      }
    });

    // Error event
    this.eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Error event:', data);
        this.emit('error', data);
      } catch (e) {
        console.error('[SSE] Failed to parse error event:', e);
      }
    });

    // Session events
    this.eventSource.addEventListener('session_update', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Session Update:', data);
        this.emit('session_update', data);
      } catch (e) {
        console.error('[SSE] Failed to parse session_update event:', e);
      }
    });

    // Node events (for graph visualization)
    this.eventSource.addEventListener('node_added', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Node Added:', data);
        this.emit('node_added', data);
      } catch (e) {
        console.error('[SSE] Failed to parse node_added event:', e);
      }
    });

    this.eventSource.addEventListener('node_updated', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Node Updated:', data);
        this.emit('node_updated', data);
      } catch (e) {
        console.error('[SSE] Failed to parse node_updated event:', e);
      }
    });

    this.eventSource.addEventListener('edge_added', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Edge Added:', data);
        this.emit('edge_added', data);
      } catch (e) {
        console.error('[SSE] Failed to parse edge_added event:', e);
      }
    });
  },

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  },

  /**
   * Unregister event handler
   */
  off(event, handler) {
    if (!this.handlers[event]) return;
    const index = this.handlers[event].indexOf(handler);
    if (index > -1) {
      this.handlers[event].splice(index, 1);
    }
  },

  /**
   * Emit event to handlers
   */
  emit(event, data) {
    if (!this.handlers[event]) return;
    this.handlers[event].forEach(handler => {
      try {
        handler(data);
      } catch (e) {
        console.error(`[SSE] Handler error for ${event}:`, e);
      }
    });
  },

  /**
   * Disconnect from SSE
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnecting = false;
      console.log('[SSE] Disconnected');
      this.emit('disconnected', { sessionId: this.sessionId });
    }
  },

  /**
   * Check if connected
   */
  isConnected() {
    return this.eventSource && this.eventSource.readyState === EventSource.OPEN;
  },

  /**
   * Check if connecting
   */
  isConnectingTo() {
    return this.isConnecting;
  },

  /**
   * Show error notification
   * @param {string} message - error message
   * @param {string} type - error type: 'sse', 'api', 'reconnect'
   */
  showErrorNotification(message, type) {
    type = type || 'sse';
    this._removeErrorNotification();
    
    const notification = document.createElement('div');
    notification.className = 'pui-error-notification';
    
    const icons = {
      sse: '⚠️',
      api: '❌',
      reconnect: '🔄'
    };
    
    notification.innerHTML = `
      <span class="pui-error-icon">${icons[type] || icons.sse}</span>
      <span class="pui-error-message">${message}</span>
      <button class="pui-error-close" title="Dismiss">&times;</button>
    `;
    
    const closeBtn = notification.querySelector('.pui-error-close');
    closeBtn.addEventListener('click', () => this._removeErrorNotification());
    
    document.body.appendChild(notification);
    this._errorNotification = notification;
    
    // Auto-hide after 10 seconds for reconnect, 30 seconds for errors
    const timeout = type === 'reconnect' ? 10000 : 30000;
    setTimeout(() => this._removeErrorNotification(), timeout);
  },

  /**
   * Remove error notification
   * @private
   */
  _removeErrorNotification() {
    if (this._errorNotification) {
      this._errorNotification.remove();
      this._errorNotification = null;
    }
  },

  /**
   * Update cube status for all panels
   * @param {string} status - status: idle, running, completed, disconnected, error, reconnecting
   */
  updateCubeStatus(status) {
    const cubes = document.querySelectorAll('.pui-cube');
    cubes.forEach(cube => {
      const statusEl = cube.querySelector('.pui-cube-status');
      if (statusEl) {
        statusEl.className = 'pui-cube-status ' + status;
      }
    });
  },

  /**
   * Handle SSE disconnection
   * @private
   */
  _handleDisconnect() {
    this.updateCubeStatus('disconnected');
    this.showErrorNotification('SSE connection lost. Attempting to reconnect...', 'sse');
  },

  /**
   * Handle successful reconnection
   * @private
   */
  _handleReconnect() {
    this.updateCubeStatus('idle');
    this._removeErrorNotification();
  },

  /**
   * Handle API error
   * @param {Object} error - error data
   */
  handleApiError(error) {
    this.updateCubeStatus('error');
    const message = error?.message || error?.error?.message || 'API request failed';
    this.showErrorNotification(message, 'api');
  },

  // ========== API Helper Methods ==========

  /**
   * Create a new session via API
   */
  async createSession(projectId, title) {
    if (!this.apiClient) {
      throw new Error('API client not configured. Call configureApi() first.');
    }
    return this.apiClient.createSession(projectId, title);
  },

  /**
   * Get session details
   */
  async getSession(sessionId) {
    if (!this.apiClient) {
      throw new Error('API client not configured. Call configureApi() first.');
    }
    return this.apiClient.getSession(sessionId);
  },

  /**
   * List sessions
   */
  async listSessions(projectId) {
    if (!this.apiClient) {
      throw new Error('API client not configured. Call configureApi() first.');
    }
    return this.apiClient.listSessions(projectId);
  },

  /**
   * Create a new request (task)
   */
  async createRequest(data) {
    if (!this.apiClient) {
      throw new Error('API client not configured. Call configureApi() first.');
    }
    return this.apiClient.createRequest(data);
  },

  /**
   * Approve action
   */
  async approveAction(sessionId, approved) {
    if (!this.apiClient) {
      throw new Error('API client not configured. Call configureApi() first.');
    }
    return this.apiClient.approveAction(sessionId, approved);
  },

  /**
   * Send step result
   */
  async sendStepResult(sessionId, stepResult) {
    if (!this.apiClient) {
      throw new Error('API client not configured. Call configureApi() first.');
    }
    return this.apiClient.sendStepResult(sessionId, stepResult);
  },

  /**
   * Cancel request
   */
  async cancelRequest(promiseId) {
    if (!this.apiClient) {
      throw new Error('API client not configured. Call configureApi() first.');
    }
    return this.apiClient.cancelRequest(promiseId);
  }
};

// Make global
window.SSEClient = SSEClient;

// Auto-connect if sessionId is provided in URL
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  const apiBase = urlParams.get('api') || '/api/v1';
  
  if (sessionId) {
    console.log('[SSE] Auto-connecting to session:', sessionId);
    SSEClient.configureApi(apiBase);
    SSEClient.connect(sessionId);
  }
});

export default SSEClient;
