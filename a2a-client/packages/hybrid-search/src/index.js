/**
 * Hybrid Search for A2A — Fulltext-only wrapper
 * RAG/Graph archived — fulltext dominates.
 */

const path = require('path');

class HybridSearcher {
  constructor(config = {}) {
    this.projectPath = config.projectPath || process.cwd();
    this.storagePath = config.storagePath || path.join(this.projectPath, '.a2a', 'index');
    this.searcher = null;
    this.initialized = false;
  }

  async _init() {
    if (this.initialized) return;
    const { FullTextSearcher } = require('@a2a/fulltext');
    this.searcher = new FullTextSearcher({ projectPath: this.projectPath });
    this.initialized = true;
  }

  async smartSearch(query, options = {}) {
    return this.search(query, options);
  }

  async search(query, options = {}) {
    await this._init();
    const limit = options.limit || 10;
    const raw = await this.searcher.search(query, { limit });
    const items = raw.map(r => ({
      chunk: r.chunk,
      combinedScore: r.score,
      methods: ['fulltext'],
      scores: { fulltext: r.score },
      highlights: r.highlights
    }));
    return {
      strategy: 'fulltext',
      methods: ['fulltext'],
      items,
      totalResults: items.length
    };
  }

  async compareStrategies(query, options = {}) {
    const results = await this.search(query, options);
    return {
      fulltext: {
        resultsCount: results.items.length,
        duration: 0,
        topResults: results.items.slice(0, 5).map(r => ({
          filePath: r.chunk?.filePath,
          score: r.combinedScore
        }))
      }
    };
  }

  getAvailableMethods() {
    return this.initialized ? ['fulltext'] : [];
  }

  async getStats() {
    await this._init();
    const stats = await this.searcher.getStats();
    return { methods: { fulltext: stats }, weights: { fulltext: 1 } };
  }
}

function createHybridSearch(config = {}) {
  const searcher = new HybridSearcher(config);
  return {
    searcher,
    search: (q, o) => searcher.smartSearch(q, o),
    compareStrategies: (q, o) => searcher.compareStrategies(q, o),
    getStats: () => searcher.getStats(),
    getAvailableMethods: () => searcher.getAvailableMethods()
  };
}

module.exports = { HybridSearcher, createHybridSearch };
