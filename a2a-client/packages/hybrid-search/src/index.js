/**
 * Hybrid Search for A2A
 * 
 * Комбинирует несколько методов поиска для максимальной точности:
 * - RAG (Keyword Search)
 * - Full-Text Search
 * - Graph Search (если доступен)
 * 
 * Поддерживает:
 * - Автоматический выбор стратегии
 * - Комбинирование результатов
 * - Умное ранжирование
 * - Настраиваемые веса для каждого метода
 */

const path = require('path');

class HybridSearcher {
  constructor(config = {}) {
    this.projectPath = config.projectPath || process.cwd();
    this.storagePath = config.storagePath || path.join(this.projectPath, '.a2a', 'index');
    
    // Веса для каждого метода
    this.weights = {
      rag: config.weights?.rag || 0.3,
      fulltext: config.weights?.fulltext || 0.4,
      graph: config.weights?.graph || 0.3
    };
    
    // Настройки
    this.autoStrategy = config.autoStrategy !== false;
    this.defaultStrategy = config.defaultStrategy || 'hybrid';
    
    // Поисковики (ленивая инициализация)
    this.searchers = {
      rag: null,
      fulltext: null,
      graph: null
    };
    
    // Флаги инициализации
    this.initialized = {
      rag: false,
      fulltext: false,
      graph: false
    };
  }
  
  /**
   * Инициализация поисковика
   */
  async initializeSearcher(type) {
    if (this.initialized[type]) return;
    
    try {
      switch (type) {
        case 'rag':
          const { RAGSearcher } = require('@a2a/rag');
          this.searchers.rag = new RAGSearcher({ projectPath: this.projectPath });
          this.initialized.rag = true;
          break;
          
        case 'fulltext':
          const { FullTextSearcher } = require('@a2a/fulltext');
          this.searchers.fulltext = new FullTextSearcher({ projectPath: this.projectPath });
          this.initialized.fulltext = true;
          break;
          
        case 'graph':
          try {
            const { GraphSearcher } = require('@a2a/graph');
            this.searchers.graph = new GraphSearcher({ projectPath: this.projectPath });
            this.initialized.graph = true;
          } catch (e) {
            console.log('Hybrid Searcher: Graph searcher not available');
          }
          break;
      }
    } catch (error) {
      console.error(`Hybrid Searcher: Ошибка инициализации ${type}:`, error.message);
    }
  }
  
  /**
   * Умный поиск с автоматическим выбором стратегии
   */
  async smartSearch(query, options = {}) {
    // Определяем тип запроса
    const queryType = this.analyzeQuery(query);
    
    // Выбираем стратегию на основе типа запроса
    let strategy = options.strategy || this.defaultStrategy;
    
    if (this.autoStrategy && !options.strategy) {
      strategy = this.selectStrategy(queryType);
    }
    
    // Выполняем поиск
    return this.search(query, { ...options, strategy });
  }
  
  /**
   * Анализ типа запроса
   */
  analyzeQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    // Проверяем типы запросов
    
    // Точный поиск (имена классов, функций)
    if (/^[A-Z][a-zA-Z0-9]*$/.test(query) || /^[a-z][a-zA-Z0-9]*\(\)$/.test(query)) {
      return 'exact';
    }
    
    // Семантический запрос (вопросы, описания)
    if (lowerQuery.includes('как ') || lowerQuery.includes('где ') || 
        lowerQuery.includes('найти ') || lowerQuery.includes('поиск ')) {
      return 'semantic';
    }
    
    // Поиск по содержимому (фразы)
    if (query.includes(' ') || query.includes('"')) {
      return 'phrase';
    }
    
    // Поиск по файлам
    if (query.includes('/') || query.includes('\\') || query.includes('.php') || query.includes('.js')) {
      return 'file';
    }
    
    // По умолчанию - общий поиск
    return 'general';
  }
  
  /**
   * Выбор стратегии на основе типа запроса
   */
  selectStrategy(queryType) {
    switch (queryType) {
      case 'exact':
        return 'fulltext';  // Для точного поиска лучше fulltext
        
      case 'semantic':
        return 'hybrid';    // Для семантических запросов комбинируем
        
      case 'phrase':
        return 'fulltext+rag';  // Для фраз комбинируем fulltext и rag
        
      case 'file':
        return 'fulltext';  // Для поиска файлов - fulltext
        
      default:
        return 'hybrid';    // По умолчанию - гибридный
    }
  }
  
  /**
   * Выполнение поиска
   */
  async search(query, options = {}) {
    const strategy = options.strategy || this.defaultStrategy;
    const limit = options.limit || 10;
    
    // Парсим стратегию
    const methods = strategy.split('+').map(m => m.trim());
    
    // Выполняем поиск каждым методом
    const results = new Map();
    
    for (const method of methods) {
      try {
        await this.initializeSearcher(method);
        
        if (!this.initialized[method]) {
          console.log(`Hybrid Searcher: Метод ${method} не доступен`);
          continue;
        }
        
        const methodResults = await this.searchWithMethod(method, query, { 
          limit: limit * 2  // Берем больше результатов для объединения
        });
        
        // Объединяем результаты
        this.mergeResults(results, methodResults, method);
        
      } catch (error) {
        console.error(`Hybrid Searcher: Ошибка поиска ${method}:`, error.message);
      }
    }
    
    // Сортируем и ограничиваем
    const sortedResults = Array.from(results.values());
    sortedResults.sort((a, b) => b.combinedScore - a.combinedScore);
    
    const finalResults = sortedResults.slice(0, limit);
    
    return {
      strategy,
      methods: methods.filter(m => this.initialized[m]),
      items: finalResults,
      totalResults: sortedResults.length
    };
  }
  
  /**
   * Поиск конкретным методом
   */
  async searchWithMethod(method, query, options) {
    const searcher = this.searchers[method];
    
    if (!searcher) {
      return [];
    }
    
    switch (method) {
      case 'rag':
        return await searcher.search(query, options);
        
      case 'fulltext':
        return await searcher.search(query, options);
        
      case 'graph':
        return await searcher.search(query, options);
        
      default:
        return [];
    }
  }
  
  /**
   * Объединение результатов
   */
  mergeResults(results, methodResults, method) {
    const weight = this.weights[method] || 0.3;
    
    for (const result of methodResults) {
      // Создаем уникальный ключ для результата
      const key = this.createResultKey(result);
      
      if (results.has(key)) {
        // Обновляем существующий результат
        const existing = results.get(key);
        existing.combinedScore += result.score * weight;
        existing.methods.push(method);
        existing.scores[method] = result.score;
      } else {
        // Добавляем новый результат
        results.set(key, {
          ...result,
          combinedScore: result.score * weight,
          methods: [method],
          scores: { [method]: result.score }
        });
      }
    }
  }
  
  /**
   * Создание ключа для результата
   */
  createResultKey(result) {
    // Используем filePath и startLine как ключ
    const chunk = result.chunk || result;
    return `${chunk.filePath}:${chunk.startLine || 0}`;
  }
  
  /**
   * Сравнение стратегий
   */
  async compareStrategies(query, options = {}) {
    const strategies = options.strategies || ['rag', 'fulltext', 'hybrid'];
    const limit = options.limit || 10;
    
    const comparison = {};
    
    for (const strategy of strategies) {
      try {
        const startTime = Date.now();
        const results = await this.search(query, { strategy, limit });
        const duration = Date.now() - startTime;
        
        comparison[strategy] = {
          resultsCount: results.items.length,
          duration,
          topResults: results.items.slice(0, 5).map(r => ({
            filePath: r.chunk?.filePath || r.filePath,
            score: r.combinedScore || r.score
          }))
        };
      } catch (error) {
        comparison[strategy] = {
          error: error.message
        };
      }
    }
    
    return comparison;
  }
  
  /**
   * Получение доступных методов
   */
  getAvailableMethods() {
    return Object.keys(this.initialized).filter(m => this.initialized[m]);
  }
  
  /**
   * Получение статистики
   */
  async getStats() {
    const stats = {
      methods: {},
      weights: this.weights
    };
    
    for (const [method, initialized] of Object.entries(this.initialized)) {
      if (initialized && this.searchers[method]) {
        try {
          const methodStats = await this.searchers[method].getStats();
          stats.methods[method] = methodStats;
        } catch (error) {
          stats.methods[method] = { error: error.message };
        }
      }
    }
    
    return stats;
  }
}

/**
 * Создание hybrid поиска
 */
function createHybridSearch(config = {}) {
  const searcher = new HybridSearcher(config);
  
  return {
    searcher,
    
    /**
     * Умный поиск
     */
    async search(query, options = {}) {
      return searcher.smartSearch(query, options);
    },
    
    /**
     * Сравнение стратегий
     */
    async compareStrategies(query, options = {}) {
      return searcher.compareStrategies(query, options);
    },
    
    /**
     * Получение статистики
     */
    async getStats() {
      return searcher.getStats();
    },
    
    /**
     * Получение доступных методов
     */
    getAvailableMethods() {
      return searcher.getAvailableMethods();
    }
  };
}

module.exports = {
  HybridSearcher,
  createHybridSearch
};
