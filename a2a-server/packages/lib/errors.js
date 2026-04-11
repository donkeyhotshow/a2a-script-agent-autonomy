"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIENT_SAFE_PROCESSING_ERROR = void 0;
exports.isRetryableError = isRetryableError;
exports.sanitizeErrorMessage = sanitizeErrorMessage;
/**
 * User-visible copy for invoke/session paths. Never mention proxy, Local LLM upstream, or ports — details stay in server logs.
 */
exports.CLIENT_SAFE_PROCESSING_ERROR = "We couldn't complete this step. Please try again.";
function isRetryableError(err) {
    var s = err.toLowerCase();
    // Exclude "read timed out" / "read timeout" - LLM processing timeout, not transient
    if (/read\s+(timed?\s*out|timeout)/.test(s))
        return false;
    return /fetch failed|econnrefused|etimedout|network|timeout|socket hang up/.test(s);
}
/**
 * Map upstream/network failures to a client-safe string. Non-infrastructure messages pass through.
 */
function sanitizeErrorMessage(raw) {
    var s = String(raw !== null && raw !== void 0 ? raw : '').trim();
    if (!s)
        return exports.CLIENT_SAFE_PROCESSING_ERROR;
    var low = s.toLowerCase();
    if (low === 'fetch failed' || low === 'failed to fetch') {
        return exports.CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (/econnrefused|connect econnrefused/i.test(s)) {
        return exports.CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (/etimedout|timed out/i.test(s) && !/read\s+(timed?\s*out|timeout)/i.test(s)) {
        return exports.CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (isRetryableError(s)) {
        return exports.CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (/llm response fetch failed|^llm error:/i.test(s)) {
        return exports.CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (/\bcompat_llm\b/i.test(s)) {
        return exports.CLIENT_SAFE_PROCESSING_ERROR;
    }
    if (/\b127\.0\.0\.1:\d{2,5}\b/.test(s) || /\blocalhost:\d{2,5}\b/i.test(s)) {
        return exports.CLIENT_SAFE_PROCESSING_ERROR;
    }
    return s;
}
