/**
 * Integrates IgnoreDetector with FileScanner.
 * Use scanWithIgnore() to scan then filter by .gitignore/.cursorignore/.a2aignore.
 */
import {IgnoreDetector} from './ignore-detector';
import type {ScanResult, FileScannerConfig} from './file-scanner';
import type {IgnoreDetectorConfig} from './ignore-detector';

export interface ScanWithIgnoreConfig extends IgnoreDetectorConfig, FileScannerConfig {
    rootPath?: string;
    projectPath?: string;
}

/**
 * Filter scan result files by IgnoreDetector.
 */
export declare function filterByIgnore(scanResult: ScanResult, ignoreDetector: IgnoreDetector): ScanResult;

/**
 * Scan directory and filter results using IgnoreDetector.
 */
export declare function scanWithIgnore(config?: ScanWithIgnoreConfig): Promise<ScanResult>;
