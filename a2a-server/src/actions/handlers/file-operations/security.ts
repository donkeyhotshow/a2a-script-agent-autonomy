/**
 * Path validation for sandboxed file access.
 */

import * as path from 'node:path';

export function validatePath(filePath: string): {valid: boolean; error?: string} {
    if (filePath.includes('\0')) {
        return {
            valid: false,
            error: 'Path contains null bytes',
        };
    }

    const resolved = path.resolve(filePath);
    const cwd = process.cwd();

    const allowedPrefixes = [cwd, '/tmp', '/var/tmp', process.env.HOME || ''];

    const isAllowed = allowedPrefixes.some(
        prefix => {
            if (!prefix) return false;
            const prefixResolved = path.resolve(prefix);
            // Add trailing separator if not present to prevent /tmp from matching /tmp2
            const prefixWithSeparator = prefixResolved.endsWith(path.sep) ? prefixResolved : prefixResolved + path.sep;
            return resolved === prefixResolved || resolved.startsWith(prefixWithSeparator);
        }
    );

    if (!isAllowed) {
        return {
            valid: false,
            error: 'Path is outside allowed directories',
        };
    }

    return {valid: true};
}
