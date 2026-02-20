/**
 * File Scanner
 * 
 * Утилита для сканирования директорий с поддержкой include/exclude паттернов
 */

const fs = require('fs').promises;
const path = require('path');
const GlobMatcher = require('./glob-matcher');

class FileScanner {
  constructor(config = {}) {
    this.rootPath = config.rootPath || process.cwd();
    
    // Include паттерны (какие файлы включать)
    this.includePatterns = config.includePatterns || GlobMatcher.PATTERNS.CODE;
    
    // Exclude паттерны (какие файлы/директории исключать)
    this.excludePatterns = config.excludePatterns || GlobMatcher.PATTERNS.EXCLUDE;
    
    // Максимальная глубина сканирования (0 = без ограничений)
    this.maxDepth = config.maxDepth || 0;
    
    // Максимальное количество файлов
    this.maxFiles = config.maxFiles || 100000;
    
    // Callback для прогресса
    this.onProgress = config.onProgress || null;
    
    // Инициализируем матчеры
    this.includeMatcher = new GlobMatcher(this.includePatterns);
    this.excludeMatcher = new GlobMatcher(this.excludePatterns);
  }
  
  /**
   * Сканирование директории
   */
  async scan(dir = this.rootPath, options = {}) {
    const files = [];
    const stats = {
      totalFiles: 0,
      totalDirs: 0,
      skippedDirs: 0,
      skippedFiles: 0,
      errors: []
    };
    
    await this.walkDirectory(dir || this.rootPath, files, stats, 0, options);
    
    return {
      files,
      stats,
      rootPath: this.rootPath
    };
  }
  
  /**
   * Рекурсивный обход директории
   */
  async walkDirectory(dir, files, stats, depth, options = {}) {
    // Проверяем лимит файлов
    if (files.length >= this.maxFiles) {
      return;
    }
    
    // Проверяем глубину
    if (this.maxDepth > 0 && depth > this.maxDepth) {
      return;
    }
    
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      stats.errors.push({ path: dir, error: e.message });
      return;
    }
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.rootPath, fullPath);
      
      if (entry.isDirectory()) {
        stats.totalDirs++;
        
        // Проверяем исключения для директорий
        const shouldExclude = this.shouldExcludeDir(relativePath);
        
        if (shouldExclude) {
          stats.skippedDirs++;
          continue;
        }
        
        // Прогресс
        if (this.onProgress && stats.totalDirs % 100 === 0) {
          this.onProgress({ type: 'dir', path: relativePath, stats });
        }
        
        await this.walkDirectory(fullPath, files, stats, depth + 1, options);
        
      } else if (entry.isFile()) {
        stats.totalFiles++;
        
        // Проверяем include и exclude
        const shouldInclude = this.shouldIncludeFile(relativePath);
        const shouldExclude = this.shouldExcludeFile(relativePath);
        
        if (shouldInclude && !shouldExclude) {
          files.push({
            path: fullPath,
            relativePath,
            name: entry.name,
            ext: path.extname(entry.name).toLowerCase()
          });
        } else {
          stats.skippedFiles++;
        }
      }
    }
  }
  
  /**
   * Проверка включения файла
   */
  shouldIncludeFile(relativePath) {
    return this.includeMatcher.match(relativePath);
  }
  
  /**
   * Проверка исключения файла
   */
  shouldExcludeFile(relativePath) {
    return this.excludeMatcher.match(relativePath);
  }
  
  /**
   * Проверка исключения директории
   */
  shouldExcludeDir(relativePath) {
    // Добавляем / в конец для матчинга паттернов типа "node_modules/**"
    return this.excludeMatcher.match(relativePath + '/') || 
           this.excludeMatcher.match(relativePath);
  }
  
  /**
   * Статический метод для быстрого сканирования
   */
  static async scan(dir, options = {}) {
    const scanner = new FileScanner({ rootPath: dir, ...options });
    return scanner.scan();
  }
  
  /**
   * Получить список файлов с расширением
   */
  async scanByExtension(dir, extensions) {
    const exts = Array.isArray(extensions) ? extensions : [extensions];
    const normalizedExts = exts.map(e => e.startsWith('.') ? e : '.' + e);
    
    const result = await this.scan(dir);
    
    return {
      ...result,
      files: result.files.filter(f => normalizedExts.includes(f.ext))
    };
  }
}

module.exports = FileScanner;
