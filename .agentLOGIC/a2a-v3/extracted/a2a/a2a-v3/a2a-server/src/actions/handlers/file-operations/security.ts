/**
 * Path validation for sandboxed file access.
 */

import * as path from 'node:path';

export function validatePath(filePath: string): {valid: boolean; error?: string} {
    const resolved = path.resolve(filePath);
    const cwd = process.cwd();

    const allowedPrefixes = [cwd, '/tmp', '/var/tmp', process.env.HOME || ''];

    const isAllowed = allowedPrefixes.some(
        prefix => prefix && resolved.startsWith(path.resolve(prefix))
    );

    if (!isAllowed) {
        return {
            valid: false,
            error: 'Path is outside allowed directories',
        };
    }

    if (filePath.includes('\0')) {
        return {
            valid: false,
            error: 'Path contains null bytes',
        };
    }

    return {valid: true};
}
