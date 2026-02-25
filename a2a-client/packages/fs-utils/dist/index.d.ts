/**
 * @a2a/fs-utils - File system utilities for A2A
 */
import { IgnoreDetector } from './ignore-detector';
import { GlobMatcher } from './glob-matcher';
import { FileScanner } from './file-scanner';
import type { IgnoreDetectorConfig } from './ignore-detector';
import type { FileScannerConfig } from './file-scanner';
export { IgnoreDetector, GlobMatcher, FileScanner };
export { filterByIgnore, scanWithIgnore } from './file-scanner.ignore';
export type { ScanResult, ScannedFile, ScanStats, FileScannerConfig } from './file-scanner';
export type { IgnoreDetectorConfig, ScanEntry } from './ignore-detector';
export type { ScanWithIgnoreConfig } from './file-scanner.ignore';
export declare function createIgnoreDetector(config?: IgnoreDetectorConfig): IgnoreDetector;
export declare function createGlobMatcher(patterns: string | string[]): GlobMatcher;
export declare function createFileScanner(config?: FileScannerConfig): FileScanner;
export declare function matchGlob(pattern: string | string[], path: string): boolean;
export declare function scanFiles(dir: string, options?: FileScannerConfig): Promise<import('./file-scanner').ScanResult>;
