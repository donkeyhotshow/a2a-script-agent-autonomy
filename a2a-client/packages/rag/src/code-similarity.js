/**
 * Code Similarity Detection
 * 
 * Finds similar code patterns across the codebase.
 * Uses multiple metrics: Jaccard, cosine, edit distance.
 * 
 * @module @a2a/rag/code-similarity
 * @version 1.0.0
 */

/**
 * Code Similarity Engine
 */
class CodeSimilarityEngine {
  constructor(config = {}) {
    this.config = config;
    this.chunks = [];
    this.tokenIndex = new Map();  // token -> chunks
    this.minSimilarity = config.minSimilarity || 0.3;
  }

  /**
   * Index chunks for similarity search
   * @param {Array} chunks - Code chunks
   */
  index(chunks) {
    this.chunks = chunks;
    
    // Build token index
    this.tokenIndex.clear();
    
    for (let i = 0; i < chunks.length; i++) {
      const tokens = this._tokenize(chunks[i].content);
      const uniqueTokens = [...new Set(tokens)];
      
      for (const token of uniqueTokens) {
        if (!this.tokenIndex.has(token)) {
          this.tokenIndex.set(token, new Set());
        }
        this.tokenIndex.get(token).add(i);
      }
    }
  }

  /**
   * Tokenize code content
   * @param {string} content - Code content
   * @returns {Array} Tokens
   * @private
   */
  _tokenize(content) {
    if (!content) return [];
    
    return content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  /**
   * Find similar chunks
   * @param {string|Object} query - Query code or chunk
   * @param {Object} options - Options
   * @returns {Array} Similar chunks
   */
  findSimilar(query, options = {}) {
    const limit = options.limit || 5;
    const method = options.method || 'jaccard';
    const threshold = options.threshold || this.minSimilarity;
    
    // Get query tokens
    const queryContent = typeof query === 'string' ? query : query.content;
    const queryTokens = new Set(this._tokenize(queryContent));
    
    if (queryTokens.size === 0) {
      return [];
    }
    
    // Find candidate chunks
    const candidates = new Map();
    
    for (const token of queryTokens) {
      const chunkIndices = this.tokenIndex.get(token) || new Set();
      for (const idx of chunkIndices) {
        const current = candidates.get(idx) || 0;
        candidates.set(idx, current + 1);
      }
    }
    
    // Calculate similarity scores
    const results = [];
    for (const [idx, sharedCount] of candidates) {
      const chunk = this.chunks[idx];
      const chunkTokens = new Set(this._tokenize(chunk.content));
      
      let similarity;
      switch (method) {
        case 'cosine':
          similarity = this._cosineSimilarity(queryTokens, chunkTokens);
          break;
        case 'overlap':
          similarity = this._overlapCoefficient(queryTokens, chunkTokens);
          break;
        case 'dice':
          similarity = this._diceCoefficient(queryTokens, chunkTokens);
          break;
        case 'jaccard':
        default:
          similarity = this._jaccardSimilarity(queryTokens, chunkTokens);
      }
      
      if (similarity >= threshold) {
        results.push({
          chunk,
          similarity,
          sharedTokens: sharedCount,
        });
      }
    }
    
    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);
    
    return results.slice(0, limit);
  }

  /**
   * Jaccard similarity
   * @param {Set} a - Token set A
   * @param {Set} b - Token set B
   * @returns {number} Similarity score
   * @private
   */
  _jaccardSimilarity(a, b) {
    const intersection = new Set([...a].filter(x => b.has(x)));
    const union = new Set([...a, ...b]);
    return intersection.size / union.size;
  }

  /**
   * Cosine similarity
   * @param {Set} a - Token set A
   * @param {Set} b - Token set B
   * @returns {number} Similarity score
   * @private
   */
  _cosineSimilarity(a, b) {
    const intersection = new Set([...a].filter(x => b.has(x)));
    const magnitudeA = Math.sqrt(a.size);
    const magnitudeB = Math.sqrt(b.size);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return intersection.size / (magnitudeA * magnitudeB);
  }

  /**
   * Overlap coefficient
   * @param {Set} a - Token set A
   * @param {Set} b - Token set B
   * @returns {number} Similarity score
   * @private
   */
  _overlapCoefficient(a, b) {
    const intersection = new Set([...a].filter(x => b.has(x)));
    return intersection.size / Math.min(a.size, b.size);
  }

  /**
   * Dice coefficient
   * @param {Set} a - Token set A
   * @param {Set} b - Token set B
   * @returns {number} Similarity score
   * @private
   */
  _diceCoefficient(a, b) {
    const intersection = new Set([...a].filter(x => b.has(x)));
    return (2 * intersection.size) / (a.size + b.size);
  }

  /**
   * Find duplicate code blocks
   * @param {Object} options - Options
   * @returns {Array} Duplicate groups
   */
  findDuplicates(options = {}) {
    const threshold = options.threshold || 0.8;
    const duplicates = [];
    const processed = new Set();
    
    for (let i = 0; i < this.chunks.length; i++) {
      if (processed.has(i)) continue;
      
      const group = [this.chunks[i]];
      processed.add(i);
      
      for (let j = i + 1; j < this.chunks.length; j++) {
        if (processed.has(j)) continue;
        
        const similarity = this._jaccardSimilarity(
          new Set(this._tokenize(this.chunks[i].content)),
          new Set(this._tokenize(this.chunks[j].content))
        );
        
        if (similarity >= threshold) {
          group.push(this.chunks[j]);
          processed.add(j);
        }
      }
      
      if (group.length > 1) {
        duplicates.push({
          chunks: group,
          avgSimilarity: this._calculateGroupSimilarity(group),
        });
      }
    }
    
    return duplicates;
  }

  /**
   * Calculate average similarity within group
   * @param {Array} group - Chunk group
   * @returns {number} Average similarity
   * @private
   */
  _calculateGroupSimilarity(group) {
    let total = 0;
    let count = 0;
    
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        total += this._jaccardSimilarity(
          new Set(this._tokenize(group[i].content)),
          new Set(this._tokenize(group[j].content))
        );
        count++;
      }
    }
    
    return count > 0 ? total / count : 0;
  }

  /**
   * Get stats
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      totalChunks: this.chunks.length,
      uniqueTokens: this.tokenIndex.size,
      minSimilarity: this.minSimilarity,
    };
  }
}

/**
 * Create similarity engine
 * @param {Object} config - Configuration
 * @returns {CodeSimilarityEngine}
 */
function createSimilarityEngine(config) {
  return new CodeSimilarityEngine(config);
}

module.exports = {
  CodeSimilarityEngine,
  createSimilarityEngine,
};
