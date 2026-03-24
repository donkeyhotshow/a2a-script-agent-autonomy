/**
 * Active Session Storage helper
 * Centralizes the STORAGE key and read/write helpers for the active session ID.
 */
(function (global) {
    'use strict';

    const ACTIVE_SESSION_KEY = 'active-session';

    async function getStorage() {
        return global.StorageAPI?.sessions || null;
    }

    async function readActiveSessionId() {
        const storage = await getStorage();
        if (!storage?.getItem) {
            return null;
        }
        try {
            return await storage.getItem(ACTIVE_SESSION_KEY);
        } catch (error) {
            console.warn('[ActiveSessionStorage] Failed to read active session:', error);
            return null;
        }
    }

    async function writeActiveSessionId(sessionId) {
        const storage = await getStorage();
        if (!storage?.setItem) {
            return null;
        }
        try {
            await storage.setItem(ACTIVE_SESSION_KEY, sessionId);
        } catch (error) {
            console.warn('[ActiveSessionStorage] Failed to write active session:', error);
        }
    }

    async function clearActiveSessionId() {
        const storage = await getStorage();
        if (!storage?.removeItem) {
            return null;
        }
        try {
            await storage.removeItem(ACTIVE_SESSION_KEY);
        } catch (error) {
            console.warn('[ActiveSessionStorage] Failed to clear active session:', error);
        }
    }

    global.ActiveSessionStorage = {
        ACTIVE_SESSION_KEY,
        readActiveSessionId,
        writeActiveSessionId,
        clearActiveSessionId
    };

})(typeof window !== 'undefined' ? window : globalThis);
