/**
 * Session API Module - методы API для управления сессиями
 */

(function (global) {
    'use strict';

    /**
     * Создать API адаптер для сессий
     * @param {Object} store - SessionStore
     * @returns {Object}
     */
    function createSessionAPI(store) {
        return {
            apiBase: '/api',
            
            _getHeaders() {
                const headers = { 'Content-Type': 'application/json' };
                const token = global.apiIntegration?.token;
                if (token) headers['Authorization'] = `Bearer ${token}`;
                return headers;
            },

            async _request(method, path, body = null) {
                const url = `${this.apiBase}${path}`;
                const options = { method, headers: this._getHeaders() };
                if (body) options.body = JSON.stringify(body);

                try {
                    const response = await fetch(url, options);
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        const isStorage404 = url.includes('/api/storage/') && response.status === 404;
                        if (!isStorage404) {
                            global.ErrorHandler?.handleApiError({
                                status: response.status,
                                data,
                                error: data?.error
                            }, { module: 'SessionAPI', path: url, method });
                        }
                        throw new Error(data?.error?.message || `Request failed: ${response.status}`);
                    }
                    return data.data || data;
                } catch (error) {
                    console.error('[SessionAPI] Request error:', error);
                    global.ErrorHandler?.handleNetworkError(error, { module: 'SessionAPI', path: url, method });
                    throw error;
                }
            },

            async loadSessions(projectId = null, sessionsList = []) {
                const pid = projectId || this.currentProjectId;
                if (!pid) {
                    console.warn('[SessionAPI] No project ID');
                    return [];
                }
                try {
                    const sessions = await this._request('GET', `/sessions?projectId=${pid}`);
                    return sessions;
                } catch (error) {
                    return [];
                }
            },

            async createSession(options = {}) {
                const { projectId = this.currentProjectId, title = '', task = '' } = options;
                if (!projectId) throw new Error('Project ID required');

                const session = await this._request('POST', '/sessions', {
                    projectId,
                    title: title || `Session ${new Date().toLocaleString()}`,
                    task
                });
                return session;
            },

            async getSession(sessionId) {
                const session = await this._request('GET', `/sessions/${sessionId}`);
                return session;
            },

            async deleteSession(sessionId) {
                await this._request('DELETE', `/sessions/${sessionId}`);
                return true;
            },

            async getConversation(sessionId) {
                const sid = sessionId || this.currentSessionId;
                const session = await this._request('GET', `/sessions/${sid}`);
                return session?.messages || session?.dialog || [];
            },

            async sendResult(sessionId, projectId, result) {
                const body = { projectId, sessionId, result };
                const response = await this._request('POST', `/sessions/${sessionId}/result`, body);
                return response?.data || response;
            },

            async executeNext(sessionId, mode = 'manual') {
                const response = await this._request('POST', `/sessions/${sessionId}/next`, { mode });
                return response?.data || response;
            },

            async selectAction(sessionId, actionId) {
                const response = await this._request('POST', `/sessions/${sessionId}/action`, {
                    selectedAction: actionId
                });
                return response?.data || response;
            }
        };
    }

    // Export
    global.createSessionAPI = createSessionAPI;

})(typeof window !== 'undefined' ? window : globalThis);
