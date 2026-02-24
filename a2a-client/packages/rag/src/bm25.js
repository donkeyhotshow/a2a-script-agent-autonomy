/**
 * BM25 Scorer - Okapi BM25 implementation for code search
 * 
 * BM25 (Best Matching 25) is a ranking function used for information retrieval.
 * It is an improvement over TF-IDF and is particularly effective for code search.
 * 
 * @module @a2a/rag/bm25
 * @version 1.0.0
 */

const crypto = require('crypto');

/**
 * BM25 Default parameters
 */
const DEFAULT_PARAMS = {
  k1: 1.5,  // Term frequency saturation parameter
  b: 0.75,  // Length normalization parameter
};

/**
 * BM25 Scorer class
 * Implements Okapi BM25 ranking algorithm
 */
class BM25Scorer {
  /**
   * Create a BM25 scorer
   * @param {Object} params - BM25 parameters
   * @param {number} [params.k1=1.5] - Term frequency saturation parameter
   * @param {number} [params.b=0.75] - Length normalization parameter
   */
  constructor(params = {}) {
    this.k1 = params.k1 ?? DEFAULT_PARAMS.k1;
    this.b = params.b ?? DEFAULT_PARAMS.b;
    
    // Index data
    this.documents = new Map();  // docId -> { tokens, length }
    this.docCount = 0;
    this.avgDocLength = 0;
    this.totalDocLength = 0;
    
    // Inverted index: term -> docId -> termFrequency
    this.invertedIndex = new Map();
    
    // Document frequency: term -> number of documents containing term
    this.docFrequency = new Map();
  }

  /**
   * Tokenize text into terms
   * @param {string} text - Text to tokenize
   * @returns {string[]} Array of tokens
   */
  tokenize(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    // Simple tokenization: lowercase, split on non-word characters
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 1);
  }

  /**
   * Add a document to the index
   * @param {string} docId - Document identifier
   * @param {string} content - Document content
   */
  addDocument(docId, content) {
    const tokens = this.tokenize(content);
    const docLength = tokens.length;
    
    // Store document
    this.documents.set(docId, { tokens, length: docLength });
    this.totalDocLength += docLength;
    this.docCount++;
    
    // Update average document length
    this.avgDocLength = this.totalDocLength / this.docCount;
    
    // Build inverted index
    const termCounts = new Map();
    for (const token of tokens) {
      termCounts.set(token, (termCounts.get(token) || 0) + 1);
    }
    
    // Update inverted index and document frequency
    for (const [term, count] of termCounts) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Map());
      }
      this.invertedIndex.get(term).set(docId, count);
      
      // Update document frequency
      this.docFrequency.set(term, (this.docFrequency.get(term) || 0) + 1);
    }
  }

  /**
   * Calculate IDF (Inverse Document Frequency)
   * @param {string} term - Search term
   * @returns {number} IDF value
   * @private
   */
  _calculateIDF(term) {
    const df = this.docFrequency.get(term) || 0;
    if (df === 0) {
      return 0;
    }
    
    // Standard IDF formula: log((N - df + 0.5) / (df + 0.5))
    return Math.log((this.docCount - df + 0.5) / (df + 0.5));
  }

  /**
   * Calculate BM25 score for a single term
   * @param {string} term - Search term
   * @param {string} docId - Document ID
   * @returns {number} BM25 score contribution
   * @private
   */
  _scoreTerm(term, docId) {
    const doc = this.documents.get(docId);
    if (!doc) return 0;
    
    const idf = this._calculateIDF(term);
    if (idf === 0) return 0;
    
    // Term frequency in document
    const termFreqMap = this.invertedIndex.get(term);
    if (!termFreqMap) return 0;
    
    const tf = termFreqMap.get(docId) || 0;
    
    // BM25 term scoring formula
    const numerator = tf * (this.k1 + 1);
    const denominator = tf + this.k1 * (1 - this.b + this.b * (doc.length / this.avgDocLength));
    
    return idf * (numerator / denominator);
  }

  /**
   * Search documents using BM25
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} [options.limit=10] - Maximum results
   * @param {number} [options.minScore=0] - Minimum score threshold
   * @returns {Array<{docId: string, score: number}>} Search results
   */
  search(query, options = {}) {
    const { limit = 10, minScore = 0 } = options;
    
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return [];
    }
    
    // Calculate scores for all documents
    const scores = new Map();
    
    for (const [docId] of this.documents) {
      let score = 0;
      
      for (const term of queryTokens) {
        score += this._scoreTerm(term, docId);
      }
      
      if (score >= minScore) {
        scores.set(docId, score);
      }
    }
    
    // Sort by score descending
    const results = Array.from(scores.entries())
      .map(([docId, score]) => ({ docId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return results;
  }

  /**
   * Get term frequency for a document
   * @param {string} docId - Document ID
   * @returns {Map<string, number>} Term frequency map
   */
  getTermFrequencies(docId) {
    const doc = this.documents.get(docId);
    if (!doc) return new Map();
    
    const freq = new Map();
    for (const token of doc.tokens) {
      freq.set(token, (freq.get(token) || 0) + 1);
    }
    return freq;
  }

  /**
   * Get document frequency for a term
   * @param {string} term - Search term
   * @returns {number} Number of documents containing the term
   */
  getDocumentFrequency(term) {
    return this.docFrequency.get(term) || 0;
  }

  /**
   * Get statistics
   * @returns {Object} Index statistics
   */
  getStats() {
    return {
      docCount: this.docCount,
      avgDocLength: this.avgDocLength,
      totalDocLength: this.totalDocLength,
      uniqueTerms: this.invertedIndex.size,
      k1: this.k1,
      b: this.b,
    };
  }

  /**
   * Clear the index
   */
  clear() {
    this.documents.clear();
    this.invertedIndex.clear();
    this.docFrequency.clear();
    this.docCount = 0;
    this.avgDocLength = 0;
    this.totalDocLength = 0;
  }

  /**
   * Serialize index for persistence
   * @returns {Object} Serialized index
   */
  serialize() {
    return {
      documents: Array.from(this.documents.entries()),
      docCount: this.docCount,
      avgDocLength: this.avgDocLength,
      totalDocLength: this.totalDocLength,
      invertedIndex: Array.from(this.invertedIndex.entries()).map(([term, docMap]) => [
        term,
        Array.from(docMap.entries()),
      ]),
      docFrequency: Array.from(this.docFrequency.entries()),
      k1: this.k1,
      b: this.b,
    };
  }

  /**
   * Load index from serialized data
   * @param {Object} data - Serialized index data
   */
  deserialize(data) {
    this.clear();
    
    this.documents = new Map(data.documents);
    this.docCount = data.docCount;
    this.avgDocLength = data.avgDocLength;
    this.totalDocLength = data.totalDocLength;
    this.k1 = data.k1;
    this.b = data.b;
    
    this.invertedIndex = new Map(
      data.invertedIndex.map(([term, docArray]) => [term, new Map(docArray)])
    );
    
    this.docFrequency = new Map(data.docFrequency);
  }
}

/**
 * Create a BM25 scorer with default parameters
 * @param {Object} params - BM25 parameters
 * @returns {BM25Scorer}
 *
 * @example
 * const bm25 = createBM25Scorer({ k1: 1.5, b: 0.75 });
 *
 * // Add documents
 * bm25.addDocument('doc1', 'UserService handles user operations');
 * bm25.addDocument('doc2', 'OrderService manages orders');
 *
 * // Search
 * const results = bm25.search('user service');
 */
function createBM25Scorer(params) {
  return new BM25Scorer(params);
}

/**
 * BM25 parameters
 * @typedef {Object} BM25Params
 * @property {number} [k1=1.5] - Term frequency saturation parameter
 * @property {number} [b=0.75] - Length normalization parameter
 */

module.exports = {
  BM25Scorer,
  createBM25Scorer,
  DEFAULT_PARAMS,
};
