import * as path from 'node:path';
/**
 * Validate that a resolved path is strictly contained within a root directory.
 * Prevents path traversal attacks (CWE-22/23).
 *
 * @param filePath - Path to validate
 * @param rootPath - Allowed root directory
 * @returns Resolved absolute file path
 * @throws Error if path is outside root directory
 */
export function assertPathContained(filePath, rootPath) {
    const resolvedPath = path.resolve(filePath);
    const resolvedRoot = path.resolve(rootPath);
    if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
        throw new Error(`Path traversal detected: ${filePath}`);
    }
    return resolvedPath;
}
//# sourceMappingURL=path-containment.js.map