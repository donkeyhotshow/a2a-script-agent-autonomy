/**
 * SSE Client for real-time event monitoring
 */

import fetch from 'node-fetch';

/**
 * SSE Event Types
 */
export const EVENT_TYPES = {
  CONNECTED: 'connected',
  MESSAGE: 'message',
  LOG: 'log',
  PROGRESS: 'progress',
  STATUS: 'status',
  TASK_RESPONSE: 'task_response',
  SESSION_UPDATE: 'session_update',
  ACTION_PROPOSAL: 'action_proposal',
  ACTION_EXECUTING: 'action_executing',
  STEP_RESULT: 'step_result',
  COMPLETE: 'complete',
  ERROR: 'error',
  TESTER_COMMAND: 'tester_command',
  TESTER_RESPONSE: 'tester_response',
  PANEL_UPDATE: 'panel_update',
  SESSION_CHANGE: 'session_change'
};

/**
 * SSE Client class for monitoring web client events
 */
export class SSEClient {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'http://localhost:3001';
    this.sessionId = options.sessionId || 'tester-session';
    this.filters = options.filters || [];
    this.verbose = options.verbose || false;

    this.eventSource = null;
    this.listeners = new Map();
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Connect to SSE stream
   */
  async connect() {
    if (this.connected) {
      throw new Error('Already connected');
    }

    const url = `${this.apiUrl}/api/sse/${this.sessionId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
      }

      this.connected = true;
      this.reconnectAttempts = 0;

      console.log(`Connected to SSE: ${url}`);

      this._startReading(response);

    } catch (error) {
      console.error('SSE connection error:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect() {
    this.connected = false;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  _emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Start reading SSE stream
   */
  async _startReading(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (this.connected) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('SSE stream ended');
          break;
        }

        const chunk = decoder.decode(value);
        this._processChunk(chunk);
      }
    } catch (error) {
      console.error('Error reading SSE stream:', error);

      if (this.connected && this.reconnectAttempts < this.maxReconnectAttempts) {
        this._reconnect();
      }
    }
  }

  /**
   * Process SSE chunk
   */
  _processChunk(chunk) {
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        this._currentEvent = line.slice(7);
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          // Check filters
          if (this.filters.length === 0 ||
              this.filters.includes(this._currentEvent) ||
              this.filters.includes(data.type)) {

            if (this.verbose) {
              console.log(`[${new Date().toLocaleTimeString()}] ${this._currentEvent}:`, data);
            }

            // Emit specific event
            this._emit(this._currentEvent, data);

            // Emit generic message event
            this._emit('message', { event: this._currentEvent, data });
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      }
    }
  }

  /**
   * Attempt to reconnect
   */
  async _reconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, delay);
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.connected,
      sessionId: this.sessionId,
      filters: this.filters,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

/**
 * Create and connect SSE client
 */
export async function createSSEClient(options = {}) {
  const client = new SSEClient(options);
  await client.connect();
  return client;
}

/**
 * Monitor events for a specified duration
 */
export async function monitorEvents(options = {}) {
  const {
    duration = 10000,
    filters = [],
    onEvent = null,
    verbose = false
  } = options;

  const client = new SSEClient({ ...options, filters, verbose });

  if (onEvent) {
    client.on('message', onEvent);
  }

  await client.connect();

  // Set up timeout
  const timeoutPromise = new Promise(resolve => {
    setTimeout(() => {
      client.disconnect();
      resolve();
    }, duration);
  });

  await timeoutPromise;

  return client.getStatus();
}