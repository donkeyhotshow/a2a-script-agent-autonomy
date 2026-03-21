/**
 * Session Storage API - Persistent storage operations
 * Handles create/save/load/list/check for 'storage' mode
 */

export class SessionStorageAPI {
    constructor(storageBase, storageMode) {
        if (typeof storageBase !== 'string' || !storageBase) {
            throw new Error('[SessionStorageAPI] storageBase (non-empty string) required');
        }
        if (storageMode !== 'storage' && storageMode !== 'project') {
            throw new Error('[SessionStorageAPI] storageMode must be "storage" or "project"');
        }
        this._storageBase = storageBase;
        this._storageMode = storageMode;
    }

    _storageHeaders() {
        return { 'X-Storage-Mode': this._storageMode };
    }

    async createSessionWithForm(title = 'New Session') {
        const headers = { 'Content-Type': 'application/json', ...this._storageHeaders() };
        const response = await fetch(this._storageBase, {
            method: 'POST',
            headers,
            body: JSON.stringify({ title })
        });

        if (!response.ok) {
            throw new Error(`Failed to create session: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success || !data.session) {
            throw new Error(data.error || 'Server returned unsuccessful response');
        }

        return data.session;
    }

    async saveStep(sessionId, stepData) {
        const response = await fetch(`${this._storageBase}/${sessionId}/steps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this._storageHeaders() },
            body: JSON.stringify(stepData)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save step: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to save step');
        }
        
        return data.step;
    }

    async loadSession(sessionId) {
        const response = await fetch(`${this._storageBase}/${sessionId}`, {
            headers: this._storageHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load session: ${response.status}`);
        }
        
        return await response.json();
    }

    async checkLatestStep(sessionId) {
        const response = await fetch(`${this._storageBase}/${sessionId}/latest`, {
            headers: this._storageHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`[SessionStorageAPI] checkLatestStep failed: ${response.status} for session ${sessionId}`);
        }
        
        return await response.json();
    }

    async getHistory(sessionId, fromStep = 1) {
        const response = await fetch(`${this._storageBase}/${sessionId}/history/${fromStep}`, {
            headers: this._storageHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`[SessionStorageAPI] getHistory failed: ${response.status} for session ${sessionId}`);
        }
        
        const data = await response.json();
        const history = data.history;
        if (!Array.isArray(history)) {
            throw new Error('[SessionStorageAPI] getHistory: response.history must be an array');
        }
        return history;
    }

    async listSessions() {
        const response = await fetch(this._storageBase, {
            headers: this._storageHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`[SessionStorageAPI] listSessions failed: ${response.status}`);
        }
        
        const data = await response.json();
        const sessions = data.sessions;
        if (!Array.isArray(sessions)) {
            throw new Error('[SessionStorageAPI] listSessions: response.sessions must be an array');
        }
        return sessions;
    }
}

