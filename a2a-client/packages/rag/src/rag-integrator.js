/**
 * RAG Integrator - Connects File Scanner with RAG System
 * 
 * Provides automatic indexing of scanned files and real-time updates.
 */

const fs = require('fs').promises;
const path = require('path');
const { FileScanner } = require('@a2a/fs-utils');
const { RAGIndexer } = require('./indexer');
const { ChunkManager } = require('./chunk-manager');
const chokidar = require('chokidar');

class RAGIntegrator {
  constructor(config = {}) {
    this.config = config;
    
    // Initialize file scanner
    this.scanner = new FileScanner({
      rootPath: config.projectPath,
      includePatterns: config.includePatterns || FileScanner.PATTERNS.CODE,
      excludePatterns: config.excludePatterns || FileScanner.PATTERNS.EXCLUDE,
      maxDepth: config.maxDepth || 0,
      maxFiles: config.maxFiles || 100000,
    });
    
    // Initialize RAG components
    this.indexer = new RAGIndexer(config);
    this.chunkManager = new ChunkManager(config);
    
    // File watching setup
    this.watcher = null;
    this.isWatching = false;
    
    // Cache for file contents
    this.fileCache = new Map();
  }

  /**
   * Scan and index all files
   */
  async scanAndIndex() {
    console.log('Scanning and indexing files...');
    
    // Scan files
    const scanResult = await this.scanner.scan();
    
    // Index each file
    for (const file of scanResult.files) {
      await this.indexFile(file);
    }
    
    console.log(`Indexed ${scanResult.files.length} files`);
    return scanResult;
  }

  /**
   * Index a single file
   */
  async indexFile(file) {
    try {
      // Read file content
      const content = await this.readFile(file.path);
      
      // Chunk the file
      const chunks = this.chunkManager.chunkFile(file.path, content, file.ext);
      
      // Index chunks
      for (const chunk of chunks) {
        await this.indexer.indexChunk(chunk);
      }
      
      // Cache file content
      this.fileCache.set(file.path, content);
      
      return { success: true, file, chunks: chunks.length };
    } catch (error) {
      console.error(`Failed to index ${file.path}:`, error.message);
      return { success: false, file, error: error.message };
    }
  }

  /**
   * Read file content with caching
   */
  async readFile(filePath) {
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath);
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.fileCache.set(filePath, content);
      return content;
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Start watching for file changes
   */
  startWatching() {
    if (this.isWatching) return;
    
    console.log('Starting file watcher...');
    
    this.watcher = chokidar.watch(this.config.projectPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      },
      ignored: this.scanner.excludePatterns
    });
    
    // Handle file changes
    this.watcher
      .on('add', path => this.handleFileChange('add', path))
      .on('change', path => this.handleFileChange('change', path))
      .on('unlink', path => this.handleFileChange('unlink', path))
      .on('addDir', path => this.handleDirectoryChange('add', path))
      .on('unlinkDir', path => this.handleDirectoryChange('unlink', path));
    
    this.isWatching = true;
  }

  /**
   * Handle file changes
   */
  async handleFileChange(event, filePath) {
    try {
      const relativePath = path.relative(this.config.projectPath, filePath);
      
      switch (event) {
        case 'add':
        case 'change':
          await this.indexFile({
            path: filePath,
            relativePath,
            name: path.basename(filePath),
            ext: path.extname(filePath).toLowerCase()
          });
          console.log(`Indexed ${event}ed file: ${relativePath}`);
          break;
          
        case 'unlink':
          await this.indexer.removeFile(filePath);
          console.log(`Removed file from index: ${relativePath}`);
          break;
      }
    } catch (error) {
      console.error(`Error handling file change: ${error.message}`);
    }
  }

  /**
   * Handle directory changes
   */
  async handleDirectoryChange(event, dirPath) {
    try {
      const relativePath = path.relative(this.config.projectPath, dirPath);
      
      switch (event) {
        case 'add':
          console.log(`Added directory: ${relativePath}`);
          break;
          
        case 'unlink':
          await this.indexer.removeDirectory(dirPath);
          console.log(`Removed directory from index: ${relativePath}`);
          break;
      }
    } catch (error) {
      console.error(`Error handling directory change: ${error.message}`);
    }
  }

  /**
   * Stop watching for file changes
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      console.log('Stopped file watcher');
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      filesIndexed: this.indexer.getIndexedFilesCount(),
      chunksIndexed: this.indexer.getIndexedChunksCount(),
      watching: this.isWatching,
      cacheSize: this.fileCache.size
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.fileCache.clear();
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.stopWatching();
    this.clearCache();
    this.indexer.dispose();
  }
}

module.exports = { RAGIntegrator };
