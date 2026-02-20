/**
 * Ignore Detector - Detects and parses IDE ignore files
 * Supports .cursorignore and custom ignore files (e.g., .a2aignore)
 */


const fs = require('fs').promises;
const path = require('path');

/**
 * Default ignore file names to look for
 */
const DEFAULT_IGNORE_FILES = [
  '.cursorignore',
  '.a2aignore',  // Custom ignore file for this IDE
];

/**
 * IgnoreDetector class for detecting and parsing ignore files
 */
class IgnoreDetector {
  /**
   * Create an ignore detector instance
   * @param {Object} config - Configuration
   * @param {string} config.projectPath - Project root path
   * @param {string[]} [config.customIgnoreFiles] - Additional ignore file names
   */
  constructor(config = {}) {
    this.projectPath = config.projectPath || process.cwd();
    this.customIgnoreFiles = config.customIgnoreFiles || [];
    this.ignorePatterns = [];
    this.ignoreFilesFound = [];
    this._initialized = false;
  }

  /**
   * Initialize the detector by scanning for ignore files
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;
    
    const ignoreFilesToCheck = [...DEFAULT_IGNORE_FILES, ...this.customIgnoreFiles];
    
    for (const ignoreFile of ignoreFilesToCheck) {
      const fullPath = path.join(this.projectPath, ignoreFile);
      try {
        await fs.access(fullPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const patterns = this._parseIgnoreFile(content, ignoreFile);
        this.ignorePatterns.push(...patterns);
        this.ignoreFilesFound.push({
          name: ignoreFile,
          path: fullPath,
          patterns: patterns.length,
        });
        console.log(`[IgnoreDetector] Found ${ignoreFile} with ${patterns.length} patterns`);
      } catch {
        // File doesn't exist, skip
      }
    }
    
    // Also check for ignore files in subdirectories
    await this._scanForIgnoreFiles(this.projectPath);
    
    this._initialized = true;
    console.log(`[IgnoreDetector] Initialized with ${this.ignorePatterns.length} total patterns from ${this.ignoreFilesFound.length} files`);
  }

  /**
   * Recursively scan for ignore files in subdirectories
   * @param {string} dirPath - Directory to scan
   * @returns {Promise<void>}
   */
  async _scanForIgnoreFiles(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip node_modules and other common directories
        if (this._isCommonIgnoredDir(entry.name)) continue;
        
        for (const ignoreFile of DEFAULT_IGNORE_FILES) {
          const ignoreFilePath = path.join(fullPath, ignoreFile);
          try {
            await fs.access(ignoreFilePath);
            const content = await fs.readFile(ignoreFilePath, 'utf-8');
            const patterns = this._parseIgnoreFile(content, ignoreFile);
            
            // Add directory prefix to patterns
            const dirPrefix = path.relative(this.projectPath, fullPath);
            const prefixedPatterns = patterns.map(p => ({
              ...p,
              pattern: p.isDir 
                ? `${dirPrefix}/${p.pattern}` 
                : `${dirPrefix}/${p.pattern}`,
              originalPattern: p.pattern,
              isRootAnchored: false, // Subdirectory patterns are never root-anchored
            }));

            
            this.ignorePatterns.push(...prefixedPatterns);
            this.ignoreFilesFound.push({
              name: ignoreFile,
              path: ignoreFilePath,
              patterns: patterns.length,
            });
            console.log(`[IgnoreDetector] Found ${ignoreFile} in ${dirPrefix} with ${patterns.length} patterns`);
          } catch {
            // File doesn't exist, skip
          }
        }
        
        // Recursively scan subdirectories
        await this._scanForIgnoreFiles(fullPath);
      }
    } catch (error) {
      // Ignore errors when scanning directories
    }
  }

  /**
   * Check if directory is commonly ignored
   * @param {string} dirName - Directory name
   * @returns {boolean}
   */
  _isCommonIgnoredDir(dirName) {
    const commonDirs = [
      'node_modules',
      '.git',
      '.svn',
      '.hg',
      '__pycache__',
      '.cache',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt',
    ];
    return commonDirs.includes(dirName);
  }

  /**
   * Parse ignore file content
   * @param {string} content - File content
   * @param {string} fileName - Source file name
   * @returns {Array<{pattern: string, isNegation: boolean, isDir: boolean, isRootAnchored: boolean}>}
   */
  _parseIgnoreFile(content, fileName) {
    const patterns = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      let trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Handle negation patterns
      const isNegation = trimmed.startsWith('!');
      if (isNegation) {
        trimmed = trimmed.substring(1);
      }
      
      // Check if pattern is anchored to root (starts with /)
      const isRootAnchored = trimmed.startsWith('/');
      if (isRootAnchored) {
        trimmed = trimmed.substring(1);
      }
      
      // Determine if pattern applies to directories only
      const isDir = trimmed.endsWith('/');
      if (isDir) {
        trimmed = trimmed.slice(0, -1);
      }
      
      if (trimmed) {
        patterns.push({
          pattern: trimmed,
          isNegation,
          isDir,
          isRootAnchored,
          source: fileName,
        });
      }
    }
    
    return patterns;
  }


  /**
   * Check if a path should be ignored
   * @param {string} relativePath - Path relative to project root
   * @returns {boolean}
   */
  shouldIgnore(relativePath) {
    if (!this._initialized) {
      console.warn('[IgnoreDetector] Not initialized, call initialize() first');
      return false;
    }
    
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    let ignored = false;
    let matchedPattern = null;
    
    for (const pattern of this.ignorePatterns) {
      if (pattern.isNegation) continue;
      
      const patternStr = pattern.pattern;
      const isRootAnchored = pattern.isRootAnchored;
      
      // For root-anchored patterns, only match at root level
      if (isRootAnchored) {
        // Check if path starts with pattern
        if (normalizedPath === patternStr || normalizedPath.startsWith(patternStr + '/')) {
          ignored = true;
          matchedPattern = pattern;
          break;
        }
      } else {
        // For non-anchored patterns, match at any level
        
        // Check if any path component matches the pattern
        for (const part of pathParts) {
          if (this._matchComponent(part, patternStr, pattern.isDir)) {
            ignored = true;
            matchedPattern = pattern;
            break;
          }
        }
        
        if (ignored) break;
        
        // Also check full path match for file patterns
        if (!pattern.isDir && this._matchPattern(normalizedPath, patternStr)) {
          ignored = true;
          matchedPattern = pattern;
          break;
        }
      }
    }
    
    // Check negation patterns
    if (ignored && matchedPattern) {
      for (const pattern of this.ignorePatterns) {
        if (!pattern.isNegation) continue;
        
        const patternStr = pattern.pattern;
        
        // For negation, check if the specific path matches
        if (this._matchPattern(normalizedPath, patternStr) ||
            this._matchComponent(fileName, patternStr, pattern.isDir)) {
          // Check if this negation applies to the matched pattern
          if (matchedPattern.pattern === patternStr || 
              normalizedPath.includes(patternStr)) {
            ignored = false;
            break;
          }
        }
      }
    }
    
    return ignored;
  }

  /**
   * Check if a single path component matches a pattern
   * @param {string} component - Path component (directory or file name)
   * @param {string} pattern - Pattern to match
   * @param {boolean} isDirPattern - Whether the pattern is for directories
   * @returns {boolean}
   */
  _matchComponent(component, pattern, isDirPattern) {
    // Handle glob patterns
    if (pattern.includes('*') || pattern.includes('?')) {
      return this._matchPattern(component, pattern);
    }
    
    // For directory patterns, match exact directory name
    if (isDirPattern) {
      return component === pattern;
    }
    
    // For file patterns, match exact name or extension
    if (pattern.startsWith('*.')) {
      const ext = pattern.substring(1); // e.g., ".log"
      return component.endsWith(ext);
    }
    
    return component === pattern;
  }


  /**
   * Check if path matches a pattern
   * @param {string} pathStr - Path to check
   * @param {string} pattern - Pattern to match
   * @returns {boolean}
   */
  _matchPattern(pathStr, pattern) {
    // Handle glob patterns
    if (pattern.includes('*')) {
      // Convert glob to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '{{GLOBSTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/{{GLOBSTAR}}/g, '.*')
        .replace(/\?/g, '.');
      
      try {
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(pathStr);
      } catch {
        return false;
      }
    }
    
    // Handle negation prefix in pattern (already handled in parsing)
    // Check exact match or starts with pattern/
    if (pathStr === pattern || pathStr.startsWith(pattern + '/')) {
      return true;
    }
    
    // Check if pattern matches any component in the path (e.g., node_modules matches packages/agent/node_modules)
    const pathParts = pathStr.split('/');
    for (const part of pathParts) {
      if (part === pattern) {
        return true;
      }
    }
    
    return false;
  }


  /**
   * Get all found ignore files
   * @returns {Array<{name: string, path: string, patterns: number}>}
   */
  getIgnoreFiles() {
    return this.ignoreFilesFound;
  }

  /**
   * Get all ignore patterns
   * @returns {Array<{pattern: string, isNegation: boolean, isDir: boolean, source: string}>}
   */
  getPatterns() {
    return this.ignorePatterns;
  }

  /**
   * Get directories that should be completely skipped during traversal
   * These are directories that match ** (recursive) patterns
   * @returns {string[]} List of directory patterns to skip
   */
  getDirectoriesToSkip() {
    const dirsToSkip = new Set();
    
    for (const pattern of this.ignorePatterns) {
      if (pattern.isNegation) continue;
      
      const patternStr = pattern.pattern;
      
      // If it's a directory-only pattern or ends with */
      if (pattern.isDir || patternStr.includes('**')) {
        // Extract the directory name from the pattern
        const dirName = patternStr.replace(/\*\*.*$/, '').replace(/\/+$/, '');
        if (dirName) {
          dirsToSkip.add(dirName);
        }
      }
    }
    
    return Array.from(dirsToSkip);
  }

  /**
   * Filter an array of paths, removing ignored ones
   * @param {Array<{name: string, path: string, type: string}>} entries - Entries to filter
   * @returns {Array<{name: string, path: string, type: string}>} Filtered entries
   */
  filterEntries(entries) {
    return entries.filter(entry => !this.shouldIgnore(entry.path));
  }

  /**
   * Check if a directory should be skipped during recursive traversal
   * @param {string} dirName - Directory name
   * @param {string} parentPath - Parent directory path
   * @returns {boolean}
   */
  shouldSkipDirectory(dirName, parentPath = '') {
    const fullPath = parentPath ? `${parentPath}/${dirName}` : dirName;
    
    // First check if the directory itself should be ignored
    if (this.shouldIgnore(fullPath)) {
      return true;
    }
    
    // Then check if any parent directory should be ignored
    const pathParts = fullPath.split('/');
    for (let i = 1; i < pathParts.length; i++) {
      const parentDir = pathParts.slice(0, i).join('/');
      if (this.shouldIgnore(parentDir)) {
        return true;
      }
    }
    
    return false;
  }
}

module.exports = {
  IgnoreDetector,
  DEFAULT_IGNORE_FILES,
};
