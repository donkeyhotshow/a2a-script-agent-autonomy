/**
 * Session Manager UI Module
 * Handles session list, creation, deletion, and real-time conversation display
 */

(function (global) {
    'use strict';

    const SessionManager = {
        // Configuration
        apiBase: '/api/v1',
        currentSessionId: null,
        currentProjectId: null,
        sessions: [],
        _listeners: new Map(),
        _updateInterval: null,
        _lastUpdate: null,

        /**
         * Initialize session manager
         */
        init(options = {}) {
            this.apiBase = options.apiBase || this.apiBase;
            this.currentProjectId = options.projectId || null;
            
            // Load sessions if project is set
            if (this.currentProjectId) {
                this.loadSessions();
            }
            
            console.log('[SessionManager] Initialized');
            return this;
        },

        /**
         * Configure API base URL
         */
        configure(options = {}) {
            if (options.apiBase) this.apiBase = options.apiBase.replace(/\/?$/, '');
            if (options.projectId) this.currentProjectId = options.projectId;
            return this;
        },

        /**
         * Get authentication headers
         */
        _getHeaders() {
            const headers = { 'Content-Type': 'application/json' };
            const token = global.apiIntegration?.token;
            if (token) headers['Authorization'] = `Bearer ${token}`;
            return headers;
        },

        /**
         * Make API request
         */
        async _request(method, path, body = null) {
            const url = `${this.apiBase}${path}`;
            const options = { method, headers: this._getHeaders() };
            if (body) options.body = JSON.stringify(body);

            try {
                const response = await fetch(url, options);
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data?.error?.message || `Request failed: ${response.status}`);
                }
                return data.data || data;
            } catch (error) {
                console.error('[SessionManager] Request error:', error);
                throw error;
            }
        },

        /**
         * Load sessions for current project
         */
        async loadSessions(projectId = null) {
            const pid = projectId || this.currentProjectId;
            if (!pid) {
                console.warn('[SessionManager] No project ID specified');
                return [];
            }

            try {
                this.sessions = await this._request('GET', `/sessions?projectId=${pid}`);
                this.emit('sessionsLoaded', this.sessions);
                return this.sessions;
            } catch (error) {
                console.error('[SessionManager] Failed to load sessions:', error);
                this.emit('error', error);
                return [];
            }
        },

        /**
         * Create new session
         */
        async createSession(options = {}) {
            const { projectId = this.currentProjectId, title = '', task = '' } = options;
            if (!projectId) {
                throw new Error('Project ID is required');
            }

            try {
                const session = await this._request('POST', '/sessions', {
                    projectId,
                    title: title || `Session ${new Date().toLocaleString()}`,
                    task
                });
                
                this.sessions.unshift(session);
                this.emit('sessionCreated', session);
                return session;
            } catch (error) {
                console.error('[SessionManager] Failed to create session:', error);
                this.emit('error', error);
                throw error;
            }
        },

        /**
         * Get session by ID
         */
        async getSession(sessionId) {
            if (!sessionId) {
                throw new Error('Session ID is required');
            }

            try {
                const session = await this._request('GET', `/sessions/${sessionId}`);
                this.emit('sessionLoaded', session);
                return session;
            } catch (error) {
                console.error('[SessionManager] Failed to get session:', error);
                this.emit('error', error);
                throw error;
            }
        },

        /**
         * Delete session
         */
        async deleteSession(sessionId) {
            if (!sessionId) {
                throw new Error('Session ID is required');
            }

            try {
                await this._request('DELETE', `/sessions/${sessionId}`);
                this.sessions = this.sessions.filter(s => s.id !== sessionId && s.sessionId !== sessionId);
                this.emit('sessionDeleted', sessionId);
                return true;
            } catch (error) {
                console.error('[SessionManager] Failed to delete session:', error);
                this.emit('error', error);
                throw error;
            }
        },

        /**
         * Set active session
         */
        setActiveSession(sessionId) {
            this.currentSessionId = sessionId;
            this.emit('sessionChanged', sessionId);
            
            // Connect to SSE for this session
            if (global.SSEClient) {
                global.SSEClient.connect(sessionId, this.apiBase);
            }
        },

        /**
         * Get conversation history for session
         */
        async getConversation(sessionId) {
            const sid = sessionId || this.currentSessionId;
            if (!sid) {
                throw new Error('No session ID');
            }

            try {
                const session = await this._request('GET', `/sessions/${sid}`);
                const messages = session?.messages || session?.dialog || [];
                this.emit('conversationLoaded', { sessionId: sid, messages });
                return messages;
            } catch (error) {
                console.error('[SessionManager] Failed to load conversation:', error);
                this.emit('error', error);
                throw error;
            }
        },

        /**
         * Subscribe to events
         */
        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },

        /**
         * Unsubscribe from events
         */
        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },

        /**
         * Emit event
         */
        emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch (e) { console.error('[SessionManager] Event handler error:', e); }
            });
        },

        /**
         * Render sessions list to DOM element
         */
        renderSessionsList(containerId, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`[SessionManager] Container not found: ${containerId}`);
                return;
            }

            const { 
                onSelect = () => {},
                onDelete = () => {},
                onCreate = () => {},
                emptyMessage = 'No sessions yet',
                showCreateButton = true
            } = options;

            let html = '';
            
            if (showCreateButton) {
                html += `<div class="session-manager-actions">
                    <button type="button" class="btn btn-primary" id="sessionManagerCreateBtn">+ New Session</button>
                </div>`;
            }

            if (this.sessions.length === 0) {
                html += `<div class="session-manager-empty">${emptyMessage}</div>`;
            } else {
                html += '<div class="session-manager-list">';
                this.sessions.forEach(session => {
                    const id = session.id || session.sessionId || session;
                    const title = session.title || session.name || `Session ${id.slice(0, 8)}`;
                    const active = id === this.currentSessionId ? ' active' : '';
                    const status = session.status || '';
                    
                    html += `<div class="session-item${active}" data-session-id="${escapeHtml(id)}">
                        <div class="session-item-content">
                            <span class="session-item-title">${escapeHtml(title)}</span>
                            ${status ? `<span class="session-item-status">${escapeHtml(status)}</span>` : ''}
                        </div>
                        <button type="button" class="session-item-delete" title="Delete">&times;</button>
                    </div>`;
                });
                html += '</div>';
            }

            container.innerHTML = html;

            // Bind events
            container.querySelectorAll('.session-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('session-item-delete')) {
                        const sid = item.dataset.sessionId;
                        this.setActiveSession(sid);
                        onSelect(sid);
                    }
                });
            });

            container.querySelectorAll('.session-item-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const item = btn.closest('.session-item');
                    const sid = item?.dataset.sessionId;
                    if (sid && confirm('Delete this session?')) {
                        this.deleteSession(sid).then(() => onDelete(sid));
                    }
                });
            });

            const createBtn = document.getElementById('sessionManagerCreateBtn');
            if (createBtn) {
                createBtn.addEventListener('click', () => {
                    this.createSession().then(session => {
                        const sid = session?.id || session?.sessionId;
                        if (sid) {
                            this.setActiveSession(sid);
                            onCreate(session);
                        }
                    });
                });
            }
        },

        /**
         * Render conversation to DOM element
         */
        renderConversation(containerId, messages = []) {
            const container = document.getElementById(containerId);
            if (!container) return;

            if (messages.length === 0) {
                container.innerHTML = '<div class="conversation-empty">No messages yet</div>';
                return;
            }

            let html = '<div class="conversation-messages">';
            messages.forEach(msg => {
                const role = msg.role || msg.direction || 'unknown';
                const content = msg.content || msg.text || msg.message || '';
                const timestamp = msg.timestamp || msg.createdAt || '';
                
                html += `<div class="conversation-message message-${role}">
                    <div class="message-header">
                        <span class="message-role">${escapeHtml(role)}</span>
                        ${timestamp ? `<span class="message-time">${new Date(timestamp).toLocaleTimeString()}</span>` : ''}
                    </div>
                    <div class="message-content">${escapeHtml(String(content))}</div>
                </div>`;
            });
            html += '</div>';

            container.innerHTML = html;
            container.scrollTop = container.scrollHeight;
        },

        /**
         * Append message to conversation
         */
        appendMessage(message) {
            const container = document.getElementById('conversationContainer');
            if (!container) return;

            let messagesEl = container.querySelector('.conversation-messages');
            if (!messagesEl) {
                container.innerHTML = '<div class="conversation-messages"></div>';
                messagesEl = container.querySelector('.conversation-messages');
            }

            const role = message.role || message.direction || 'unknown';
            const content = message.content || message.text || message.message || '';
            const timestamp = message.timestamp || message.createdAt || new Date().toISOString();

            const msgEl = document.createElement('div');
            msgEl.className = `conversation-message message-${role}`;
            msgEl.innerHTML = `
                <div class="message-header">
                    <span class="message-role">${escapeHtml(role)}</span>
                    <span class="message-time">${new Date(timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="message-content">${escapeHtml(String(content))}</div>
            `;

            messagesEl.appendChild(msgEl);
            container.scrollTop = container.scrollHeight;
        }
    };

    // Escape HTML helper
    function escapeHtml(s) {
        if (s == null) return '';
        const el = document.createElement('div');
        el.textContent = String(s);
        return el.innerHTML;
    }

    // Export
    global.SessionManager = SessionManager;

})(typeof window !== 'undefined' ? window : globalThis);
