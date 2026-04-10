import * as fs from 'node:fs/promises';
/**
 * True if fs.access succeeds. ENOENT → false (no callback).
 * Other errors → optional callback when `code` is set and not ENOENT, then false.
 */
export async function pathIsAccessible(filePath, onNonEnoent) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch (err) {
        const code = err?.code;
        if (code === 'ENOENT')
            return false;
        if (code && code !== 'ENOENT') {
            onNonEnoent?.({
                filePath,
                code,
                error: err instanceof Error ? err.message : String(err),
            });
        }
        return false;
    }
}
export function timestampedBackupPath(fullPath) {
    return `${fullPath}.backup-${Date.now()}`;
}
//# sourceMappingURL=fs-access.js.map