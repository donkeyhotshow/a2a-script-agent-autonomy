/**
 * Full-Text Indexer for A2A
 * 
 * Использует FlexSearch для быстрого полнотекстового поиска
 * с поддержкой fuzzy search и BM25-подобного ранжирования
 */

const fs = require('fs').promises;
const path = require('path');
const FlexSearch = require('flexsearch');
const { FileScanner, GlobMatcher } = require('../../fs-utils/src/index.js');

class FullTextIndexer {
  constructor(config = {}) {
    this.projectPath = config.projectPath;
    this.storagePath = config.storagePath || path.join(this.projectPath, '.a2a', 'index');
    this.indexPath = path.join(this.storagePath, 'fulltext-index.json');
    
    // Используем FileScanner из @a2a/fs-utils
    this.scanner = new FileScanner({
      rootPath: this.projectPath,
      includePatterns: config.includePatterns || GlobMatcher.PATTERNS.CODE,
      excludePatterns: config.excludePatterns || GlobMatcher.PATTERNS.EXCLUDE
    });
    
    // Настройки FlexSearch
    this.options = {
      tokenize: config.tokenize || 'forward',
      resolution: config.resolution || 9,
      depth: config.depth || 3,
      cache: config.cache !== false,
      minMatchCharLength: config.minMatchCharLength || 2,
      threshold: config.threshold || 0.6,
      ...config.options
    };
    
    // Индексы для разных полей
    this.index = null;
    this.documents = new Map();
    this.metadata = {
      version: '1.0',
      timestamp: null,
      projectPath: this.projectPath,
      totalFiles: 0,
      totalDocuments: 0
    };
  }
  
  /**
   * Индексация проекта
   */
  async indexProject(force = false) {
    console.log('Full-Text Indexer: Начало индексации...');
    const startTime = Date.now();
    
    // Создаем директорию для хранения
    await this.ensureDir(this.storagePath);
    
    // Проверяем существующий индекс
    if (!force && await this.indexExists()) {
      console.log('Full-Text Indexer: Загрузка существующего индекса...');
      await this.loadIndex();
      return this.getIndexInfo();
    }
    
    // Создаем новый индекс
    this.index = new FlexSearch.Document({
      tokenize: this.options.tokenize,
      resolution: this.options.resolution,
      depth: this.options.depth,
      cache: this.options.cache,
      document: {
        id: 'id',
        index: [
          { field: 'content', tokenize: 'forward' },
          { field: 'name', tokenize: 'strict' },
          { field: 'filePath', tokenize: 'forward' },
          { field: 'type', tokenize: 'strict' }
        ],
        store: ['filePath', 'type', 'name', 'startLine', 'endLine', 'content']
      }
    });
    
    // Сканируем файлы используя FileScanner
    const scanResult = await this.scanner.scan();
    const files = scanResult.files;
    console.log(`Full-Text Indexer: Найдено ${files.length} файлов`);
    
    // Индексируем каждый файл
    let indexedFiles = 0;
    let totalDocuments = 0;
    
    for (const fileInfo of files) {
      try {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const chunks = this.chunkFile(fileInfo.relativePath, content, fileInfo.ext);
        const docCount = this.indexChunks(fileInfo.relativePath, chunks);
        
        if (docCount > 0) {
          indexedFiles++;
          totalDocuments += docCount;
        }
      } catch (error) {
        // Пропускаем файлы с ошибками чтения
      }
    }
    
    // Обновляем метаданные
    this.metadata.timestamp = new Date().toISOString();
    this.metadata.totalFiles = indexedFiles;
    this.metadata.totalDocuments = totalDocuments;
    
    // Сохраняем индекс
    await this.saveIndex();
    
    const elapsed = Date.now() - startTime;
    console.log(`Full-Text Indexer: Индексация завершена за ${elapsed}ms`);
    console.log(`Full-Text Indexer: ${indexedFiles} файлов, ${totalDocuments} документов`);
    
    return this.getIndexInfo();
  }
  
  /**
   * Индексация чанков
   */
  indexChunks(filePath, chunks) {
    for (const chunk of chunks) {
      const docId = this.generateDocId(filePath, chunk.startLine);
      
      this.index.add(docId, {
        id: docId,
        content: chunk.content,
        name: chunk.name || '',
        filePath: chunk.filePath,
        type: chunk.type || 'code',
        startLine: chunk.startLine,
        endLine: chunk.endLine
      });
      
      this.documents.set(docId, chunk);
    }
    
    return chunks.length;
  }
  
  /**
   * Разбиение файла на чанки
   */
  chunkFile(filePath, content, ext) {
    const lines = content.split('\n');
    const chunks = [];
    
    // Определяем тип файла и стратегию чанкирования
    switch (ext) {
      case '.php':
        return this.chunkPHP(filePath, content, lines);
      case '.js':
      case '.ts':
        return this.chunkJS(filePath, content, lines);
      case '.vue':
        return this.chunkVue(filePath, content, lines);
      case '.md':
        return this.chunkMarkdown(filePath, content, lines);
      default:
        return this.chunkByLines(filePath, content, lines, 50);
    }
  }
  
  /**
   * Чанкирование PHP файлов
   */
  chunkPHP(filePath, content, lines) {
    const chunks = [];
    
    // Поиск классов
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const className = match[1];
      
      // Находим конец класса (упрощенно)
      let braceCount = 0;
      let endLine = startLine;
      let foundStart = false;
      
      for (let i = startLine - 1; i < lines.length; i++) {
        const line = lines[i];
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        if (braceCount > 0) foundStart = true;
        if (foundStart && braceCount === 0) {
          endLine = i + 1;
          break;
        }
      }
      
      chunks.push({
        filePath,
        type: 'class',
        name: className,
        content: lines.slice(startLine - 1, endLine).join('\n'),
        startLine,
        endLine
      });
    }
    
    // Поиск функций
    const funcRegex = /(?:public|private|protected)?\s*(?:static)?\s*function\s+(\w+)\s*\(/g;
    
    while ((match = funcRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const funcName = match[1];
      
      // Пропускаем если это часть класса
      const isInClass = chunks.some(c => 
        c.type === 'class' && 
        startLine >= c.startLine && 
        startLine <= c.endLine
      );
      
      if (!isInClass) {
        chunks.push({
          filePath,
          type: 'function',
          name: funcName,
          content: lines.slice(startLine - 1, startLine + 20).join('\n'),
          startLine,
          endLine: startLine + 20
        });
      }
    }
    
    // Если ничего не найдено - чанкируем по строкам
    if (chunks.length === 0) {
      return this.chunkByLines(filePath, content, lines, 50);
    }
    
    return chunks;
  }
  
  /**
   * Чанкирование JS/TS файлов
   */
  chunkJS(filePath, content, lines) {
    const chunks = [];
    
    // Поиск классов
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const className = match[1];
      
      let braceCount = 0;
      let endLine = startLine;
      let foundStart = false;
      
      for (let i = startLine - 1; i < lines.length; i++) {
        const line = lines[i];
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        if (braceCount > 0) foundStart = true;
        if (foundStart && braceCount === 0) {
          endLine = i + 1;
          break;
        }
      }
      
      chunks.push({
        filePath,
        type: 'class',
        name: className,
        content: lines.slice(startLine - 1, endLine).join('\n'),
        startLine,
        endLine
      });
    }
    
    // Поиск функций
    const funcRegex = /(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>)/g;
    
    while ((match = funcRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const funcName = match[1] || match[2];
      
      const isInClass = chunks.some(c => 
        c.type === 'class' && 
        startLine >= c.startLine && 
        startLine <= c.endLine
      );
      
      if (!isInClass) {
        chunks.push({
          filePath,
          type: 'function',
          name: funcName,
          content: lines.slice(startLine - 1, startLine + 20).join('\n'),
          startLine,
          endLine: startLine + 20
        });
      }
    }
    
    if (chunks.length === 0) {
      return this.chunkByLines(filePath, content, lines, 50);
    }
    
    return chunks;
  }
  
  /**
   * Чанкирование Vue файлов
   */
  chunkVue(filePath, content, lines) {
    const chunks = [];
    
    // <script> секция
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      const startLine = content.substring(0, scriptMatch.index).split('\n').length;
      chunks.push({
        filePath,
        type: 'script',
        name: path.basename(filePath, '.vue'),
        content: scriptMatch[1],
        startLine,
        endLine: startLine + scriptMatch[1].split('\n').length
      });
    }
    
    // <template> секция
    const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
    if (templateMatch) {
      const startLine = content.substring(0, templateMatch.index).split('\n').length;
      chunks.push({
        filePath,
        type: 'template',
        name: path.basename(filePath, '.vue'),
        content: templateMatch[1],
        startLine,
        endLine: startLine + templateMatch[1].split('\n').length
      });
    }
    
    return chunks;
  }
  
  /**
   * Чанкирование Markdown файлов
   */
  chunkMarkdown(filePath, content, lines) {
    const chunks = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    let lastStart = 1;
    let lastName = 'Introduction';
    
    while ((match = headingRegex.exec(content)) !== null) {
      if (lastStart < match.index) {
        const startLine = content.substring(0, lastStart - 1).split('\n').length;
        const endLine = content.substring(0, match.index).split('\n').length;
        
        chunks.push({
          filePath,
          type: 'section',
          name: lastName,
          content: lines.slice(startLine - 1, endLine).join('\n'),
          startLine,
          endLine
        });
      }
      
      lastStart = match.index;
      lastName = match[2];
    }
    
    // Последняя секция
    if (lastStart < content.length) {
      const startLine = content.substring(0, lastStart - 1).split('\n').length;
      chunks.push({
        filePath,
        type: 'section',
        name: lastName,
        content: lines.slice(startLine - 1).join('\n'),
        startLine,
        endLine: lines.length
      });
    }
    
    return chunks;
  }
  
  /**
   * Простое чанкирование по строкам
   */
  chunkByLines(filePath, content, lines, chunkSize = 50) {
    const chunks = [];
    
    for (let i = 0; i < lines.length; i += chunkSize) {
      chunks.push({
        filePath,
        type: 'code',
        name: null,
        content: lines.slice(i, i + chunkSize).join('\n'),
        startLine: i + 1,
        endLine: Math.min(i + chunkSize, lines.length)
      });
    }
    
    return chunks;
  }
  
  /**
   * Генерация ID документа
   */
  generateDocId(filePath, startLine) {
    return `${filePath}:${startLine}`;
  }
  
  /**
   * Сохранение индекса
   */
  async saveIndex() {
    // Сохраняем только документы и метаданные
    // FlexSearch не поддерживает простой экспорт в синхронном режиме
    const data = {
      metadata: this.metadata,
      documents: Array.from(this.documents.entries())
    };
    
    await fs.writeFile(this.indexPath, JSON.stringify(data, null, 2));
    console.log(`Full-Text Indexer: Индекс сохранен в ${this.indexPath}`);
  }
  
  /**
   * Загрузка индекса
   */
  async loadIndex() {
    const data = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
    
    this.metadata = data.metadata;
    this.documents = new Map(data.documents);
    
    // Восстанавливаем индекс из документов
    this.index = new FlexSearch.Document({
      tokenize: this.options.tokenize,
      resolution: this.options.resolution,
      depth: this.options.depth,
      cache: this.options.cache,
      document: {
        id: 'id',
        index: [
          { field: 'content', tokenize: 'forward' },
          { field: 'name', tokenize: 'strict' },
          { field: 'filePath', tokenize: 'forward' },
          { field: 'type', tokenize: 'strict' }
        ],
        store: ['filePath', 'type', 'name', 'startLine', 'endLine', 'content']
      }
    });
    
    for (const [id, chunk] of this.documents) {
      this.index.add(id, {
        id,
        content: chunk.content,
        name: chunk.name || '',
        filePath: chunk.filePath,
        type: chunk.type || 'code',
        startLine: chunk.startLine,
        endLine: chunk.endLine
      });
    }
    
    console.log(`Full-Text Indexer: Загружено ${this.documents.size} документов`);
  }
  
  /**
   * Проверка существования индекса
   */
  async indexExists() {
    try {
      await fs.access(this.indexPath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Получение информации об индексе
   */
  getIndexInfo() {
    return {
      metadata: this.metadata,
      stats: {
        totalDocuments: this.documents.size,
        totalFiles: this.metadata.totalFiles
      }
    };
  }
  
  /**
   * Создание директории
   */
  async ensureDir(dir) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // ignore
    }
  }
}

module.exports = FullTextIndexer;
