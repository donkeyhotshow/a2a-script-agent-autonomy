/**
 * File System Reader - Handles file operations
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { IgnoreDetector } = require('@a2a/fs-utils');

const execAsync = promisify(exec);

/**
 * FileSystem class for file operations
 */
class FileSystem {
  /**
   * Create a file system instance
   * @param {Object} config - Configuration
   * @param {string} config.projectPath - Project root path
   * @param {string[]} [config.customIgnoreFiles] - Additional ignore file names
   * @param {boolean} [config.enableIgnore=true] - Enable ignore detection
   */
  constructor(config) {
    this.projectPath = config.projectPath || process.cwd();
    this.ignoreDetector = null;
    this.enableIgnore = config.enableIgnore !== false;
    
    if (this.enableIgnore) {
      this.ignoreDetector = new IgnoreDetector({
        projectPath: this.projectPath,
        customIgnoreFiles: config.customIgnoreFiles || [],
      });
    }
  }

  /**
   * Initialize the file system (including ignore detector)
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.ignoreDetector) {
      await this.ignoreDetector.initialize();
    }
  }

  /**
   * Check if file exists
   * @param {string} filePath - Relative or absolute path
   * @returns {Promise<boolean>} True if exists
   */
  async exists(filePath) {
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(this.projectPath, filePath);
    
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file content
   * @param {string} filePath - Relative path from project root
   * @returns {Promise<string>} File content
   */
  async readFile(filePath) {
    const fullPath = path.join(this.projectPath, filePath);
    
    if (!await this.exists(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);

    return {
      content,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      path: filePath,
    };
  }

  /**
   * Write file content
   * @param {string} filePath - Relative path from project root
   * @param {string} content - Content to write
   * @param {Object} options - Write options
   * @param {boolean} [options.overwrite=false] - Allow overwrite
   * @returns {Promise<Object>} Write result
   */
  async writeFile(filePath, content, options = {}) {
    const fullPath = path.join(this.projectPath, filePath);
    
    // Check if file exists
    if (await this.exists(fullPath) && !options.overwrite) {
      throw new Error(`File already exists: ${filePath}. Use overwrite: true to replace.`);
    }

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');

    return {
      path: filePath,
      size: content.length,
      created: true,
    };
  }

  /**
   * Delete file
   * @param {string} filePath - Relative path from project root
   * @returns {Promise<Object>} Delete result
   */
  async deleteFile(filePath) {
    const fullPath = path.join(this.projectPath, filePath);
    
    if (!await this.exists(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    await fs.unlink(fullPath);

    return {
      path: filePath,
      deleted: true,
    };
  }

  /**
   * List directory contents
   * @param {string} dirPath - Relative path from project root
   * @param {Object} options - List options
   * @param {boolean} [options.recursive=false] - List recursively
   * @param {boolean} [options.ignore=true] - Apply ignore patterns
   * @returns {Promise<Array>} Directory entries
   */
  async listDirectory(dirPath = '', options = {}) {
    const fullPath = path.join(this.projectPath, dirPath);
    
    if (!await this.exists(fullPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      // Check if we should ignore this entry
      if (options.ignore !== false && this.ignoreDetector) {
        if (this.ignoreDetector.shouldIgnore(entryPath)) {
          continue;
        }
        
        // Skip directories that should be completely blocked
        if (entry.isDirectory() && this.ignoreDetector.shouldSkipDirectory(entry.name, dirPath)) {
          continue;
        }
      }
      
      result.push({
        name: entry.name,
        path: entryPath,
        type: entry.isDirectory() ? 'directory' : 'file',
      });

      if (options.recursive && entry.isDirectory()) {
        // Skip recursive traversal into ignored/blocked directories
        if (options.ignore !== false && this.ignoreDetector) {
          if (this.ignoreDetector.shouldSkipDirectory(entry.name, dirPath)) {
            continue;
          }
        }
        
        const subEntries = await this.listDirectory(entryPath, options);
        result.push(...subEntries);
      }
    }

    return result;
  }

  /**
   * Run test file
   * @param {string} testPath - Path to test file
   * @returns {Promise<Object>} Test results
   */
  async runTest(testPath) {
    const fullPath = path.join(this.projectPath, testPath);
    
    if (!await this.exists(fullPath)) {
      throw new Error(`Test file not found: ${testPath}`);
    }

    try {
      // Detect test framework
      const ext = path.extname(testPath);
      let command;

      if (ext === '.php') {
        command = `cd ${this.projectPath} && ./vendor/bin/phpunit ${testPath}`;
      } else if (ext === '.js' || ext === '.ts') {
        command = `cd ${this.projectPath} && npm test -- ${testPath}`;
      } else {
        throw new Error(`Unsupported test file type: ${ext}`);
      }

      const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
      
      return {
        success: true,
        output: stdout,
        errors: stderr,
        path: testPath,
      };
    } catch (error) {
      return {
        success: false,
        output: error.stdout,
        errors: error.stderr || error.message,
        path: testPath,
      };
    }
  }

  /**
   * Get file stats
   * @param {string} filePath - Relative path from project root
   * @returns {Promise<Object>} File stats
   */
  async getStats(filePath) {
    const fullPath = path.join(this.projectPath, filePath);
    const stats = await fs.stat(fullPath);
    
    return {
      path: filePath,
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  }
}

module.exports = {
  FileSystem,
  IgnoreDetector,
};
