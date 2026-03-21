/**
 * Session message normalizers and utilities
 */

export function normalizeMessage(value, defaultRole = 'system') {
    if (!value) return null;
    const role = value.role || defaultRole;
    const content = typeof value === 'string'
        ? value
        : (value.content || value.message || value.text);
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
