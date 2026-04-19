/**
 * User-visible copy for invoke/session paths. Never mention proxy, Local LLM upstream, or ports — details stay in server logs.
 */
export const CLIENT_SAFE_PROCESSING_ERROR = "We couldn't complete this step. Please try again.";

export function isRetryableError(err: string): boolean {
    const s = err.toLowerCase();
    // Exclude "read timed out" / "read timeout" - LLM processing timeout, not transient
    if (/read\s+(timed?\s*out|timeout)/.test(s)) return false;
    return /fetch failed|econnrefused|etimedout|network|timeout|socket hang up/.test(s);
}

/**
 * Map upstream/network failures to a client-safe string. Non-infrastructure messages pass through.
 */
export function sanitizeErrorMessage(raw: string): string {
    const s = String(raw ?? '').trim();
    if (!s) return CLIENT_SAFE_PROCESSING_ERROR;
    const low = s.toLowerCase();
    if (low === 'fetch failed' || low === 'failed to fetch') {
        return CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (/econnrefused|connect econnrefused/i.test(s)) {
        return CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (/etimedout|timed out/i.test(s) && !/read\s+(timed?\s*out|timeout)/i.test(s)) {
        return CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (isRetryableError(s)) {
        return CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (/llm response fetch failed|^llm error:/i.test(s)) {
        return CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (/\bcompat_llm\b/i.test(s)) {
        return CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (/\b127\.0\.0\.1:\d{2,5}\b/.test(s) || /\blocalhost:\d{2,5}\b/i.test(s)) {
        return CLIENT_SAFE_PROCESSING_ERROR;
    }
    return s;
}