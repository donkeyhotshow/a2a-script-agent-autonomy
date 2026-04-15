import path from 'node:path';

/**
 * Resolve a relative path under a project root; reject traversal outside the root.
 * @param {string} projectPath
 * @param {string} rel
 * @returns {string|null} absolute path or null
 */
export function resolveUnderProjectRoot(projectPath, rel) {
    if (typeof rel !== 'string' || !rel.trim()) {
        return null;
    }
    if (typeof projectPath !== 'string' || !projectPath.trim()) {
        return null;
    }
    const root = path.resolve(projectPath);
    const abs = path.resolve(root, rel);
    const normRoot = root.endsWith(path.sep) ? root : root + path.sep;
    if (abs !== root && !abs.startsWith(normRoot)) {
        return null;
    }
    return abs;
}

/** Namespace-style helper used by kernel / tooling; prefer {@link resolveUnderProjectRoot} for tree-shaking. */
export class PathSandbox {
    static resolveUnderProjectRoot = resolveUnderProjectRoot;

    resolveUnderProjectRoot(projectPath: string, rel: string) {
        return resolveUnderProjectRoot(projectPath, rel);
    }
}
