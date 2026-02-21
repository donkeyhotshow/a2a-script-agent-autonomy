/**
 * @a2a/fulltext
 * 
 * Full-Text Search with BM25 ranking for A2A codebase indexing
 * 
 * Features:
 * - Fast full-text search with FlexSearch
 * - Fuzzy search support
 * - BM25-like ranking
 * - Highlight extraction
 * - Multiple file types support (PHP, JS, TS, Vue, Markdown)
 */

const FullTextIndexer = require('./indexer');
const { FullTextSearcher } = require('./searcher');

/**
 * Создание full-text поиска
 */
function createFullText(config = {}) {
  const indexer = new FullTextIndexer(config);
  const searcher = new FullTextSearcher(config);
  
  return {
    indexer,
    searcher,
    
    /**
     * Индексация проекта
     */
    async index(force = false) {
      return indexer.indexProject(force);
    },
    
    /**
     * Поиск по запросу
     */
    async search(query, options = {}) {
      return searcher.search(query, options);
    },
    
    /**
     * Поиск с предложениями
     */
    async searchWithSuggestions(query, options = {}) {
      return searcher.searchWithSuggestions(query, options);
    },
    
    /**
     * Поиск по регулярному выражению
     */
    async searchRegex(pattern, options = {}) {
      return searcher.searchRegex(pattern, options);
    },
    
    /**
     * Получение статистики
     */
    async getStats() {
      return searcher.getStats();
    }
  };
}

module.exports = {
  FullTextIndexer,
  FullTextSearcher,
  createFullText
};
