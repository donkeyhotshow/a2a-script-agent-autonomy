export type PathAccessErrorMeta = {
    filePath: string;
    code?: string;
    error: string;
};
export declare function pathIsAccessible(filePath: string, onNonEnoent?: (meta: PathAccessErrorMeta) => void): Promise<boolean>;
export declare function timestampedBackupPath(fullPath: string): string;
//# sourceMappingURL=fs-access.d.ts.map