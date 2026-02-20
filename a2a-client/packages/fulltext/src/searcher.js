/**
 * Full-Text Searcher for A2A
 * 
 * Быстрый полнотекстовый поиск с поддержкой:
 * - Fuzzy search (поиск с опечатками)
 * - BM25-подобное ранжирование
 * - Подсветка совпадений
 * - Фильтрация по типу и файлу
 */

const fs = require('fs').promises;
const path = require('path');
const FlexSearch = require('flexsearch');

class FullTextSearcher {
  constructor(config = {}) {
    this.projectPath = config.projectPath;
    this.storagePath = config.storagePath || path.join(this.projectPath, '.a2a', 'index');
    this.indexPath = path.join(this.storagePath, 'fulltext-index.json');
    
    // Настройки поиска
    this.options = {
      tokenize: config.tokenize || 'forward',
      resolution: config.resolution || 9,
      depth: config.depth || 3,
      cache: config.cache !== false,
      ...config.options
    };
    
    // Индекс и документы
    this.index = null;
    this.documents = new Map();
    this.loaded = false;
  }
  
  /**
   * Загрузка индекса
   */
  async loadIndex() {
    if (this.loaded) return;
    
    try {
      const data = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
      
      this.documents = new Map(data.documents);
      
      // Восстанавливаем индекс
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
      
      // Добавляем документы в индекс
      for (const [id, doc] of this.documents) {
        this.index.add(id, {
          id,
          content: doc.content,
          name: doc.name || '',
          filePath: doc.filePath,
          type: doc.type || 'code',
          startLine: doc.startLine,
          endLine: doc.endLine
        });
      }
      
      this.loaded = true;
      
      console.log(`Full-Text Searcher: Загружено ${this.documents.size} документов`);
    } catch (error) {
      console.error('Full-Text Searcher: Ошибка загрузки индекса:', error.message);
      throw new Error('Индекс не найден. Сначала выполните индексацию.');
    }
  }
  
  /**
   * Поиск по запросу
   */
  async search(query, options = {}) {
    await this.loadIndex();
    
    const limit = options.limit || 10;
    const fuzzy = options.fuzzy || 0;
    const boost = options.boost || {};
    const filter = options.filter || {};
    
    // Выполняем поиск по разным полям
    const results = new Map();
    
    // Поиск по контенту
    const contentResults = this.index.search(query, { 
      limit: limit * 2,
      field: 'content',
      suggest: fuzzy > 0
    });
    
    // Поиск по имени
    const nameResults = this.index.search(query, { 
      limit: limit,
      field: 'name'
    });
    
    // Поиск по пути файла
    const pathResults = this.index.search(query, { 
      limit: limit,
      field: 'filePath'
    });
    
    // Объединяем результаты
    this.mergeResults(results, contentResults, 1.0, boost.content || 1.0);
    this.mergeResults(results, nameResults, 1.0, boost.name || 2.0);
    this.mergeResults(results, pathResults, 1.0, boost.filePath || 1.5);
    
    // Применяем фильтры
    let filteredResults = Array.from(results.values());
    
    if (filter.type) {
      filteredResults = filteredResults.filter(r => r.type === filter.type);
    }
    
    if (filter.filePattern) {
      const regex = new RegExp(filter.filePattern.replace(/\*/g, '.*'));
      filteredResults = filteredResults.filter(r => regex.test(r.filePath));
    }
    
    // Сортируем по score и ограничиваем
    filteredResults.sort((a, b) => b.score - a.score);
    filteredResults = filteredResults.slice(0, limit);
    
    // Добавляем подсветку
    const resultsWithHighlights = filteredResults.map(result => ({
      chunk: {
        id: result.id,
        filePath: result.filePath,
        type: result.type,
        name: result.name,
        content: result.content,
        startLine: result.startLine,
        endLine: result.endLine
      },
      score: result.score,
      highlights: this.extractHighlights(result.content, query)
    }));
    
    return resultsWithHighlights;
  }
  
  /**
   * Объединение результатов поиска
   */
  mergeResults(results, searchResults, baseScore, boost) {
    if (!searchResults || !Array.isArray(searchResults)) return;
    
    for (const fieldResult of searchResults) {
      if (!fieldResult || !fieldResult.result) continue;
      
      for (const docId of fieldResult.result) {
        const doc = this.documents.get(docId);
        if (!doc) continue;
        
        if (results.has(docId)) {
          // Увеличиваем score для существующего результата
          const existing = results.get(docId);
          existing.score += baseScore * boost;
        } else {
          // Добавляем новый результат
          results.set(docId, {
            id: docId,
            filePath: doc.filePath,
            type: doc.type,
            name: doc.name,
            content: doc.content,
            startLine: doc.startLine,
            endLine: doc.endLine,
            score: baseScore * boost
          });
        }
      }
    }
  }
  
  /**
   * Извлечение подсветки совпадений
   */
  extractHighlights(content, query) {
    const highlights = [];
    const lines = content.split('\n');
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      for (const term of queryTerms) {
        if (term.length < 2) continue;
        
        const index = lowerLine.indexOf(term);
        if (index !== -1) {
          // Извлекаем контекст вокруг совпадения
          const start = Math.max(0, index - 30);
          const end = Math.min(line.length, index + term.length + 30);
          const snippet = line.substring(start, end);
          
          highlights.push(snippet);
          
          if (highlights.length >= 3) break;
        }
      }
      
      if (highlights.length >= 3) break;
    }
    
    return highlights;
  }
  
  /**
   * Fuzzy search с предложениями исправлений
   */
  async searchWithSuggestions(query, options = {}) {
    const results = await this.search(query, options);
    
    // Если результатов мало, пробуем найти похожие термины
    if (results.length < 3) {
      const suggestions = await this.getSuggestions(query);
      return { results, suggestions };
    }
    
    return { results, suggestions: [] };
  }
  
  /**
   * Получение предложений исправлений
   */
  async getSuggestions(query) {
    // Простая реализация - разбиваем на слова и ищем похожие
    const terms = query.split(/\s+/);
    const suggestions = [];
    
    for (const term of terms) {
      if (term.length < 3) continue;
      
      // Ищем похожие слова в индексе
      const similar = this.findSimilarTerms(term);
      if (similar.length > 0) {
        suggestions.push({
          original: term,
          suggestions: similar.slice(0, 3)
        });
      }
    }
    
    return suggestions;
  }
  
  /**
   * Поиск похожих терминов
   */
  findSimilarTerms(term) {
    const similar = [];
    const lowerTerm = term.toLowerCase();
    
    // Ищем в именах документов
    for (const [id, doc] of this.documents) {
      if (doc.name && doc.name.toLowerCase().includes(lowerTerm.substring(0, 3))) {
        if (!similar.includes(doc.name)) {
          similar.push(doc.name);
        }
      }
    }
    
    return similar.slice(0, 5);
  }
  
  /**
   * Поиск по регулярному выражению
   */
  async searchRegex(pattern, options = {}) {
    await this.loadIndex();
    
    const regex = new RegExp(pattern, 'gi');
    const results = [];
    const limit = options.limit || 10;
    
    for (const [id, doc] of this.documents) {
      const matches = doc.content.match(regex);
      
      if (matches) {
        results.push({
          chunk: {
            id,
            filePath: doc.filePath,
            type: doc.type,
            name: doc.name,
            content: doc.content,
            startLine: doc.startLine,
            endLine: doc.endLine
          },
          score: matches.length,
          matches,
          highlights: this.extractRegexHighlights(doc.content, regex)
        });
      }
      
      if (results.length >= limit * 2) break;
    }
    
    // Сортируем по количеству совпадений
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, limit);
  }
  
  /**
   * Подсветка для regex поиска
   */
  extractRegexHighlights(content, regex) {
    const highlights = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (regex.test(line)) {
        highlights.push(line.trim());
      }
      
      if (highlights.length >= 3) break;
    }
    
    return highlights;
  }
  
  /**
   * Получение содержимого файла
   */
  async getFileContent(filePath) {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.projectPath, filePath);
    
    return fs.readFile(absolutePath, 'utf-8');
  }
  
  /**
   * Получение документов для файла
   */
  async getFileChunks(filePath) {
    await this.loadIndex();
    
    const chunks = [];
    
    for (const [id, doc] of this.documents) {
      if (doc.filePath === filePath || doc.filePath.endsWith(filePath)) {
        chunks.push(doc);
      }
    }
    
    // Сортируем по номеру строки
    chunks.sort((a, b) => a.startLine - b.startLine);
    
    return chunks;
  }
  
  /**
   * Статистика индекса
   */
  async getStats() {
    await this.loadIndex();
    
    const stats = {
      totalDocuments: this.documents.size,
      types: {},
      files: new Set()
    };
    
    for (const [id, doc] of this.documents) {
      stats.types[doc.type] = (stats.types[doc.type] || 0) + 1;
      stats.files.add(doc.filePath);
    }
    
    stats.totalFiles = stats.files.size;
    stats.files = undefined; // Не возвращаем Set
    
    return stats;
  }
}

module.exports = { FullTextSearcher };
