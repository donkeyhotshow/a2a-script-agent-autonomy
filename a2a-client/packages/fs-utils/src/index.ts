/**
 * @a2a/fs-utils - File system utilities for A2A
 */

import {IgnoreDetector} from './ignore-detector';
import {GlobMatcher} from './glob-matcher';
import {FileScanner} from './file-scanner';
import type {IgnoreDetectorConfig} from './ignore-detector';
import type {FileScannerConfig} from './file-scanner';

export {IgnoreDetector, GlobMatcher, FileScanner};
export {filterByIgnore, scanWithIgnore} from './file-scanner.ignore';
export {readFileForResult, writeFileForResult, listDirectoryForResult} from './protocol-result';
export type {ScanResult, ScannedFile, ScanStats, FileScannerConfig} from './file-scanner';
export type {IgnoreDetectorConfig, ScanEntry} from './ignore-detector';
export type {ScanWithIgnoreConfig} from './file-scanner.ignore';
export type {ReadFileResult, WriteFileResult, ListDirectoryEntry, ListDirectoryResult} from './protocol-result';

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

export async function scanFiles(dir: string, options?: FileScannerConfig): Promise<import('./file-scanner').ScanResult> {
    return FileScanner.scan(dir, options ?? {});
}
