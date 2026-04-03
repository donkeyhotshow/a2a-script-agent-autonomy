/**
 * History projection boundary.
 *
 * Input: canonical server payload pieces:
 *   - context.history (array)
 *   - context.files (optional)
 *   - workbench (optional)
 *
 * Output: deterministic timeline records with tri-role support:
 *   - role: 'user' | 'assistant' | 'system'
 *   - content: string
 *   - source: 'history'
 *   - idx: stable index in projected timeline (1-based)
 */

function toText(value) {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    return String(value);
}

function detectSystemRole(entry) {
    if (entry?.role === 'system') return 'system';
    if (entry?.metadata?.source === 'system-prompt') return 'system';
    if (entry?.metadata?.type === 'system') return 'system';
    return entry?.role || 'assistant';
}

/**
 * Project canonical context/workbench into a flat, deterministic history timeline.
 *
 * @param {Object} payload
 * @param {Object} [payload.context]
 * @param {Array}  [payload.context.history]
 * @param {Array}  [payload.context.files]
 * @param {Object} [payload.workbench]
 * @returns {Array<{role: string, content: string, source: string, idx: number}>}
 */
export function projectHistoryTimeline(payload) {
    const context = payload?.context && typeof payload.context === 'object'
        ? payload.context
        : {};

    const history = Array.isArray(context.history) ? context.history : [];

    const timeline = [];

    for (const entry of history) {
        const text =
            toText(entry?.message ?? entry?.content ?? '').trim();
        if (!text) continue;

        const role = detectSystemRole(entry);

        timeline.push({
            role,
            content: text,
            source: 'history',
            // Stable, sequential index; assigned later for determinism.
            idx: 0,
        });
    }

    // Assign stable indices after collection.
    for (let i = 0; i < timeline.length; i += 1) {
        timeline[i].idx = i + 1;
    }

    return timeline;
}

