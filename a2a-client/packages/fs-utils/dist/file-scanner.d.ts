/**
 * File Scanner - scan directories with include/exclude patterns
 */
export interface FileScannerConfig {
    rootPath?: string;
    includePatterns?: string[];
    excludePatterns?: string[];
    maxDepth?: number;
    maxFiles?: number;
    onProgress?: (info: {
        type: string;
        path: string;
        stats: ScanStats;
    }) => void;
}
export interface ScanStats {
    totalFiles: number;
    totalDirs: number;
    skippedDirs: number;
    skippedFiles: number;
    errors: Array<{
        path: string;
        error: string;
    }>;
}
export interface ScannedFile {
    path: string;
    relativePath: string;
    name: string;
    ext: string;
}
export interface ScanResult {
    files: ScannedFile[];
    stats: ScanStats;
    rootPath: string;
}
export declare class FileScanner {
    rootPath: string;
    includePatterns: string[];
    excludePatterns: string[];
    maxDepth: number;
    maxFiles: number;
    onProgress: FileScannerConfig['onProgress'];
    private includeMatcher;
    private excludeMatcher;
    constructor(config?: FileScannerConfig);
    scan(dir?: string, options?: FileScannerConfig): Promise<ScanResult>;
    private walkDirectory;
    shouldIncludeFile(relativePath: string): boolean;
    shouldExcludeFile(relativePath: string): boolean;
    shouldExcludeDir(relativePath: string): boolean;
    static scan(dir: string, options?: FileScannerConfig): Promise<ScanResult>;
    scanByExtension(dir: string, extensions: string | string[]): Promise<ScanResult>;
}
