/**
 * Canonical session message normalizer (ESM + window.Normalizers via install-normalizers.mjs).
 */

export function normalizeMessage(value, defaultRole = 'system') {
    if (value === null || value === undefined) return null;

    if (typeof value === 'string') {
        return {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            role: defaultRole,
            content: value,
            timestamp: new Date().toISOString(),
            metadata: {}
        };
    }

    if (typeof value !== 'object') {
        return {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            role: defaultRole,
            content: String(value),
            timestamp: new Date().toISOString(),
            metadata: {}
        };
    }

    const role = value.role || defaultRole;
    const content = value.content || value.message || value.text || String(value);
    if (!content) {
        console.warn('[normalizers] normalizeMessage: no content found, value:', value);
        return null;
    }
    return {
        id: value.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        role,
        content: String(content),
        timestamp: value.timestamp || new Date().toISOString(),
        metadata: value.metadata ? { ...value.metadata } : {}
    };
}

export const MAX_MESSAGES = 200;
