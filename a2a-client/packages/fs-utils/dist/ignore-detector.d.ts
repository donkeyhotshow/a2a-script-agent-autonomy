/**
 * Ignore Detector - Detects and parses IDE ignore files
 * Supports .gitignore, .cursorignore, .a2aignore and custom ignore files
 */
export interface IgnoreDetectorConfig {
    projectPath?: string;
    customIgnoreFiles?: string[];
    additionalPatterns?: string[];
}
interface IgnorePattern {
    pattern: string;
    isNegation: boolean;
    isDir: boolean;
    isRootAnchored: boolean;
    source: string;
    originalPattern?: string;
}
interface IgnoreFileFound {
    name: string;
    path: string;
    patterns: number;
}
export interface ScanEntry {
    name: string;
    path: string;
    type: string;
}
export declare class IgnoreDetector {
    projectPath: string;
    customIgnoreFiles: string[];
    additionalPatterns: string[];
    ignorePatterns: IgnorePattern[];
    ignoreFilesFound: IgnoreFileFound[];
    private _initialized;
    get initialized(): boolean;
    constructor(config?: IgnoreDetectorConfig);
    initialize(): Promise<this>;
    private _scanForIgnoreFiles;
    private _isCommonIgnoredDir;
    private _parseIgnoreFile;
    shouldIgnore(relativePath: string): boolean;
    private _matchComponent;
    private _matchPattern;
    getIgnoreFiles(): IgnoreFileFound[];
    getPatterns(): IgnorePattern[];
    getDirectoriesToSkip(): string[];
    filterEntries(entries: ScanEntry[]): ScanEntry[];
    shouldSkipDirectory(dirName: string, parentPath?: string): boolean;
    addPatterns(patterns: string[] | string): void;
}
export {};
