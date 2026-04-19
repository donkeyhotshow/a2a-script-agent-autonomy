export type PathAccessErrorMeta = {
    filePath: string;
    code?: string;
    error: string;
};
/**
 * True if fs.access succeeds. ENOENT → false (no callback).
 * Other errors → optional callback when `code` is set and not ENOENT, then false.
 */
export declare function pathIsAccessible(filePath: string, onNonEnoent?: (meta: PathAccessErrorMeta) => void): Promise<boolean>;
export declare function timestampedBackupPath(fullPath: string): string;
//# sourceMappingURL=fs-access.d.ts.map