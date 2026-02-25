import path from 'path';
import { initializeFsModules } from './browser-stubs.mjs';
import { isBrowser, APP_ROOT } from './path-constants.js';
import FileOperations from './file-operations.js';

// Initialize fs modules once globally
const { fsPromises, fsSync } = initializeFsModules();

class PathUtils {
  constructor(logger = console) {
    this.logger = logger;
    this.fileOps = new FileOperations(fsPromises, fsSync, logger);
    this.APP_ROOT = APP_ROOT;
    this.isBrowser = isBrowser;
  }

  resolve(...args) {
    if (this.isBrowser) {
      return args.join('/').replace(/\\/g, '/');
    } else {
      return path.resolve(...args);
    }
  }

  join(...args) {
    if (this.isBrowser) {
      return args.join('/').replace(/\\/g, '/');
    } else {
      return path.join(...args);
    }
  }

  dirname(filePath) { return this.fileOps.dirname(filePath); }
  basename(filePath, ext) { return this.fileOps.basename(filePath, ext); }
  extname(filePath) { return this.fileOps.extname(filePath); }
  isAbsolute(filePath) { return this.fileOps.isAbsolute(filePath); }
  relative(from, to) { return this.fileOps.relative(from, to); }
  normalize(filePath) { return this.fileOps.normalize(filePath); }
}

export default PathUtils;
