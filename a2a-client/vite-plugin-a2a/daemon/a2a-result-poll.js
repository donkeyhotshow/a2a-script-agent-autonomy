/**
 * Client API daemon — poll A2A Server `/api/v1/requests/:id/result` until terminal state.
 * Single place for completion rules used by step routes, proxy, and server-proxy service.
 */

function defaultBaseUrl() {
    return process.env.A2A_SERVER_URL || 'http://localhost:3000';
}

/** @param {{ data?: { status?: string, execute?: unknown } }} pollJson */
export function isA2AResultCompleted(pollJson) {
    const d = pollJson?.data;
    if (!d) return false;
    return d.status === 'completed' || d.status === 'done' || d.execute != null;
}

/** @param {{ data?: { status?: string, error?: unknown } }} pollJson */
export function isA2AResultFailed(pollJson) {
    const d = pollJson?.data;
    if (!d) return false;
    return d.status === 'failed' || d.status === 'error';
}

/**
 * @param {string} promiseId
 * @param {object} [options]
 * @param {string} [options.baseUrl]
 * @param {number} [options.maxPolls=30]
 * @param {number} [options.intervalMs=1000]
 * @param {Record<string, string>} [options.headers]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(i: number, pollJson: unknown) => void} [options.onProgress]
 * @returns {Promise<{ outcome: 'completed', data: object } | { outcome: 'failed', data: object } | { outcome: 'timeout' }>}
 */
export async function pollA2ARequestResult(promiseId, options = {}) {
    const {
        baseUrl = defaultBaseUrl(),
        maxPolls = 30,
        intervalMs = 1000,
        headers = {},
        fetchImpl = globalThis.fetch,
        onProgress,
    } = options;

    if (typeof fetchImpl !== 'function') {
        throw new Error('pollA2ARequestResult: fetch is not available');
    }

    const root = String(baseUrl).replace(/\/$/, '');
    const url = `${root}/api/v1/requests/${encodeURIComponent(promiseId)}/result`;

    for (let i = 0; i < maxPolls; i++) {
        await new Promise((r) => setTimeout(r, intervalMs));
        try {
            const pollRes = await fetchImpl(url, { method: 'GET', headers });
            const pollData = await pollRes.json();
            if (onProgress) onProgress(i, pollData);
            if (isA2AResultCompleted(pollData)) {
                return { outcome: 'completed', data: pollData.data };
            }
            if (isA2AResultFailed(pollData)) {
                return { outcome: 'failed', data: pollData.data };
            }
        } catch (e) {
            console.error('[pollA2ARequestResult] Poll error:', e?.message || e);
        }
    }
    return { outcome: 'timeout' };
}
