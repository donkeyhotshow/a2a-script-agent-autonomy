/**
 * @a2a/fs-utils
 * 
 * Общие утилиты для работы с файловой системой
 */

const IgnoreDetector = require('./ignore-detector');
const GlobMatcher = require('./glob-matcher');
const FileScanner = require('./file-scanner');

module.exports = {
  IgnoreDetector,
  GlobMatcher,
  FileScanner,
  
  // Convenience functions
  createIgnoreDetector: (config) => new IgnoreDetector(config),
  createGlobMatcher: (patterns) => new GlobMatcher(patterns),
  createFileScanner: (config) => new FileScanner(config),
  
  // Direct functions
  matchGlob: (pattern, path) => GlobMatcher.match(pattern, path),
  scanFiles: async (dir, options) => FileScanner.scan(dir, options)
};
