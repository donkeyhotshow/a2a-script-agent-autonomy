/**
 * Validate that a resolved path is strictly contained within a root directory.
 * Prevents path traversal attacks (CWE-22/23).
 *
 * @param filePath - Path to validate
 * @param rootPath - Allowed root directory
 * @returns Resolved absolute file path
 * @throws Error if path is outside root directory
 */
export declare function assertPathContained(filePath: string, rootPath: string): string;
//# sourceMappingURL=path-containment.d.ts.map