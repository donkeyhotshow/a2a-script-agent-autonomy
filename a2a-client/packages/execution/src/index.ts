/**
 * @a2a/fs-utils - File system utilities for A2A
 */

import {IgnoreDetector} from './ignore-detector.js';
import {GlobMatcher} from './glob-matcher.js';
import {FileScanner} from './file-scanner.js';
import type {IgnoreDetectorConfig} from './ignore-detector.js';
import type {FileScannerConfig} from './file-scanner.js';

export {IgnoreDetector, GlobMatcher, FileScanner};
export {filterByIgnore, scanWithIgnore} from './file-scanner.ignore.js';
export {readFileForResult, writeFileForResult, listDirectoryForResult} from './protocol-result.js';
export type {ScanResult, ScannedFile, ScanStats, FileScannerConfig} from './file-scanner.js';
export type {IgnoreDetectorConfig, ScanEntry} from './ignore-detector.js';
export type {ScanWithIgnoreConfig} from './file-scanner.ignore.js';
export type {ReadFileResult, WriteFileResult, ListDirectoryEntry, ListDirectoryResult} from './protocol-result.js';

export function createIgnoreDetector(config?: IgnoreDetectorConfig): IgnoreDetector {
    return new IgnoreDetector(config);
}

export function createGlobMatcher(patterns: string | string[]): GlobMatcher {
    return new GlobMatcher(patterns);
}

export function createFileScanner(config?: FileScannerConfig): FileScanner {
    return new FileScanner(config);
}

export function matchGlob(pattern: string | string[], path: string): boolean {
    return GlobMatcher.match(pattern, path);
}

export async function scanFiles(dir: string, options?: FileScannerConfig): Promise<import('./file-scanner.js').ScanResult> {
    return FileScanner.scan(dir, options ?? {});
}
