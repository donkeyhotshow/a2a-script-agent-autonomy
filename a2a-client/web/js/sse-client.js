/**
 * SSE Client Manager
 * Real-time event streaming from server
 */

const SSEClient = {
  eventSource: null,
  sessionId: null,
  handlers: {},
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectDelay: 3000,

  /**
   * Connect to SSE endpoint
   */
  connect(sessionId, apiBase = '/api/v1') {
    this.sessionId = sessionId;
    
    // Close existing connection
    if (this.eventSource) {
      this.disconnect();
    }

    const url = sessionId 
      ? `${apiBase}/sse/${sessionId}`
      : `${apiBase}/sse`;

    console.log('[SSE] Connecting to:', url);
    
    try {
      this.eventSource = new EventSource(url);
      
      this.eventSource.onopen = (event) => {
        console.log('[SSE] Connected!', event);
        this.reconnectAttempts = 0;
        this.emit('connected', { sessionId: this.sessionId });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Message:', data);
          this.emit('message', data);
        } catch (e) {
          console.error('[SSE] Failed to parse message:', e);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[SSE] Error:', error);
        this.emit('error', error);
        
        // Try to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[SSE] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect(this.sessionId, apiBase), this.reconnectDelay);
        } else {
          console.error('[SSE] Max reconnection attempts reached');
          this.emit('maxReconnect', { attempts: this.reconnectAttempts });
        }
      };

      // Register event handlers
      this.setupEventHandlers();

    } catch (e) {
      console.error('[SSE] Failed to create EventSource:', e);
    }
  },

  /**
   * Setup named event handlers
   */
  setupEventHandlers() {
    if (!this.eventSource) return;

    // Connected event
    this.eventSource.addEventListener('connected', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Connected event:', data);
        this.emit('connected', data);
      } catch (e) {
        console.error('[SSE] Failed to parse connected event:', e);
      }
    });

    // Log event
    this.eventSource.addEventListener('log', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Log:', data);
        this.emit('log', data);
      } catch (e) {
        console.error('[SSE] Failed to parse log event:', e);
      }
    });

    // Progress event
    this.eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Progress:', data);
        this.emit('progress', data);
      } catch (e) {
        console.error('[SSE] Failed to parse progress event:', e);
      }
    });

    // Status event
    this.eventSource.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Status:', data);
        this.emit('status', data);
      } catch (e) {
        console.error('[SSE] Failed to parse status event:', e);
      }
    });

    // Complete event
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
      console.log('[SSE] Disconnected');
      this.emit('disconnected', { sessionId: this.sessionId });
    }
  },

  /**
   * Check if connected
   */
  isConnected() {
    return this.eventSource && this.eventSource.readyState === EventSource.OPEN;
  }
};

// Make global
window.SSEClient = SSEClient;

// Auto-connect if sessionId is provided in URL
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  if (sessionId) {
    console.log('[SSE] Auto-connecting to session:', sessionId);
    SSEClient.connect(sessionId);
  }
});

export default SSEClient;
