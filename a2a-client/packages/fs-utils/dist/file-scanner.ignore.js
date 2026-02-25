"use strict";
/**
 * Integrates IgnoreDetector with FileScanner.
 * Use scanWithIgnore() to scan then filter by .gitignore/.cursorignore/.a2aignore.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterByIgnore = filterByIgnore;
exports.scanWithIgnore = scanWithIgnore;
const file_scanner_1 = require("./file-scanner");
const ignore_detector_1 = require("./ignore-detector");
/**
 * Filter scan result files by IgnoreDetector.
 */
function filterByIgnore(scanResult, ignoreDetector) {
    if (!ignoreDetector.initialized) {
        return scanResult;
    }
    const kept = [];
    for (const file of scanResult.files) {
        if (!ignoreDetector.shouldIgnore(file.relativePath))
            kept.push(file);
    }
    const skipped = scanResult.files.length - kept.length;
    return {
        files: kept,
        stats: { ...scanResult.stats, skippedFiles: scanResult.stats.skippedFiles + skipped },
        rootPath: scanResult.rootPath,
    };
}
/**
 * Scan directory and filter results using IgnoreDetector.
 */
async function scanWithIgnore(config = {}) {
    const rootPath = config.rootPath ?? config.projectPath ?? process.cwd();
    const scanner = new file_scanner_1.FileScanner({ ...config, rootPath });
    const detector = new ignore_detector_1.IgnoreDetector({ projectPath: rootPath, ...config });
    await detector.initialize();
    const result = await scanner.scan(rootPath);
    return filterByIgnore(result, detector);
}
