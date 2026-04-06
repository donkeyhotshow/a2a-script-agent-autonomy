import path from 'path';

/**
 * Resolve subPath under base; return null if the result escapes base (path traversal).
 * Uses a trailing-separator prefix so `/a/b` does not falsely allow `/a/bc`.
 * @param {string} base
 * @param {string} subPath
 * @returns {string | null}
 */
export function safePath(base, subPath) {
    const resolved = path.resolve(base, subPath);
    const baseResolved = path.resolve(base);
    const prefix = baseResolved.endsWith(path.sep) ? baseResolved : baseResolved + path.sep;
    if (resolved !== baseResolved && !resolved.startsWith(prefix)) return null;
    return resolved;
}
