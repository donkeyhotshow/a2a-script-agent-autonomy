/**
 * Session message normalizers and utilities
 */

export function normalizeMessage(value, defaultRole = 'system') {
    if (!value) return null;
    const role = value.role || defaultRole;
    const content = typeof value === 'string'
        ? value
        : (value.content || value.message || value.text || '');
    if (!content) return null;
    return {
        id: value.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        role,
        content: String(content),
        timestamp: value.timestamp || new Date().toISOString(),
        metadata: value.metadata ? { ...value.metadata } : {}
    };
}

export const MAX_MESSAGES = 200;

export function formatDuration(ms) {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
}

