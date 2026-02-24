/**
 * Integrates IgnoreDetector with FileScanner (plan 4.2).
 * Use scanWithIgnore() to scan then filter by .gitignore/.cursorignore/.a2aignore.
 */

const FileScanner = require('./file-scanner');
const IgnoreDetector = require('./ignore-detector');

/**
 * Filter scan result files by IgnoreDetector. Mutates stats.skippedFiles.
 * @param {{ files: Array<{path, relativePath}>, stats: Object }} scanResult
 * @param {IgnoreDetector} ignoreDetector - must have been initialized
 * @returns {{ files: Array, stats: Object }}
 */
function filterByIgnore(scanResult, ignoreDetector) {
  if (!ignoreDetector._initialized) {
    return scanResult;
  }
  const kept = [];
  for (const file of scanResult.files) {
    if (!ignoreDetector.shouldIgnore(file.relativePath)) {
      kept.push(file);
    }
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
 * @param {Object} config - { rootPath?, projectPath?, ...FileScanner options }
 * @returns {Promise<{ files, stats, rootPath }>}
 */
async function scanWithIgnore(config = {}) {
  const rootPath = config.rootPath || config.projectPath || process.cwd();
  const scanner = new FileScanner({ ...config, rootPath });
  const detector = new IgnoreDetector({ projectPath: rootPath, ...config });
  await detector.initialize();
  const result = await scanner.scan(rootPath);
  return filterByIgnore(result, detector);
}

module.exports = {
  filterByIgnore,
  scanWithIgnore,
};
