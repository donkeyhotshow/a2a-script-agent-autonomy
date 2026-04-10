/**
 * Session background registry.
 *
 * Mirrors daemon clarity pattern for tracking background work
 * (pollers, timers, status) per logical session key:
 *   key = `${projectId}:${sessionId}`
 *
 * This module is intentionally framework‑agnostic: callers own creation
 * of timers / pollers and only register lightweight descriptors +
 * optional stop/cleanup callbacks.
 */

/**
 * @typedef {'idle'|'pending'|'completed'|'failed'} SessionBackgroundStatus
 */

/**
 * @typedef {Object} BackgroundHandle
 * @property {string} id
 * @property {'poller'|'timer'} kind
 * @property {() => void} [stop] - Optional stop/cleanup callback
 */

/**
 * @typedef {Object} SessionBackgroundEntry
 * @property {string} projectId
 * @property {string} sessionId
 * @property {SessionBackgroundStatus} status
 * @property {Map<string, { id: string, stop?: () => void, createdAt: number }>} pollers
 * @property {Map<string, { id: string, stop?: () => void, createdAt: number }>} timers
 * @property {Record<string, unknown>} meta
 */

/** @type {Map<string, SessionBackgroundEntry>} */
const REGISTRY = new Map();

function makeKey(projectId, sessionId) {
    const p = String(projectId || '').trim();
    const s = String(sessionId || '').trim();
    if (!p || !s) {
        throw new Error('[session-background-registry] Both projectId and sessionId are required');
    }
    return `${p}:${s}`;
}

/**
 * Ensure registry entry exists for key and return it.
 * @param {string} projectId
 * @param {string} sessionId
 * @returns {SessionBackgroundEntry}
 */
function ensureEntry(projectId, sessionId) {
    const key = makeKey(projectId, sessionId);
    let entry = REGISTRY.get(key);
    if (!entry) {
        entry = {
            projectId: String(projectId),
            sessionId: String(sessionId),
            status: 'idle',
            pollers: new Map(),
            timers: new Map(),
            meta: {}
        };
        REGISTRY.set(key, entry);
    }
    return entry;
}

/**
 * Register a background handle (poller or timer) for given project/session.
 *
 * @param {Object} params
 * @param {string} params.projectId
 * @param {string} params.sessionId
 * @param {'poller'|'timer'} params.kind
 * @param {string} params.id - Stable identifier for this handle (e.g. 'async-promise-poll')
 * @param {() => void} [params.stop] - Optional stop/cleanup callback
 * @returns {BackgroundHandle}
 */
export function registerSessionBackground(params) {
    const { projectId, sessionId, kind, id, stop } = params || {};
    if (!projectId || !sessionId || !kind || !id) {
        throw new Error('[session-background-registry] projectId, sessionId, kind, id are required');
    }
    if (kind !== 'poller' && kind !== 'timer') {
        throw new Error('[session-background-registry] kind must be "poller" or "timer"');
    }

    const entry = ensureEntry(projectId, sessionId);
    const bucket = kind === 'poller' ? entry.pollers : entry.timers;

    bucket.set(id, {
        id,
        stop,
        createdAt: Date.now()
    });

    // Any registered background work implies pending state unless
    // caller explicitly overrides via updateSessionBackgroundStatus.
    if (entry.status === 'idle') {
        entry.status = 'pending';
    }

    return {
        id,
        kind,
        stop: () => {
            const current = REGISTRY.get(makeKey(projectId, sessionId));
            if (!current) return;
            const currentBucket = kind === 'poller' ? current.pollers : current.timers;
            const item = currentBucket.get(id);
            currentBucket.delete(id);
            if (item && typeof item.stop === 'function') {
                try {
                    item.stop();
                } catch (e) {
                    // Swallow errors: registry should not crash callers.
                    // eslint-disable-next-line no-console
                    console.error('[session-background-registry] stop callback failed', e);
                }
            }
            // If no more background work, downgrade status to idle unless
            // caller has already set a terminal status.
            if (current.pollers.size === 0 && current.timers.size === 0) {
                if (current.status === 'pending') {
                    current.status = 'idle';
                }
            }
        }
    };
}

/**
 * Update high‑level background status for a session.
 * @param {string} projectId
 * @param {string} sessionId
 * @param {SessionBackgroundStatus} status
 */
export function updateSessionBackgroundStatus(projectId, sessionId, status) {
    if (!status) return;
    const entry = ensureEntry(projectId, sessionId);
    entry.status = status;
}

/**
 * Attach or merge arbitrary metadata for a session.
 * @param {string} projectId
 * @param {string} sessionId
 * @param {Record<string, unknown>} meta
 */
export function mergeSessionBackgroundMeta(projectId, sessionId, meta) {
    if (!meta || typeof meta !== 'object') return;
    const entry = ensureEntry(projectId, sessionId);
    Object.assign(entry.meta, meta);
}

/**
 * Get a plain snapshot for one session (safe for JSON).
 * @param {string} projectId
 * @param {string} sessionId
 */
export function getSessionBackground(projectId, sessionId) {
    const key = makeKey(projectId, sessionId);
    const entry = REGISTRY.get(key);
    if (!entry) return null;
    return {
        projectId: entry.projectId,
        sessionId: entry.sessionId,
        status: entry.status,
        pollers: Array.from(entry.pollers.values()).map(p => ({
            id: p.id,
            createdAt: p.createdAt
        })),
        timers: Array.from(entry.timers.values()).map(t => ({
            id: t.id,
            createdAt: t.createdAt
        })),
        meta: { ...entry.meta }
    };
}

/**
 * Get snapshot of all registry entries grouped by projectId.
 */
export function snapshotSessionBackgroundRegistry() {
    /** @type {Record<string, Array<ReturnType<typeof getSessionBackground>>>} */
    const byProject = {};
    for (const entry of REGISTRY.values()) {
        const snap = getSessionBackground(entry.projectId, entry.sessionId);
        if (!snap) continue;
        if (!byProject[entry.projectId]) {
            byProject[entry.projectId] = [];
        }
        byProject[entry.projectId].push(snap);
    }
    return byProject;
}

/**
 * Remove all background entries for a specific session.
 * Optionally calls stop callbacks for pollers/timers.
 *
 * @param {string} projectId
 * @param {string} sessionId
 * @param {{ stop?: boolean }} [options]
 */
export function clearSessionBackground(projectId, sessionId, options) {
    const key = makeKey(projectId, sessionId);
    const entry = REGISTRY.get(key);
    if (!entry) return;
    const shouldStop = options && options.stop;

    if (shouldStop) {
        for (const item of entry.pollers.values()) {
            if (typeof item.stop === 'function') {
                try {
                    item.stop();
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('[session-background-registry] stop callback failed', e);
                }
            }
        }
        for (const item of entry.timers.values()) {
            if (typeof item.stop === 'function') {
                try {
                    item.stop();
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('[session-background-registry] stop callback failed', e);
                }
            }
        }
    }

    REGISTRY.delete(key);
}

/**
 * Clear all registry entries, optionally stopping background work.
 * Intended for tests or process shutdown.
 * @param {{ stop?: boolean }} [options]
 */
export function resetSessionBackgroundRegistry(options) {
    const shouldStop = options && options.stop;
    if (shouldStop) {
        for (const entry of REGISTRY.values()) {
            clearSessionBackground(entry.projectId, entry.sessionId, { stop: true });
        }
    }
    REGISTRY.clear();
}

/**
 * Lightweight stats view for daemon monitoring endpoints.
 */
export function getSessionBackgroundStats() {
    let sessions = 0;
    let pollers = 0;
    let timers = 0;
    /** @type {Record<SessionBackgroundStatus, number>} */
    const byStatus = {
        idle: 0,
        pending: 0,
        completed: 0,
        failed: 0
    };

    for (const entry of REGISTRY.values()) {
        sessions += 1;
        pollers += entry.pollers.size;
        timers += entry.timers.size;
        if (byStatus[entry.status] != null) {
            byStatus[entry.status] += 1;
        }
    }

    return {
        sessions,
        pollers,
        timers,
        byStatus
    };
}

