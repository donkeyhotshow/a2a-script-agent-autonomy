/**
 * Newest first (for session list UIs).
 * @param {{ createdAt?: string }} a
 * @param {{ createdAt?: string }} b
 * @returns {number}
 */
export function compareSessionCreatedAtDesc(a, b) {
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
}
