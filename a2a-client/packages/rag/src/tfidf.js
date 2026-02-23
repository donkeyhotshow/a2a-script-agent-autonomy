/**
 * TF-IDF/BM25 Service for sparse retrieval
 * 
 * Implements BM25 ranking algorithm for text search.
 * Part of the RAG module for local indexing and search.
 * 
 * @module @a2a/rag/tfidf
 */

/**
 * TFIDFService - BM25-based text search
 * 
 * Provides sparse retrieval using TF-IDF weighting with BM25 ranking.
 * Suitable for keyword-based search and lexical matching.
 */
class TFIDFService {
  constructor() {
    this.documents = new Map(); // id -> tokens
    this.idf = new Map(); // term -> idf score
    this.documentCount = 0;
  }

  /**
   * Tokenize text into terms
   * @param {string} text - Input text to tokenize
   * @returns {string[]} Array of tokens
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  /**
   * Add a document to the index
   * @param {string} id - Unique document identifier
   * @param {string} text - Document text content
   */
  addDocument(id, text) {
    const tokens = this.tokenize(text);
    this.documents.set(id, tokens);
    this.documentCount++;
    this.recalculateIDF();
  }

  /**
   * Add multiple documents at once (more efficient)
   * @param {Array<{id: string, text: string}>} docs - Array of documents
   */
  addDocuments(docs) {
    for (const { id, text } of docs) {
      const tokens = this.tokenize(text);
      this.documents.set(id, tokens);
      this.documentCount++;
    }
    this.recalculateIDF();
  }

  /**
   * Remove a document from the index
   * @param {string} id - Document identifier to remove
   */
  removeDocument(id) {
    if (this.documents.has(id)) {
      this.documents.delete(id);
      this.documentCount--;
      this.recalculateIDF();
    }
  }

  /**
   * Clear all documents from the index
   */
  clear() {
    this.documents.clear();
    this.idf.clear();
    this.documentCount = 0;
  }

  /**
   * Recalculate IDF values for all terms
   * @private
   */
  recalculateIDF() {
    const df = new Map();
    
    for (const tokens of this.documents.values()) {
      const unique = new Set(tokens);
      for (const term of unique) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    }

    for (const [term, freq] of df) {
      this.idf.set(term, Math.log(this.documentCount / freq));
    }
  }

  /**
   * Calculate BM25 score for a document
   * @param {string[]} queryTokens - Tokenized query
   * @param {string[]} docTokens - Document tokens
   * @param {number} [k1=1.5] - Term frequency saturation parameter
   * @param {number} [b=0.75] - Document length normalization parameter
   * @returns {number} BM25 score
   */
  bm25Score(queryTokens, docTokens, k1 = 1.5, b = 0.75) {
    const avgDocLen = this.getAverageDocLength();
    const docLen = docTokens.length;
    const tf = new Map();

    for (const token of docTokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    let score = 0;
    for (const term of queryTokens) {
      const termFreq = tf.get(term) || 0;
      const idf = this.idf.get(term) || 0;
      
      const numerator = termFreq * (k1 + 1);
      const denominator = termFreq + k1 * (1 - b + b * (docLen / avgDocLen));
      
      score += idf * (numerator / denominator);
    }

    return score;
  }

  /**
   * Search for documents matching the query
   * @param {string} query - Search query
   * @param {number} [topK=10] - Number of top results to return
   * @returns {Array<{id: string, score: number}>} Ranked search results
   */
  search(query, topK = 10) {
    const queryTokens = this.tokenize(query);
    const scores = [];

    for (const [id, docTokens] of this.documents) {
      const score = this.bm25Score(queryTokens, docTokens);
      if (score > 0) {
        scores.push({ id, score });
      }
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Get the average document length in tokens
   * @returns {number} Average document length
   */
  getAverageDocLength() {
    if (this.documents.size === 0) return 0;
    let total = 0;
    for (const tokens of this.documents.values()) {
      total += tokens.length;
    }
    return total / this.documents.size;
  }

  /**
   * Get statistics about the index
   * @returns {{documentCount: number, vocabularySize: number, avgDocLength: number}}
   */
  getStats() {
    return {
      documentCount: this.documentCount,
      vocabularySize: this.idf.size,
      avgDocLength: this.getAverageDocLength()
    };
  }

  /**
   * Check if a document exists in the index
   * @param {string} id - Document identifier
   * @returns {boolean}
   */
  hasDocument(id) {
    return this.documents.has(id);
  }

  /**
   * Get the number of documents in the index
   * @returns {number}
   */
  size() {
    return this.documents.size;
  }
}

module.exports = { TFIDFService };
