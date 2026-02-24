/**
 * RAG Indexer - Local project indexing
 * 
 * Индексирует файлы проекта для быстрого поиска.
 * НЕ использует LLM — только локальная обработка.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class RAGIndexer {
  constructor(config) {
    this.projectPath = config.projectPath;
    this.indexPath = path.join(this.projectPath, '.a2a', 'index');
    
    // includePatterns - фильтр (разрешающий фактор)
    // Если пустой - разрешаем все файлы
    this.includePatterns = config.includePatterns || [
      '**/*.php',
      '**/*.js',
      '**/*.vue',
      '**/*.ts',
      '**/*.json',
      '**/*.md'
    ];
    
    // excludePatterns - исключающий фактор
    this.excludePatterns =  [
      // Hardcoded - always exclude index folders
      '.a2a/',
      '.a2a/index/**',
      '.a2a/index/rag-files.json',
      '.amazonq/**',
      '.cursor/**',
      '.idea/**',
      '.vscode/**',
      
      // Common excludes
      'node_modules/**',
      'node_modules/',
      'vendor/**',
      'storage/**',
      '.git/**',
      'dist/**',
      'build/**',
      'package-lock.json'
    ];
    
    // Initialize ignore detector
    this.ignoreDetector = null;
    this._initIgnoreDetectorPromise = this._initIgnoreDetector(config);
  }

  /**
   * Initialize ignore detector
   * @private
   */
  async _initIgnoreDetector(config) {
    try {
      const { IgnoreDetector } = require('@a2a/fs-utils');
      this.ignoreDetector = new IgnoreDetector({
        projectPath: this.projectPath,
        customIgnoreFiles: config.customIgnoreFiles || [],
      });
      await this.ignoreDetector.initialize();
      console.log('[RAGIndexer] Ignore detector initialized');
    } catch (err) {
      console.warn('[RAGIndexer] Ignore detector not available:', err.message);
    }
  }

  /**
   * Ensure ignore detector is initialized
   * @private
   */
  async _ensureIgnoreDetector() {
    if (this._initIgnoreDetectorPromise) {
      await this._initIgnoreDetectorPromise;
    }
  }

  /**
   * Index project files
   */
  async indexProject(force = false) {
    console.log('Indexing project files...');
    
    // Ensure index directory exists
    await fs.mkdir(this.indexPath, { recursive: true });

    // Initialize ignore detector if not already done
    await this._ensureIgnoreDetector();
    
    // Get all files
    const files = await this.walkDirectory(this.projectPath);
    
    // Build index
    const index = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      projectPath: this.projectPath,
      files: [],
      chunks: [],
    };

    let processed = 0;
    for (const file of files) {
      try {
        const fileInfo = await this.indexFile(file);
        if (fileInfo) {
          index.files.push(fileInfo.file);
          index.chunks.push(...fileInfo.chunks);
          processed++;
        }
      } catch (err) {
        console.warn(`Warning: Could not index ${file}: ${err.message}`);
      }
    }

    // Save index - always overwrite (ignore force parameter for now)
    // Delete existing index first to ensure clean state
    const indexFilePath = path.join(this.indexPath, 'rag-files.json');
    try {
      await fs.unlink(indexFilePath);
    } catch (e) {
      // File doesn't exist, that's fine
    }
    
    await fs.writeFile(
      indexFilePath,
      JSON.stringify(index, null, 2)
    );

    console.log(`Indexed ${processed} files, ${index.chunks.length} chunks`);
    
    return index;
  }

  /**
   * Index single file
   */
  async indexFile(filePath) {
    // Normalize to forward slashes for consistent pattern matching
    const relativePath = path.relative(this.projectPath, filePath).replace(/\\/g, '/');
    const ext = path.extname(filePath);

    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    // Create file info
    const fileInfo = {
      path: relativePath,
      ext,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      hash: this.hashContent(content),
      language: this.detectLanguage(ext),
    };

    // Create chunks for RAG
    const chunks = this.chunkFile(relativePath, content, ext);

    return { file: fileInfo, chunks };
  }

  /**
   * Chunk file content for RAG
   */
  chunkFile(filePath, content, ext) {
    const chunks = [];
    
    // Different chunking strategies by file type
    switch (ext) {
      case '.php':
        // Chunk by class/method
        chunks.push(...this.chunkPHP(filePath, content));
        break;
      case '.js':
      case '.ts':
        // Chunk by function/class
        chunks.push(...this.chunkJS(filePath, content));
        break;
      case '.vue':
        // Chunk Vue SFC
        chunks.push(...this.chunkVue(filePath, content));
        break;
      case '.md':
        // Chunk by section
        chunks.push(...this.chunkMarkdown(filePath, content));
        break;
      default:
        // Simple line-based chunking
        chunks.push(...this.chunkLines(filePath, content));
    }

    return chunks;
  }

  /**
   * Chunk Vue Single File Component
   */
  chunkVue(filePath, content) {
    const chunks = [];
    
    // Extract script section
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (scriptMatch && scriptMatch[1]) {
      const scriptContent = scriptMatch[1];
      chunks.push({
        id: this.hashContent(`${filePath}:script`),
        filePath,
        type: 'vue-script',
        name: 'script',
        content: scriptContent.trim(),
        startLine: content.substring(0, content.indexOf('<script')).split('\n').length,
      });
      
      // Extract exports (Vue 3 script setup or module.exports)
      const exportsMatch = scriptContent.match(/(?:export\s+(?:default|const)|module\.exports)\s*[=({]/);
      if (exportsMatch) {
        chunks.push(...this.chunkJS(filePath + ':vue', scriptContent));
      }
    }
    
    // Extract template section
    const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
    if (templateMatch && templateMatch[1]) {
      chunks.push({
        id: this.hashContent(`${filePath}:template`),
        filePath,
        type: 'vue-template',
        name: 'template',
        content: templateMatch[1].trim(),
        startLine: content.substring(0, content.indexOf('<template')).split('\n').length,
      });
    }
    
    // Extract style section
    const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    if (styleMatch && styleMatch[1]) {
      chunks.push({
        id: this.hashContent(`${filePath}:style`),
        filePath,
        type: 'vue-style',
        name: 'style',
        content: styleMatch[1].trim(),
        startLine: content.substring(0, content.indexOf('<style')).split('\n').length,
      });
    }

    return chunks;
  }

  /**
   * Chunk PHP file by class/method
   */
  chunkPHP(filePath, content) {
    const chunks = [];
    const lines = content.split('\n');
    
    // Extract class definitions
    const classRegex = /class\s+(\w+)/g;
    const methodRegex = /(public|private|protected)\s+function\s+(\w+)/g;
    
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      chunks.push({
        id: this.hashContent(`${filePath}:class:${match[1]}`),
        filePath,
        type: 'class',
        name: match[1],
        content: this.extractBlock(content, match.index),
        startLine: content.substring(0, match.index).split('\n').length,
      });
    }

    while ((match = methodRegex.exec(content)) !== null) {
      chunks.push({
        id: this.hashContent(`${filePath}:method:${match[2]}`),
        filePath,
        type: 'method',
        name: match[2],
        visibility: match[1],
        content: this.extractBlock(content, match.index),
        startLine: content.substring(0, match.index).split('\n').length,
      });
    }

    // Laravel-specific extractions
    if (content.includes('use Illuminate') || content.includes('extends Controller')) {
      // Extract route definitions
      const routeRegex = /(?:Route::|router->)(get|post|put|delete|patch|options)\s*\(\s*['"]([^'"]+)/g;
      while ((match = routeRegex.exec(content)) !== null) {
        chunks.push({
          id: this.hashContent(`${filePath}:route:${match[2]}`),
          filePath,
          type: 'route',
          name: match[2],
          method: match[1],
          content: match[0],
          startLine: content.substring(0, match.index).split('\n').length,
        });
      }

      // Extract service container bindings
      const bindingRegex = /(?:app\(|App::make\()\s*['"]([^'"]+)/g;
      while ((match = bindingRegex.exec(content)) !== null) {
        chunks.push({
          id: this.hashContent(`${filePath}:binding:${match[1]}`),
          filePath,
          type: 'binding',
          name: match[1],
          content: match[0],
          startLine: content.substring(0, match.index).split('\n').length,
        });
      }
    }

    return chunks;
  }

  /**
   * Chunk JS/TS file by function/class
   */
  chunkJS(filePath, content) {
    const chunks = [];
    
    // Extract function definitions
    const funcRegex = /(function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|class\s+(\w+))/g;
    
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      const name = match[2] || match[3] || match[4];
      if (name) {
        chunks.push({
          id: this.hashContent(`${filePath}:func:${name}`),
          filePath,
          type: match[4] ? 'class' : 'function',
          name,
          content: this.extractBlock(content, match.index),
          startLine: content.substring(0, match.index).split('\n').length,
        });
      }
    }

    // Extract TypeScript interfaces
    if (filePath.endsWith('.ts') || content.includes('interface ')) {
      const interfaceRegex = /interface\s+(\w+)(?:\s*<[^>]+>)?\s*(?:extends\s+\w+)?\s*{/g;
      while ((match = interfaceRegex.exec(content)) !== null) {
        chunks.push({
          id: this.hashContent(`${filePath}:interface:${match[1]}`),
          filePath,
          type: 'interface',
          name: match[1],
          content: this.extractBlock(content, match.index),
          startLine: content.substring(0, match.index).split('\n').length,
        });
      }

      // Extract TypeScript types
      const typeRegex = /type\s+(\w+)(?:\s*<[^>]+>)?\s*=/g;
      while ((match = typeRegex.exec(content)) !== null) {
        // Find the full type definition
        let endIndex = content.indexOf(';', match.index);
        if (endIndex === -1) endIndex = content.length;
        const typeContent = content.substring(match.index, endIndex + 1);
        
        chunks.push({
          id: this.hashContent(`${filePath}:type:${match[1]}`),
          filePath,
          type: 'type',
          name: match[1],
          content: typeContent,
          startLine: content.substring(0, match.index).split('\n').length,
        });
      }
    }

    return chunks;
  }

  /**
   * Chunk Markdown by sections
   */
  chunkMarkdown(filePath, content) {
    const chunks = [];
    const lines = content.split('\n');
    
    let currentSection = '';
    let currentTitle = '';
    let startLine = 1;
    let lineNum = 1;

    for (const line of lines) {
      if (line.startsWith('#')) {
        // Save previous section
        if (currentSection.trim()) {
          chunks.push({
            id: this.hashContent(`${filePath}:section:${currentTitle}`),
            filePath,
            type: 'section',
            name: currentTitle,
            content: currentSection.trim(),
            startLine,
          });
        }
        
        currentTitle = line.replace(/^#+\s*/, '');
        currentSection = line + '\n';
        startLine = lineNum;
      } else {
        currentSection += line + '\n';
      }
      lineNum++;
    }

    // Save last section
    if (currentSection.trim()) {
      chunks.push({
        id: this.hashContent(`${filePath}:section:${currentTitle}`),
        filePath,
        type: 'section',
        name: currentTitle,
        content: currentSection.trim(),
        startLine,
      });
    }

    return chunks;
  }

  /**
   * Simple line-based chunking
   */
  chunkLines(filePath, content, chunkSize = 50) {
    const chunks = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkLines = lines.slice(i, i + chunkSize);
      chunks.push({
        id: this.hashContent(`${filePath}:lines:${i}`),
        filePath,
        type: 'lines',
        content: chunkLines.join('\n'),
        startLine: i + 1,
        endLine: Math.min(i + chunkSize, lines.length),
      });
    }

    return chunks;
  }

  /**
   * Extract code block from content
   */
  extractBlock(content, startIndex) {
    let braceCount = 0;
    let inBlock = false;
    let block = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inBlock = true;
      }
      
      if (inBlock) {
        block += char;
      }
      
      if (char === '}') {
        braceCount--;
        if (braceCount === 0 && inBlock) {
          break;
        }
      }
      
      // Limit block size
      if (block.length > 5000) {
        break;
      }
    }
    
    return block;
  }

  /**
   * Walk directory recursively
   * Логика:
   * - Папки: проверяем только excludePatterns (не заходим в исключённые)
   * - Файлы: проверяем excludePatterns, затем includePatterns
   */
  async walkDirectory(dir, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      // Normalize to forward slashes for consistent pattern matching
      const relativePath = path.relative(this.projectPath, fullPath).replace(/\\/g, '/');
      
      if (entry.isDirectory()) {
        // Папки: проверяем только exclude (не заходим в исключённые)
        if (this.shouldExcludeDir(relativePath + '/')) {
          continue;
        }
        // Skip directories using ignore detector
        if (this.ignoreDetector && this.ignoreDetector.shouldIgnore(relativePath)) {
          continue;
        }
        if (this.ignoreDetector && this.ignoreDetector.shouldSkipDirectory(entry.name, path.relative(this.projectPath, dir))) {
          continue;
        }
        await this.walkDirectory(fullPath, files);
      } else if (entry.isFile()) {
        // Файлы: проверяем exclude, затем include
        if (this.shouldExcludeFile(relativePath)) {
          continue;
        }
        // Skip files using ignore detector
        if (this.ignoreDetector && this.ignoreDetector.shouldIgnore(relativePath)) {
          continue;
        }
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Проверяет папку на исключение (только excludePatterns)
   */
  shouldExcludeDir(relativePath) {
    for (const pattern of this.excludePatterns) {
      if (this.matchPattern(relativePath, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Проверяет файл на исключение
   * Логика: 
   * 1. Если путь совпадает с excludePatterns - исключаем
   * 2. Если includePatterns задан и не пустой - проверяем совпадение
   * 3. Если includePatterns пустой - разрешаем все
   */
  shouldExcludeFile(relativePath) {
    // Сначала проверяем exclude паттерны
    for (const pattern of this.excludePatterns) {
      if (this.matchPattern(relativePath, pattern)) {
        return true;
      }
    }
    
    // Если includePatterns задан - проверяем
    if (this.includePatterns && this.includePatterns.length > 0) {
      for (const pattern of this.includePatterns) {
        if (this.matchPattern(relativePath, pattern)) {
          return false; // Совпал с include - не исключаем
        }
      }
      return true; // Не совпал ни с одним include - исключаем
    }
    
    // includePatterns пустой - разрешаем все
    return false;
  }

  /**
   * Glob pattern matching
   * Поддерживает: ** (любая глубина), * (любые символы кроме /)
   * 
   * - Ищем на любом уровне вложенности
   */
  matchPattern(filePath, pattern) {
    // Нормализуем путь
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Проверяем, является ли паттерн директорией (заканчивается на /)
    const isDirPattern = pattern.endsWith('/');
    
    // Для паттернов без **/ префикса - ищем на любом уровне
    // Например, node_modules/ или package-lock.json -> ищем на любом уровне
    if (!pattern.includes('**')) {
      // Получаем имя для поиска (убираем trailing / для директорий)
      const searchName = isDirPattern ? pattern.slice(0, -1) : pattern;
      
      // Проверяем, содержит ли путь это имя как компонент
      const pathParts = normalizedPath.split('/');
      for (const part of pathParts) {
        // Для файлов: проверяем точное совпадение или glob (*.json)
        if (isDirPattern) {
          // Для директорий - точное совпадение
          if (part === searchName) {
            return true;
          }
        } else {
          // Для файлов - точное совпадение или glob
          if (this._matchFileName(part, searchName)) {
            return true;
          }
        }
      }
    }

    
    // Преобразуем glob в regex
    let regexPattern = pattern
      .replace(/\*\*\//g, '{{GLOBSTAR_SLASH}}')  // **/ -> placeholder
      .replace(/\*\*/g, '{{GLOBSTAR}}')           // ** -> placeholder
      .replace(/\*/g, '{{STAR}}')                 // * -> placeholder
      .replace(/\./g, '\\.')                      // . -> \.
      .replace(/{{GLOBSTAR_SLASH}}/g, '(.*\\/)?') // **/ -> (any/path/)? (optional)
      .replace(/{{GLOBSTAR}}/g, '.*')             // ** -> any chars
      .replace(/{{STAR}}/g, '[^/]*');             // * -> any non-slash chars
    
    const regex = new RegExp('^' + regexPattern + '$');
    return regex.test(normalizedPath);
  }


  /**
   * Match filename against pattern (supports simple globs like *.json)
   * @private
   */
  _matchFileName(fileName, pattern) {
    // Exact match
    if (fileName === pattern) {
      return true;
    }
    
    // Glob pattern (e.g., *.json)
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      const regex = new RegExp('^' + regexPattern + '$');
      return regex.test(fileName);
    }
    
    return false;
  }

  /**
   * Detect language from extension
   */
  detectLanguage(ext) {

    const map = {
      '.php': 'php',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.vue': 'vue',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
    };
    return map[ext] || 'text';
  }

  /**
   * Hash content
   */
  hashContent(content) {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  /**
   * Index a single chunk (called from RAGIntegrator)
   * @param {Object} chunk - Chunk to index
   */
  async indexChunk(chunk) {
    // Add to chunks array if not already there
    const existingIndex = this.index?.chunks?.findIndex(c => c.id === chunk.id);
    if (existingIndex === -1 || !existingIndex) {
      this.index?.chunks?.push(chunk);
    }
  }

  /**
   * Remove file from index
   * @param {string} filePath - File path to remove
   */
  async removeFile(filePath) {
    if (!this.index) return;
    const relativePath = filePath.replace(this.projectPath, '').replace(/^[\\/]/, '');
    this.index.files = this.index.files.filter(f => f.path !== relativePath);
    this.index.chunks = this.index.chunks.filter(c => c.filePath !== relativePath);
  }

  /**
   * Remove directory from index
   * @param {string} dirPath - Directory path to remove
   */
  async removeDirectory(dirPath) {
    if (!this.index) return;
    const relativePath = dirPath.replace(this.projectPath, '').replace(/^[\\/]/, '');
    // Remove all files in directory
    this.index.files = this.index.files.filter(f => !f.path.startsWith(relativePath));
    this.index.chunks = this.index.chunks.filter(c => !c.filePath.startsWith(relativePath));
  }

  /**
   * Get indexed files count
   * @returns {number}
   */
  getIndexedFilesCount() {
    return this.index?.files?.length || 0;
  }

  /**
   * Get indexed chunks count
   * @returns {number}
   */
  getIndexedChunksCount() {
    return this.index?.chunks?.length || 0;
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.index = null;
  }
}

module.exports = { RAGIndexer };
