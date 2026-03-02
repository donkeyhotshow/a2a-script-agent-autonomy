/**
 * Integrates IgnoreDetector with FileScanner.
 * Use scanWithIgnore() to scan then filter by .gitignore/.cursorignore/.a2aignore.
 */

import {FileScanner} from './file-scanner';
import {IgnoreDetector} from './ignore-detector';
import type {ScanResult, ScannedFile, FileScannerConfig} from './file-scanner';
import type {IgnoreDetectorConfig} from './ignore-detector';

export interface ScanWithIgnoreConfig extends IgnoreDetectorConfig, FileScannerConfig {
    rootPath?: string;
    projectPath?: string;
}

/**
 * Filter scan result files by IgnoreDetector.
 */
export function filterByIgnore(
    scanResult: ScanResult,
    ignoreDetector: IgnoreDetector
): ScanResult {
    if (!ignoreDetector.initialized) {
        return scanResult;
    }
    const kept: ScannedFile[] = [];
    for (const file of scanResult.files) {
        if (!ignoreDetector.shouldIgnore(file.relativePath)) kept.push(file);
    }
    const skipped = scanResult.files.length - kept.length;
    return {
        files: kept,
        stats: {...scanResult.stats, skippedFiles: scanResult.stats.skippedFiles + skipped},
        rootPath: scanResult.rootPath,
    };
}

/**
 * Scan directory and filter results using IgnoreDetector.
 */
export async function scanWithIgnore(config: ScanWithIgnoreConfig = {}): Promise<ScanResult> {
    const rootPath = config.rootPath ?? config.projectPath ?? process.cwd();
    const scanner = new FileScanner({...config, rootPath});
    const detector = new IgnoreDetector({projectPath: rootPath, ...config});
    await detector.initialize();
    const result = await scanner.scan(rootPath);
    return filterByIgnore(result, detector);
}
