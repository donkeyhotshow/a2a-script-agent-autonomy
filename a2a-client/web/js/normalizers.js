/**
 * Normalizers — global script API (session-data / legacy).
 * ESM helpers: js/utils/normalizers.js (DialogState, tests).
 */

(function (global) {
    'use strict';

    function normalizeMessage(msg, role) {
        if (!msg || typeof msg !== 'object') {
            return {
                content: String(msg || ''),
                role: role || 'user',
                timestamp: Date.now()
            };
        }
        return {
            id: msg.id || 'msg_' + Date.now(),
            content: msg.content || msg.text || String(msg),
            role: msg.role || role || 'user',
            metadata: msg.metadata || {},
            timestamp: msg.timestamp || Date.now()
        };
    }

    global.Normalizers = {
        normalizeMessage
    };

})(typeof window !== 'undefined' ? window : globalThis);
