import * as fs from "node:fs/promises";
export async function pathIsAccessible(filePath, onNonEnoent) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch (err) {
        const code = err?.code;
        if (code === "ENOENT")
            return false;
        if (code && code !== "ENOENT") {
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