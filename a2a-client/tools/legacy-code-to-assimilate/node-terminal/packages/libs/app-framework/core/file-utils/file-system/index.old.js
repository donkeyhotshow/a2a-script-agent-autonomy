const fs = require('fs').promises;
const path = require('path');

class FileSystemUtils {
  constructor(logger = console) {
    this.logger = logger;
    this.defaultEncoding = 'utf8';
    this.PROJECT_DIRS = {
      SRC: 'src',
      CONFIG: 'config',
      STORAGE: 'storage',
      LOGS: 'logs',
      TESTS: 'tests',
      API: 'api',
      TEMPLATES: path.join('src', 'server', 'data', 'templates'),
      IMAGES: 'images',
    };
  }

  // Методы PathUtils
  normalizePath(filePath) {
    let normalized = path.normalize(filePath);
    if (normalized.length > 1 && normalized.endsWith(path.sep) && path.parse(normalized).root !== normalized) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  safeChdir(directory) {
    try {
      process.chdir(directory);
      return true;
    } catch (error) {
      this.logger.error(`Failed to change directory to ${directory}: ${error.message}`);
      return false;
    }
  }

  hasUrlEncoding(urlPath) {
    return decodeURIComponent(urlPath) !== urlPath;
  }

  logPathIssue(problematicPath, errorMessage) {
    this.logger.error(`Path issue detected: ${problematicPath} - ${errorMessage}`);
  }

  getRelativePath(absolutePath, projectRoot) {
    return path.relative(projectRoot, absolutePath);
  }

  getAbsolutePath(relativePath, projectRoot) {
    return path.join(projectRoot, relativePath);
  }

  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      this.logger.debug(`File does not exist or is inaccessible: ${filePath}`);
      return false;
    }
  }

  async readFile(filePath, encoding = this.defaultEncoding) {
    try {
      return await fs.readFile(filePath, encoding);
    } catch (error) {
      this.logger.error(`Error reading file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async writeFile(filePath, data, encoding = this.defaultEncoding) {
    try {
      await fs.writeFile(filePath, data, encoding);
    } catch (error) {
      this.logger.error(`Error writing file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async appendFile(filePath, data, encoding = this.defaultEncoding) {
    try {
      await fs.appendFile(filePath, data, encoding);
    } catch (error) {
      this.logger.error(`Error appending to file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      this.logger.error(`Error getting file size for ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async getLastModified(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime;
    } catch (error) {
      this.logger.error(`Error getting last modified time for ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async getFiles(dirPath, pattern = null) {
    try {
      const files = await fs.readdir(dirPath);

      if (pattern) {
        const regex = new RegExp(pattern);
        return files.filter((file) => regex.test(file));
      }

      return files;
    } catch (error) {
      this.logger.error(`Error getting files from directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  async getDirectories(dirPath) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      return items
        .filter((item) => item.isDirectory())
        .map((item) => item.name);
    } catch (error) {
      this.logger.error(`Error getting directories from ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  async copyFile(source, destination) {
    try {
      await fs.copyFile(source, destination);
    } catch (error) {
      this.logger.error(`Error copying file from ${source} to ${destination}: ${error.message}`);
      throw error;
    }
  }

  async moveFile(source, destination) {
    try {
      await fs.rename(source, destination);
    } catch (error) {
      this.logger.error(`Error moving file from ${source} to ${destination}: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(filePath, recursive = false) {
    try {
      if (recursive) {
        await fs.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.unlink(filePath);
      }
    } catch (error) {
      this.logger.error(`Error deleting file/directory ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') {
        return true;
      }
      this.logger.error(`Error creating directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  getExtension(filePath) {
    return path.extname(filePath);
  }

  getBasename(filePath) {
    return path.basename(filePath, path.extname(filePath));
  }

  getFilename(filePath) {
    return path.basename(filePath);
  }

  getDirname(filePath) {
    return path.dirname(filePath);
  }

  normalize(filePath) {
    return path.normalize(filePath);
  }

  join(...paths) {
    return path.join(...paths);
  }

  resolve(...paths) {
    return path.resolve(...paths);
  }

  isAbsolute(filePath) {
    return path.isAbsolute(filePath);
  }

  createProjectPaths(projectRoot) {
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
    try {
      return await fs.readdir(dirPath, options);
    } catch (error) {
      this.logger.error(`Error reading directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  async stat(filePath) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      this.logger.error(`Error getting stats for ${filePath}: ${error.message}`);
      throw error;
    }
  }

  // Методы FileUtils, использующие внутренние методы PathUtils
  async readFileJson(filePath) {
    const fileContent = await this.readFile(filePath);
    return JSON.parse(fileContent.toString());
  }

  async readDirectory(dirPath) {
    const files = await this.readdir(dirPath, { withFileTypes: true });
    return files.map((file) => ({
      name: file.name,
      isFile: file.isFile(),
      isDirectory: file.isDirectory(),
    }));
  }

  async removeDirectory(dirPath) {
    return this.deleteFile(dirPath, true);
  }

  async deleteFile(filePath, isDirectory = false) {
    try {
      if (isDirectory) {
        await fs.rmdir(filePath, { recursive: true });
      } else {
        await fs.unlink(filePath);
      }
    } catch (error) {
      this.logger.error(`Error deleting ${isDirectory ? 'directory' : 'file'} ${filePath}: ${error.message}`);
      throw error;
    }
  }

  // Методы из directory-scanner.js
  async getDirectoryContents(directoryPath, options = {}) {
    const { filter = () => true, includeStats = false, recursive = false } = options;
    const contents = [];

    if (!await this.exists(directoryPath)) { // Используем this.exists
      return contents;
    }

    let items = [];
    try {
      items = await fs.readdir(directoryPath);
    } catch (error) {
      this.logger.warn(`Ошибка при чтении директории ${directoryPath}:`, error.message);
      return contents;
    }

    for (const item of items) {
      const itemPath = path.join(directoryPath, item);
      try {
        const stats = await this.stat(itemPath); // Используем this.stat
        if (filter(item, stats, itemPath)) {
          const entry = {
            name: item,
            path: itemPath,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            stats: includeStats ? stats : undefined,
          };
          contents.push(entry);
        }
        if (recursive && stats.isDirectory()) {
          const subContents = await this.getDirectoryContents(itemPath, options); // Рекурсивный вызов с this
          contents.push(...subContents);
        }
      } catch (error) {
        this.logger.warn(`Ошибка при чтении ${itemPath}:`, error.message);
      }
    }

    return contents;
  }
}

export { FileSystemUtils };
