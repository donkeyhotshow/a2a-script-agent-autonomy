/**
 * File Utils - утилиты для работы с файловой системой
 */

const fileOperationsFactory = require('../../system/file-operations');
const { defaultLogger } = require('../../logging-monitoring/logging'); // Import defaultLogger

const logger = defaultLogger; // Use defaultLogger
const fileOps = fileOperationsFactory(logger);

module.exports = {
  FileManager: fileOps,
  FileSystemUtils: fileOps,
  // Expose specific methods for direct access if needed, e.g.:
  readFile: fileOps.readFile,
  writeFile: fileOps.writeFile,
  deletePath: fileOps.deletePath,
  listDirectory: fileOps.listDirectory,
  getStats: fileOps.getStats,
  ensureDir: fileOps.ensureDir,
  // Also expose path utilities directly from the fileOps instance
  join: fileOps.join,
  resolve: fileOps.resolve,
  dirname: fileOps.dirname,
  extname: fileOps.extname,
  basename: fileOps.basename,
  normalizePath: fileOps.normalizePath,
  isAbsolutePath: fileOps.isAbsolutePath,
};
