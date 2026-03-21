/**
 * Session Storage API - Persistent storage operations
 * Handles create/save/load/list/check for 'storage' mode
 */

export class SessionStorageAPI {
    constructor(storageBase = '/api/a2a/sessions', storageMode = 'storage') {
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
            console.warn(`[SessionStorageAPI] checkLatestStep failed: ${response.status} for session ${sessionId}`);
            return null;
        }
        
        return await response.json();
    }

    async getHistory(sessionId, fromStep = 1) {
        const response = await fetch(`${this._storageBase}/${sessionId}/history/${fromStep}`, {
            headers: this._storageHeaders()
        });
        
        if (!response.ok) {
            console.warn(`[SessionStorageAPI] getHistory failed: ${response.status} for session ${sessionId}`);
            return [];
        }
        
        const data = await response.json();
        return data.history || [];
    }

    async listSessions() {
        const response = await fetch(this._storageBase, {
            headers: this._storageHeaders()
        });
        
        if (!response.ok) {
            console.warn(`[SessionStorageAPI] listSessions failed: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        return data.sessions || [];
    }
}

