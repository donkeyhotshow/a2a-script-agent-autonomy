const path = require('path');
const fs = require('fs');
const fileOperationsFactory = require('../../../../system/file-operations');
const { FileSystemPathUtils } = require('../../../../system/file-operations/src/FileSystemPathUtils.cjs');
const { defaultLogger } = require('../../../../logging-monitoring/logging'); // Import defaultLogger

// Check feature flag
let useSystemFileOps = false;
try {
  const configPath = path.resolve(__dirname, '../../../../config-unified/settings/config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    useSystemFileOps = config.featureFlags?.USE_SYSTEM_FILE_OPS || false;
  }
} catch (error) {
  // Feature flag not found, default to false
}

if (useSystemFileOps) {
  // New unified implementation
  class FileSystemUtilsWrapper {
    constructor(logger = defaultLogger) { // Use defaultLogger
      this.logger = logger;
      this.fileOps = fileOperationsFactory(this.logger); // Get instance from factory
      this.pathUtils = new FileSystemPathUtils(this.logger); // Direct access to path utils
      this.defaultEncoding = 'utf8'; // Keep for compatibility
      this.PROJECT_DIRS = {
        SRC: 'src',
        CONFIG: 'config',
        STORAGE: 'storage',
        LOGS: 'logs',
        TESTS: 'tests',
        API: 'api',
        TEMPLATES: path.join('src', 'server', 'data', 'templates'),
        IMAGES: 'images',
      }; // Keep for compatibility
    }

    // PathUtils methods delegation
    normalizePath(filePath) {
      return this.pathUtils.normalizePath(filePath);
    }

    safeChdir(directory) {
      defaultLogger.warn('[FileSystemUtilsWrapper] safeChdir might not be directly supported by system/file-operations.'); // Use defaultLogger
      try {
        process.chdir(directory);
        return true;
      } catch (error) {
        defaultLogger.error(`Failed to change directory to ${directory}: ${error.message}`); // Use defaultLogger
        return false;
      }
    }

    hasUrlEncoding(urlPath) {
      // This is a utility function, not directly related to file ops. Keep original.
      return decodeURIComponent(urlPath) !== urlPath;
    }

    logPathIssue(problematicPath, errorMessage) {
      defaultLogger.error(`Path issue detected: ${problematicPath} - ${errorMessage}`); // Use defaultLogger
    }

    getRelativePath(absolutePath, projectRoot) {
      return this.pathUtils.relativePath(projectRoot, absolutePath);
    }

    getAbsolutePath(relativePath, projectRoot) {
      return this.pathUtils.joinPath(projectRoot, relativePath);
    }

    // FileSystemBasicOperations delegation
    async exists(filePath) {
      const result = await this.fileOps.getStats(filePath);
      return result.success;
    }

    async readFile(filePath, encoding = this.defaultEncoding) {
      const result = await this.fileOps.readFile(filePath, { encoding });
      if (result.success) {
        return result.content;
      } else {
        defaultLogger.error(`Error reading file ${filePath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async writeFile(filePath, data, encoding = this.defaultEncoding) {
      const result = await this.fileOps.writeFile(filePath, data, { encoding });
      if (!result.success) {
        defaultLogger.error(`Error writing file ${filePath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async appendFile(filePath, data, encoding = this.defaultEncoding) {
      const result = await this.fileOps.writeFile(filePath, data, { encoding, mode: 'append' });
      if (!result.success) {
        defaultLogger.error(`Error appending to file ${filePath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async getFileSize(filePath) {
      const result = await this.fileOps.getStats(filePath);
      if (result.success) {
        return result.stats.size;
      } else {
        defaultLogger.error(`Error getting file size for ${filePath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async getLastModified(filePath) {
      const result = await this.fileOps.getStats(filePath);
      if (result.success) {
        return result.stats.mtime;
      } else {
        defaultLogger.error(`Error getting last modified time for ${filePath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async getFiles(dirPath, pattern = null) {
      const result = await this.fileOps.listDirectory(dirPath);
      if (result.success) {
        let files = result.entries.filter(entry => entry.type === 'file').map(entry => entry.name);
        if (pattern) {
          const regex = new RegExp(pattern);
          files = files.filter((file) => regex.test(file));
        }
        return files;
      } else {
        defaultLogger.error(`Error getting files from directory ${dirPath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async getDirectories(dirPath) {
      const result = await this.fileOps.listDirectory(dirPath);
      if (result.success) {
        return result.entries.filter(entry => entry.type === 'dir').map(entry => entry.name);
      } else {
        defaultLogger.error(`Error getting directories from ${dirPath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async copyFile(source, destination) {
      const result = await this.fileOps.copyPath(source, destination);
      if (!result.success) {
        defaultLogger.error(`Error copying file from ${source} to ${destination}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async moveFile(source, destination) {
      const result = await this.fileOps.movePath(source, destination);
      if (!result.success) {
        defaultLogger.error(`Error moving file from ${source} to ${destination}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async deleteFile(filePath, recursive = false) {
      const options = recursive ? { recursive: true, force: true } : {};
      const result = await this.fileOps.deletePath(filePath, options);
      if (!result.success) {
        defaultLogger.error(`Error deleting file/directory ${filePath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async ensureDir(dirPath) {
      const result = await this.fileOps.ensureDir(dirPath, { recursive: true });
      if (result.success || result.error.code === 'EEXIST') {
        return true;
      } else {
        defaultLogger.error(`Error creating directory ${dirPath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    getExtension(filePath) {
      return this.pathUtils.extname(filePath);
    }

    getBasename(filePath) {
      return this.pathUtils.basename(filePath, this.pathUtils.extname(filePath));
    }

    getFilename(filePath) {
      return this.pathUtils.basename(filePath);
    }

    getDirname(filePath) {
      return this.pathUtils.dirname(filePath);
    }

    normalize(filePath) {
      return this.pathUtils.normalizePath(filePath);
    }

    join(...paths) {
      return this.pathUtils.joinPath(...paths);
    }

    resolve(...paths) {
      return this.pathUtils.resolvePath(...paths);
    }

    isAbsolute(filePath) {
      return this.pathUtils.isAbsolutePath(filePath);
    }

    createProjectPaths(projectRoot) {
      // This is project-specific logic, keep it as is or refactor into a dedicated utility
      return {
        PROJECT_ROOT: projectRoot,
        SRC_DIR: this.join(projectRoot, this.PROJECT_DIRS.SRC),
        CONFIG_DIR: this.join(projectRoot, this.PROJECT_DIRS.CONFIG),
        STORAGE_DIR: this.join(projectRoot, this.PROJECT_DIRS.STORAGE),
        LOGS_DIR: this.join(projectRoot, this.PROJECT_DIRS.LOGS),
        TESTS_DIR: this.join(projectRoot, this.PROJECT_DIRS.TESTS),
        API_DIR: this.join(projectRoot, this.PROJECT_DIRS.API),
        TEMPLATES_DIR: this.join(projectRoot, this.PROJECT_DIRS.TEMPLATES),
        IMAGES_DIR: this.join(projectRoot, this.PROJECT_DIRS.IMAGES),
        PACKAGE_JSON: this.join(projectRoot, 'package.json'),
        README: this.join(projectRoot, 'README.md'),
      };
    }

    createPathGenerator(projectRoot) {
      const paths = this.createProjectPaths(projectRoot);

      return {
        getSrcPath: (filename) => this.join(paths.SRC_DIR, filename),
        getConfigPath: (filename) => this.join(paths.CONFIG_DIR, filename),
        getStoragePath: (filename) => this.join(paths.STORAGE_DIR, filename),
        getLogsPath: (filename) => this.join(paths.LOGS_DIR, filename),
        getTestsPath: (filename) => this.join(paths.TESTS_DIR, filename),
        getAPIPath: (filename) => this.join(paths.API_DIR, filename),
        getTemplatesPath: (filename) => this.join(paths.TEMPLATES_DIR, filename),
        getImagesPath: (filename) => this.join(paths.IMAGES_DIR, filename),
        ...paths,
      };
    }

    async readdir(dirPath, options) {
      const result = await this.fileOps.listDirectory(dirPath);
      if (result.success) {
        return result.entries.map(entry => entry.name); // Return only names for readdir compatibility
      } else {
        defaultLogger.error(`Error reading directory ${dirPath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async stat(filePath) {
      const result = await this.fileOps.getStats(filePath);
      if (result.success) {
        return result.stats;
      } else {
        defaultLogger.error(`Error getting stats for ${filePath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async readFileJson(filePath) {
      const content = await this.readFile(filePath);
      return JSON.parse(content.toString());
    }

    async readDirectory(dirPath) {
      const result = await this.fileOps.listDirectory(dirPath, { withFileTypes: true });
      if (result.success) {
        return result.entries.map((file) => ({
          name: file.name,
          isFile: file.type === 'file',
          isDirectory: file.type === 'dir',
        }));
      } else {
        defaultLogger.error(`Error reading directory ${dirPath}: ${result.error}`); // Use defaultLogger
        throw new Error(result.error);
      }
    }

    async removeDirectory(dirPath) {
      return this.deleteFile(dirPath, true);
    }

    async getDirectoryContents(directoryPath, options = {}) {
      const { filter = () => true, includeStats = false, recursive = false } = options;
      const contents = [];

      const exists = await this.exists(directoryPath);
      if (!exists) {
        return contents;
      }

      const result = await this.fileOps.listDirectory(directoryPath, { recursive: recursive });
      if (!result.success) {
        defaultLogger.warn(`Ошибка при чтении директории ${directoryPath}:`, result.error); // Use defaultLogger
        return contents;
      }

      for (const entry of result.entries) {
        try {
          const statsResult = await this.fileOps.getStats(entry.path);
          if (statsResult.success) {
            const stats = statsResult.stats;
            if (filter(entry.name, stats, entry.path)) {
              const itemPath = entry.path; // Already full path
              const entryData = {
                name: entry.name,
                path: itemPath,
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                stats: includeStats ? stats : undefined,
              };
              contents.push(entryData);
            }
          }
        } catch (error) {
          defaultLogger.warn(`Ошибка при чтении ${entry.path}:`, error.message); // Use defaultLogger
        }
      }

      return contents;
    }

  }

  module.exports = { FileSystemUtils: FileSystemUtilsWrapper };

} else {
  // Old implementation
  module.exports = require('./index.old.js').FileSystemUtils;
}
