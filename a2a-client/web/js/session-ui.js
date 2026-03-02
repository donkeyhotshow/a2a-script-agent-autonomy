/**
 * SessionUI - WebSocket-based UI manager for real-time session communication
 * Provides bidirectional communication for session events and messages
 * 
 * WebSocket URL: ws://localhost:3000/api/sessions/{sessionId}/stream
 * Optional auth: ?token=JWT_TOKEN
 */

class SessionUI {
    constructor(options = {}) {
        // Configuration
        this.wsUrl = options.wsUrl || 'ws://localhost:3000';
        this.apiBase = options.apiBase || '/api/v1';
        this.reconnectBaseDelay = options.reconnectBaseDelay || 1000;  // 1 second base
        this.reconnectMaxDelay = options.reconnectMaxDelay || 30000;   // 30 seconds max
        this.heartbeatInterval = options.heartbeatInterval || 30000;    // 30 seconds
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
        
        // State
        this.ws = null;
        this.sessionId = null;
        this.token = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
        
        // Event handlers (Observer pattern)
        this.handlers = new Map();
        
        // Default event types
        this.eventTypes = [
            'connected',
            'disconnected',
            'session:updated',
            'message:new',
            'sequence:new',
            'error'
        ];
        
        // Initialize handlers
        this.eventTypes.forEach(type => this.handlers.set(type, []));
        
        // Logger
        this.logger = options.logger || {
            log: (...args) => console.log('[SessionUI]', ...args),
            warn: (...args) => console.warn('[SessionUI]', ...args),
            error: (...args) => console.error('[SessionUI]', ...args),
            debug: (...args) => console.debug('[SessionUI]', ...args)
        };
        
        // UI references (optional, for auto-integration)
        this.uiElements = {
            messagesContainer: null,
            statusIndicator: null,
            notificationContainer: null
        };
    }
    
    /**
     * Connect to WebSocket server for a specific session
     * @param {string} sessionId - The session ID to connect to
     * @param {string} token - Optional JWT token for authentication
     * @returns {Promise<void>}
     */
    async connect(sessionId, token = null) {
        if (this.isConnected || this.isConnecting) {
            this.logger.warn('Already connected or connecting', { sessionId: this.sessionId });
            return;
        }
        
        this.sessionId = sessionId;
        this.token = token;
        this.isConnecting = true;
        
        // Build WebSocket URL
        let url = `${this.wsUrl}/api/sessions/${sessionId}/stream`;
        if (token) {
            url += `?token=${encodeURIComponent(token)}`;
        }
        
        this.logger.log('Connecting to WebSocket', { url: url.replace(token ? token.substring(0, 10) + '...' : '', '***') });
        
        try {
            this.ws = new WebSocket(url);
            
            this.ws.onopen = (event) => this._handleOpen(event);
            this.ws.onclose = (event) => this._handleClose(event);
            this.ws.onerror = (event) => this._handleError(event);
            this.ws.onmessage = (event) => this._handleMessage(event);
            
            // Wait for connection or timeout
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);
                
                const originalHandler = this.handlers.get('connected')[0];
                this.handlers.set('connected', [...this.handlers.get('connected'), () => {
                    clearTimeout(timeout);
                    resolve();
                }]);
            });
            
        } catch (error) {
            this.isConnecting = false;
            this.logger.error('Failed to connect', error);
            this._emit('error', { type: 'connection', message: error.message });
            this._scheduleReconnect();
            throw error;
        }
    }
    
    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this.logger.log('Disconnecting', { sessionId: this.sessionId });
        
        // Clear timers
        this._clearTimers();
        
        // Reset reconnect state
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        // Close WebSocket
        if (this.ws) {
            this.ws.onclose = null;  // Prevent reconnect on intentional disconnect
            this.ws.close();
            this.ws = null;
        }
        
        this.isConnected = false;
        this.isConnecting = false;
        this.sessionId = null;
        
        this._emit('disconnected', { sessionId: this.sessionId });
    }
    
    /**
     * Send a message to the server
     * @param {object} message - Message payload
     * @returns {boolean} Success status
     */
    send(message) {
        if (!this.isConnected || !this.ws) {
            this.logger.error('Cannot send: not connected');
            return false;
        }
        
        try {
            const payload = JSON.stringify(message);
            this.ws.send(payload);
            this.logger.debug('Message sent', message);
            return true;
        } catch (error) {
            this.logger.error('Failed to send message', error);
            this._emit('error', { type: 'send', message: error.message });
            return false;
        }
    }
    
    /**
     * Subscribe to session events (send subscribe action to server)
     * @param {string[]} events - Event types to subscribe to
     */
    subscribe(events = []) {
        this.send({
            type: 'subscribe',
            events: events.length ? events : this.eventTypes,
            sessionId: this.sessionId
        });
        this.logger.log('Subscribed to events', { events });
    }
    
    /**
     * Unsubscribe from session events
     * @param {string[]} events - Event types to unsubscribe from
     */
    unsubscribe(events = []) {
        this.send({
            type: 'unsubscribe',
            events: events.length ? events : this.eventTypes,
            sessionId: this.sessionId
        });
        this.logger.log('Unsubscribed from events', { events });
    }
    
    /**
     * Register an event handler (Observer pattern)
     * @param {string} event - Event type
     * @param {function} callback - Handler function
     * @returns {function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.eventTypes.includes(event)) {
            this.logger.warn('Unknown event type', { event });
        }
        
        const handlers = this.handlers.get(event) || [];
        handlers.push(callback);
        this.handlers.set(event, handlers);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }
    
    /**
     * Remove an event handler
     * @param {string} event - Event type
     * @param {function} callback - Handler function to remove
     */
    off(event, callback) {
        const handlers = this.handlers.get(event) || [];
        const index = handlers.indexOf(callback);
        if (index > -1) {
            handlers.splice(index, 1);
            this.handlers.set(event, handlers);
        }
    }
    
    /**
     * Emit an event to all handlers
     * @private
     */
    _emit(event, data) {
        const handlers = this.handlers.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                this.logger.error('Event handler error', { event, error });
            }
        });
    }
    
    /**
     * Handle WebSocket open event
     * @private
     */
    _handleOpen(event) {
        this.logger.log('WebSocket connected', { sessionId: this.sessionId });
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Start heartbeat
        this._startHeartbeat();
        
        // Auto-subscribe to events
        this.subscribe();
        
        // Emit connected event
        this._emit('connected', { sessionId: this.sessionId });
        
        // Update UI if available
        this._updateConnectionStatus(true);
    }
    
    /**
     * Handle WebSocket close event
     * @private
     */
    _handleClose(event) {
        this.logger.log('WebSocket disconnected', { 
            sessionId: this.sessionId, 
            code: event.code, 
            reason: event.reason 
        });
        
        this.isConnected = false;
        this._clearTimers();
        
        // Emit disconnected event
        this._emit('disconnected', { 
            sessionId: this.sessionId,
            code: event.code,
            reason: event.reason
        });
        
        // Update UI
        this._updateConnectionStatus(false);
        
        // Schedule reconnect if not intentional
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this._scheduleReconnect();
        }
    }
    
    /**
     * Handle WebSocket error event
     * @private
     */
    _handleError(event) {
        this.logger.error('WebSocket error', event);
        this._emit('error', { type: 'websocket', message: 'WebSocket error occurred' });
    }
    
    /**
     * Handle incoming WebSocket messages
     * @private
     */
    _handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            this.logger.debug('Message received', data);
            
            // Route to appropriate handler based on event type
            switch (data.type) {
                case 'session:updated':
                    this._handleSessionUpdate(data);
                    break;
                case 'message:new':
                    this._handleNewMessage(data);
                    break;
                case 'sequence:new':
                    this._handleNewSequence(data);
                    break;
                case 'pong':
                    // Heartbeat response
                    this.logger.debug('Heartbeat pong received');
                    break;
                case 'error':
                    this._emit('error', data.payload || data);
                    break;
                default:
                    // Emit raw message event
                    this._emit('message', data);
            }
            
        } catch (error) {
            this.logger.error('Failed to parse message', error);
        }
    }
    
    /**
     * Handle session update event
     * @private
     */
    _handleSessionUpdate(data) {
        const payload = data.payload || data;
        this.logger.log('Session updated', payload);
        
        this._emit('session:updated', payload);
        
        // Update UI if Sessions object exists
        if (window.Sessions) {
            Object.assign(window.Sessions.state.current || {}, payload);
        }
    }
    
    /**
     * Handle new message event
     * @private
     */
    _handleNewMessage(data) {
        const message = data.payload || data;
        this.logger.log('New message received', message);
        
        this._emit('message:new', message);
        
        // Update UI - add message to list
        this._addMessageToUI(message);
        
        // Update Sessions state if available
        if (window.Sessions && window.Sessions.state) {
            window.Sessions.state.messages.push(message);
        }
    }
    
    /**
     * Handle new sequence event
     * @private
     */
    _handleNewSequence(data) {
        const sequence = data.payload || data;
        this.logger.log('New sequence received', sequence);
        
        this._emit('sequence:new', sequence);
    }
    
    /**
     * Start heartbeat timer
     * @private
     */
    _startHeartbeat() {
        this._clearTimers();
        
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected && this.ws) {
                this.logger.debug('Sending heartbeat');
                this.send({ type: 'ping' });
            }
        }, this.heartbeatInterval);
    }
    
    /**
     * Clear all timers
     * @private
     */
    _clearTimers() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    /**
     * Schedule reconnection with exponential backoff
     * @private
     */
    _scheduleReconnect() {
        if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
            this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts),
            this.reconnectMaxDelay
        );
        
        this.reconnectAttempts++;
        this.logger.log('Scheduling reconnect', { 
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            delay 
        });
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.sessionId) {
                this.logger.log('Attempting reconnection', { attempt: this.reconnectAttempts });
                this.connect(this.sessionId, this.token).catch(err => {
                    this.logger.error('Reconnection failed', err);
                });
            }
        }, delay);
    }
    
    /**
     * Update connection status in UI
     * @private
     */
    _updateConnectionStatus(connected) {
        // Find status indicator
        const statusEl = document.getElementById('chatSessionStatus');
        if (statusEl) {
            statusEl.textContent = connected ? '🟢 Connected' : '🔴 Disconnected';
            statusEl.className = `chat-session-status ${connected ? 'connected' : 'disconnected'}`;
        }
        
        // Update header status
        const headerStatus = document.querySelector('.sessions-chat .chat-header');
        if (headerStatus) {
            headerStatus.classList.toggle('ws-connected', connected);
        }
    }
    
    /**
     * Add message to UI message list
     * @private
     */
    _addMessageToUI(message) {
        const messagesContainer = document.getElementById('sessionMessages');
        if (!messagesContainer) return;
        
        // Remove empty message placeholder
        const emptyEl = messagesContainer.querySelector('.empty');
        if (emptyEl) {
            emptyEl.remove();
        }
        
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${message.role || 'assistant'}`;
        messageEl.dataset.messageId = message.messageId || message.id || Date.now();
        
        const roleLabel = message.role === 'user' ? 'You' : 'Assistant';
        const content = message.content || message.text || JSON.stringify(message, null, 2);
        const timestamp = message.timestamp || new Date().toLocaleTimeString();
        
        messageEl.innerHTML = `
            <div class="message-role">${roleLabel}</div>
            <div class="message-content">${this._escapeHtml(content)}</div>
            <div class="message-timestamp">${timestamp}</div>
        `;
        
        messagesContainer.appendChild(messageEl);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Escape HTML special characters
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Show error notification in UI
     * @param {string} message - Error message
     * @param {string} type - Notification type
     */
    showNotification(message, type = 'error') {
        // Try to find notification container or create one
        let container = document.querySelector('.notifications');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notifications';
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    /**
     * Get current connection state
     * @returns {object}
     */
    getState() {
        return {
            isConnected: this.isConnected,
            isConnecting: this.isConnecting,
            sessionId: this.sessionId,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
    
    /**
     * Check if connected
     * @returns {boolean}
     */
    isReady() {
        return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Export for browser usage
window.SessionUI = SessionUI;

// Factory function for quick initialization
window.SessionUI.create = function(options) {
    return new SessionUI(options);
};
