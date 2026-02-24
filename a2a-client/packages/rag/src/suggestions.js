/**
 * Search Suggestions - Autocomplete and search suggestions
 * 
 * Provides intelligent autocomplete based on indexed code symbols.
 * 
 * @module @a2a/rag/suggestions
 * @version 1.0.0
 */

/**
 * Search Suggestions Engine
 */
class SearchSuggestionsEngine {
  constructor(config = {}) {
    this.config = config;
    this.symbols = new Map();  // symbol -> { type, filePath, frequency }
    this.prefixIndex = new Map();  // prefix -> symbols
    this.maxSuggestions = config.maxSuggestions || 10;
  }

  /**
   * Index symbols from chunks
   * @param {Array} chunks - Code chunks
   */
  indexSymbols(chunks) {
    for (const chunk of chunks) {
      if (chunk.name) {
        this._addSymbol(chunk.name, {
          type: chunk.type,
          filePath: chunk.filePath,
          content: chunk.content,
        });
      }
    }

    this._buildPrefixIndex();
  }

  /**
   * Add single symbol
   * @param {string} name - Symbol name
   * @param {Object} data - Symbol data
   * @private
   */
  _addSymbol(name, data) {
    const key = name.toLowerCase();
    
    if (!this.symbols.has(key)) {
      this.symbols.set(key, {
        name,
        type: data.type,
        filePath: data.filePath,
        content: data.content,
        frequency: 0,
        variants: new Set([name]),
      });
    }

    const symbol = this.symbols.get(key);
    symbol.frequency++;
    symbol.variants.add(name);
    symbol.type = data.type || symbol.type;
    symbol.filePath = data.filePath || symbol.filePath;
  }

  /**
   * Build prefix index for fast lookup
   * @private
   */
  _buildPrefixIndex() {
    this.prefixIndex.clear();

    for (const [key, symbol] of this.symbols) {
      // Add prefixes of different lengths
      const prefixes = [
        key.slice(0, 1),
        key.slice(0, 2),
        key.slice(0, 3),
        key.slice(0, 4),
      ];

      for (const prefix of prefixes) {
        if (!this.prefixIndex.has(prefix)) {
          this.prefixIndex.set(prefix, new Set());
        }
        this.prefixIndex.get(prefix).add(key);
      }
    }
  }

  /**
   * Get suggestions for query
   * @param {string} query - Search query
   * @param {Object} options - Options
   * @returns {Array} Suggestions
   */
  getSuggestions(query, options = {}) {
    if (!query || query.length < 1) {
      return this._getRecentSymbols(options.limit);
    }

    const limit = options.limit || this.maxSuggestions;
    const lowerQuery = query.toLowerCase();
    const candidates = new Map();

    // Find candidates from prefix index
    const prefix = lowerQuery.slice(0, 2);
    const prefixMatches = this.prefixIndex.get(prefix) || new Set();

    for (const key of prefixMatches) {
      if (key.startsWith(lowerQuery)) {
        const symbol = this.symbols.get(key);
        
        // Calculate score
        const score = this._calculateScore(symbol, lowerQuery, query);
        
        candidates.set(key, { ...symbol, score });
      }
    }

    // Sort by score and return top results
    return Array.from(candidates.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({
        text: s.name,
        type: s.type,
        filePath: s.filePath,
        score: s.score,
      }));
  }

  /**
   * Calculate suggestion score
   * @param {Object} symbol - Symbol data
   * @param {string} lowerQuery - Lowercase query
   * @param {string} originalQuery - Original query
   * @returns {number} Score
   * @private
   */
  _calculateScore(symbol, lowerQuery, originalQuery) {
    let score = 0;

    // Exact match bonus
    if (symbol.name.toLowerCase() === lowerQuery) {
      score += 100;
    }
    // Prefix match bonus
    else if (symbol.name.toLowerCase().startsWith(lowerQuery)) {
      score += 50;
    }
    // Contains match
    else if (symbol.name.toLowerCase().includes(lowerQuery)) {
      score += 20;
    }

    // Frequency bonus
    score += Math.min(symbol.frequency, 10);

    // Type preference
    const typeBonus = {
      class: 15,
      function: 12,
      method: 10,
      interface: 8,
      service: 10,
      controller: 10,
    };
    score += typeBonus[symbol.type] || 0;

    // Case sensitivity bonus (preserve user casing)
    if (symbol.name.startsWith(originalQuery.charAt(0).toUpperCase())) {
      score += 5;
    }

    return score;
  }

  /**
   * Get recent/frequent symbols
   * @param {number} limit - Max results
   * @returns {Array} Recent symbols
   * @private
   */
  _getRecentSymbols(limit = 10) {
    return Array.from(this.symbols.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map(s => ({
        text: s.name,
        type: s.type,
        filePath: s.filePath,
        score: s.frequency,
      }));
  }

  /**
   * Get suggestions by type
   * @param {string} type - Symbol type
   * @param {number} limit - Max results
   * @returns {Array} Filtered suggestions
   */
  getByType(type, limit = 10) {
    return Array.from(this.symbols.values())
      .filter(s => s.type === type)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map(s => ({
        text: s.name,
        type: s.type,
        filePath: s.filePath,
        score: s.frequency,
      }));
  }

  /**
   * Clear index
   */
  clear() {
    this.symbols.clear();
    this.prefixIndex.clear();
  }

  /**
   * Get stats
   * @returns {Object} Statistics
   */
  getStats() {
    const typeCounts = {};
    for (const [, symbol] of this.symbols) {
      typeCounts[symbol.type] = (typeCounts[symbol.type] || 0) + 1;
    }

    return {
      totalSymbols: this.symbols.size,
      typeCounts,
      prefixIndexSize: this.prefixIndex.size,
    };
  }
}

/**
 * Create suggestions engine
 * @param {Object} config - Configuration
 * @returns {SearchSuggestionsEngine}
 */
function createSuggestionsEngine(config) {
  return new SearchSuggestionsEngine(config);
}

/**
 * Query expansion
 * Expands queries with related terms
 */
class QueryExpander {
  constructor(config = {}) {
    this.config = config;
    this.termRelations = new Map();
  }

  /**
   * Add term relation
   * @param {string} term - Base term
   * @param {string} related - Related term
   * @param {number} weight - Relation weight
   */
  addRelation(term, related, weight = 1) {
    const key = term.toLowerCase();
    
    if (!this.termRelations.has(key)) {
      this.termRelations.set(key, new Map());
    }
    
    const relations = this.termRelations.get(key);
    const currentWeight = relations.get(related) || 0;
    relations.set(related, currentWeight + weight);
  }

  /**
   * Expand query
   * @param {string} query - Original query
   * @returns {Array} Expanded terms
   */
  expand(query) {
    const terms = query.toLowerCase().split(/\s+/);
    const expanded = new Set(terms);

    for (const term of terms) {
      const relations = this.termRelations.get(term.toLowerCase());
      if (relations) {
        for (const [related, weight] of relations) {
          if (weight > 0.5) {
            expanded.add(related);
          }
        }
      }
    }

    return Array.from(expanded);
  }

  /**
   * Learn from search history
   * @param {string} query - Query
   * @param {string} clickedResult - Clicked result
   */
  learn(query, clickedResult) {
    const terms = query.toLowerCase().split(/\s+/);
    
    for (const term of terms) {
      if (clickedResult.toLowerCase().includes(term)) {
        this.addRelation(term, clickedResult, 1);
      }
    }
  }
}

/**
 * Create query expander
 * @param {Object} config - Configuration
 * @returns {QueryExpander}
 */
function createQueryExpander(config) {
  return new QueryExpander(config);
}

module.exports = {
  SearchSuggestionsEngine,
  createSuggestionsEngine,
  QueryExpander,
  createQueryExpander,
};
