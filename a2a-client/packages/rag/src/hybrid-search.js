/**
 * Hybrid Search - Combines Sparse (BM25) and Dense (Vector) search
 * 
 * Implements Reciprocal Rank Fusion (RRF) to combine results from
 * BM25-based sparse search and vector-based semantic search.
 * 
 * @module @a2a/rag/hybrid-search
 * @version 1.0.0
 */

/**
 * Default hybrid search configuration
 */
const DEFAULT_CONFIG = {
  sparseWeight: 0.5,      // Weight for sparse search (BM25)
  denseWeight: 0.5,      // Weight for dense search (vector)
  rrfK: 60,              // RRF parameter (typically 60)
  minScore: 0.0,         // Minimum score threshold
  maxResults: 20,         // Maximum results to return
};

/**
 * Hybrid Search class
 * Combines sparse (BM25) and dense (vector) search using RRF
 */
class HybridSearcher {
  /**
   * Create a hybrid searcher
   * @param {Object} config - Configuration options
   * @param {Object} [config.sparseSearch] - Sparse search component (BM25)
   * @param {Object} [config.denseSearch] - Dense search component (vector)
   * @param {number} [config.sparseWeight=0.5] - Weight for sparse search
   * @param {number} [config.denseWeight=0.5] - Weight for dense search
   * @param {number} [config.rrfK=60] - RRF parameter
   */
  constructor(config = {}) {
    this.sparseSearch = config.sparseSearch;  // BM25 or Meilisearch
    this.denseSearch = config.denseSearch;    // Vector search
    this.sparseWeight = config.sparseWeight ?? DEFAULT_CONFIG.sparseWeight;
    this.denseWeight = config.denseWeight ?? DEFAULT_CONFIG.denseWeight;
    this.rrfK = config.rrfK ?? DEFAULT_CONFIG.rrfK;
  }

  /**
   * Search using hybrid approach
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} [options.limit=20] - Maximum results
   * @param {number} [options.minScore=0] - Minimum score threshold
   * @returns {Promise<Array>} Combined and ranked results
   */
  async search(query, options = {}) {
    const limit = options.limit ?? DEFAULT_CONFIG.maxResults;
    const minScore = options.minScore ?? DEFAULT_CONFIG.minScore;
    
    // Execute searches in parallel
    const [sparseResults, denseResults] = await Promise.all([
      this._searchSparse(query, limit * 2),  // Get more for better fusion
      this._searchDense(query, limit * 2),
    ]);
    
    // Apply RRF fusion
    const fusedResults = this._rrfFusion(sparseResults, denseResults);
    
    // Apply weights and filter
    const weightedResults = this._applyWeights(fusedResults);
    
    // Filter by minimum score and limit
    return weightedResults
      .filter(r => r.score >= minScore)
      .slice(0, limit);
  }

  /**
   * Execute sparse search
   * @param {string} query - Search query
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Sparse results
   * @private
   */
  async _searchSparse(query, limit) {
    if (!this.sparseSearch) {
      return [];
    }
    
    try {
      if (typeof this.sparseSearch.search === 'function') {
        // BM25 scorer or similar
        return this.sparseSearch.search(query, { limit });
      } else if (typeof this.sparseSearch === 'object') {
        // Meilisearch-like client
        const result = await this.sparseSearch.search(query, { limit });
        return (result.hits || []).map(hit => ({
          id: hit.id || hit.path,
          docId: hit.id || hit.path,
          content: hit.content || '',
          path: hit.path || '',
          score: hit._rankingScore || 1,
        }));
      }
    } catch (error) {
      console.error('[HybridSearcher] Sparse search error:', error.message);
    }
    
    return [];
  }

  /**
   * Execute dense (vector) search
   * @param {string} query - Search query
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Dense results
   * @private
   */
  async _searchDense(query, limit) {
    if (!this.denseSearch) {
      return [];
    }
    
    try {
      if (typeof this.denseSearch.search === 'function') {
        return this.denseSearch.search(query, { limit });
      }
    } catch (error) {
      console.error('[HybridSearcher] Dense search error:', error.message);
    }
    
    return [];
  }

  /**
   * Reciprocal Rank Fusion
   * Combines ranked lists from multiple search algorithms
   * @param {Array} sparseResults - Results from sparse search
   * @param {Array} denseResults - Results from dense search
   * @returns {Array} Fused results
   * @private
   */
  _rrfFusion(sparseResults, denseResults) {
    const scores = new Map();
    
    // Process sparse results
    for (let rank = 0; rank < sparseResults.length; rank++) {
      const doc = sparseResults[rank];
      const docId = doc.id || doc.docId || doc.path;
      
      if (!scores.has(docId)) {
        scores.set(docId, { ...doc, rrfScore: 0 });
      }
      
      scores.get(docId).rrfScore += 1 / (this.rrfK + rank + 1);
      scores.get(docId).sparseRank = rank;
    }
    
    // Process dense results
    for (let rank = 0; rank < denseResults.length; rank++) {
      const doc = denseResults[rank];
      const docId = doc.id || doc.docId || doc.path;
      
      if (!scores.has(docId)) {
        scores.set(docId, { ...doc, rrfScore: 0 });
      }
      
      scores.get(docId).rrfScore += 1 / (this.rrfK + rank + 1);
      scores.get(docId).denseRank = rank;
    }
    
    // Convert to array and sort by RRF score
    return Array.from(scores.values())
      .sort((a, b) => b.rrfScore - a.rrfScore);
  }

  /**
   * Apply weights to RRF scores
   * @param {Array} results - RRF results
   * @returns {Array} Weighted results
   * @private
   */
  _applyWeights(results) {
    // Find max scores for normalization
    let maxSparseScore = 0;
    let maxDenseScore = 0;
    
    for (const result of results) {
      if (result.sparseScore !== undefined && result.sparseScore > maxSparseScore) {
        maxSparseScore = result.sparseScore;
      }
      if (result.denseScore !== undefined && result.denseScore > maxDenseScore) {
        maxDenseScore = result.denseScore;
      }
    }
    
    // Apply weights
    return results.map(result => {
      let finalScore = result.rrfScore;
      
      // Add weighted component scores
      if (result.sparseScore !== undefined && maxSparseScore > 0) {
        finalScore += this.sparseWeight * (result.sparseScore / maxSparseScore);
      }
      
      if (result.denseScore !== undefined && maxDenseScore > 0) {
        finalScore += this.denseWeight * (result.denseScore / maxDenseScore);
      }
      
      return {
        ...result,
        score: finalScore,
        weights: {
          sparse: this.sparseWeight,
          dense: this.denseWeight,
        },
      };
    });
  }

  /**
   * Set sparse search component
   * @param {Object} sparseSearch - Sparse search (BM25/Meilisearch)
   */
  setSparseSearch(sparseSearch) {
    this.sparseSearch = sparseSearch;
  }

  /**
   * Set dense search component
   * @param {Object} denseSearch - Dense search (vector)
   */
  setDenseSearch(denseSearch) {
    this.denseSearch = denseSearch;
  }

  /**
   * Update weights
   * @param {number} sparseWeight - New sparse weight
   * @param {number} denseWeight - New dense weight
   */
  setWeights(sparseWeight, denseWeight) {
    // Normalize weights
    const total = sparseWeight + denseWeight;
    this.sparseWeight = sparseWeight / total;
    this.denseWeight = denseWeight / total;
  }

  /**
   * Get configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      sparseWeight: this.sparseWeight,
      denseWeight: this.denseWeight,
      rrfK: this.rrfK,
      hasSparse: !!this.sparseSearch,
      hasDense: !!this.denseSearch,
    };
  }
}

/**
 * Create a hybrid searcher
 * @param {Object} config - Configuration options
 * @returns {HybridSearcher}
 *
 * @example
 * const hybrid = createHybridSearcher({
 *   sparseSearch: bm25Scorer,
 *   denseSearch: semanticSearcher,
 *   sparseWeight: 0.7,  // More weight for code search
 *   denseWeight: 0.3,
 * });
 *
 * const results = await hybrid.search('UserService methods');
 */
function createHybridSearcher(config) {
  return new HybridSearcher(config);
}

/**
 * Hybrid search configuration
 * @typedef {Object} HybridSearchConfig
 * @property {Object} [sparseSearch] - Sparse search component
 * @property {Object} [denseSearch] - Dense search component
 * @property {number} [sparseWeight=0.5] - Weight for sparse search
 * @property {number} [denseWeight=0.5] - Weight for dense search
 * @property {number} [rrfK=60] - RRF parameter
 */

/**
 * Search result
 * @typedef {Object} HybridSearchResult
 * @property {string} id - Document identifier
 * @property {string} path - File path
 * @property {string} content - Document content
 * @property {number} score - Final combined score
 * @property {number} rrfScore - RRF component score
 * @property {number} [sparseScore] - Sparse search score
 * @property {number} [denseScore] - Dense search score
 * @property {Object} [weights] - Applied weights
 */

module.exports = {
  HybridSearcher,
  createHybridSearcher,
  DEFAULT_CONFIG,
};
