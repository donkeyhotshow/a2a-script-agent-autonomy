/**
 * RAG Searcher - Search in indexed files
 * 
 * Локальный поиск по индексу без использования LLM.
 * Поддерживает гибридный поиск: keyword-based + TF-IDF/BM25.
 */

const fs = require('fs').promises;
const path = require('path');
const { TFIDFService } = require('./tfidf');

class RAGSearcher {
  constructor(config = {}) {
    this.projectPath = config.projectPath || process.cwd();
    this.indexPath = path.join(this.projectPath, '.a2a', 'index');
    this.index = null;
    
    // TF-IDF integration
    this.useTFIDF = config.useTFIDF !== false;
    this.tfidf = this.useTFIDF ? new TFIDFService() : null;
    this.tfidfIndexed = false;
  }

  /**
   * Load index if not loaded
   */
  async loadIndex() {
    if (this.index) return this.index;
    
    try {
      const indexPath = path.join(this.indexPath, 'rag-files.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      this.index = JSON.parse(content);
      return this.index;
    } catch (err) {
      console.warn('Index not found. Run `a2a index` first.');
      return { files: [], chunks: [] };
    }
  }

  /**
   * Index a single document in TF-IDF
   * @param {string} id - Document identifier
   * @param {string} content - Document content
   */
  indexDocument(id, content) {
    if (this.tfidf) {
      this.tfidf.addDocument(id, content);
    }
  }

  /**
   * Index multiple documents in TF-IDF
   * @param {Array<{id: string, content: string}>} documents - Documents to index
   */
  indexDocuments(documents) {
    if (this.tfidf) {
      this.tfidf.addDocuments(documents.map(doc => ({
        id: doc.id,
        text: doc.content
      })));
    }
  }

  /**
   * Build TF-IDF index from loaded RAG index
   * @returns {Promise<void>}
   */
  async buildTFIDFIndex() {
    if (!this.tfidf) {
      throw new Error('TF-IDF not enabled');
    }
    
    const index = await this.loadIndex();
    
    // Clear existing TF-IDF index
    this.tfidf.clear();
    
    // Index all chunks
    for (const chunk of index.chunks) {
      this.tfidf.addDocument(chunk.id || `${chunk.filePath}:${chunk.startLine}`, chunk.content);
    }
    
    this.tfidfIndexed = true;
  }

  /**
   * Search using TF-IDF/BM25
   * @param {string} query - Search query
   * @param {number} [topK=10] - Number of results
   * @returns {Promise<Array<{id: string, score: number, chunk?: object}>>}
   */
  async searchTFIDF(query, topK = 10) {
    if (!this.tfidf) {
      throw new Error('TF-IDF not enabled');
    }
    
    // Build index if not done
    if (!this.tfidfIndexed) {
      await this.buildTFIDFIndex();
    }
    
    const results = this.tfidf.search(query, topK);
    
    // Enrich results with chunk data
    const index = await this.loadIndex();
    const chunkMap = new Map();
    for (const chunk of index.chunks) {
      const key = chunk.id || `${chunk.filePath}:${chunk.startLine}`;
      chunkMap.set(key, chunk);
    }
    
    return results.map(r => ({
      ...r,
      chunk: chunkMap.get(r.id)
    }));
  }

  /**
   * Hybrid search combining keyword-based and TF-IDF results using RRF
   * 
   * Uses Reciprocal Rank Fusion (RRF) algorithm for combining results:
   * RRF(d) = Σ 1/(k + rank(d))
   * 
   * RRF is more robust than score normalization because:
   * - It uses ranks instead of raw scores (less sensitive to outliers)
   * - Works well when different search methods produce different score scales
   * - Standard approach in modern hybrid search systems
   * 
   * @param {string} query - Search query
   * @param {Object} [options={}] - Search options
   * @param {number} [options.limit=10] - Max results
   * @param {number} [options.keywordWeight=0.5] - Weight for keyword search (0-1)
   * @param {number} [options.tfidfWeight=0.5] - Weight for TF-IDF search (0-1)
   * @param {number} [options.k=60] - RRF constant (standard value: 60)
   * @returns {Promise<Array<{chunk: object, score: number, highlights: string[]}>>}
   */
  async searchHybrid(query, options = {}) {
    const limit = options.limit || 10;
    const keywordWeight = options.keywordWeight ?? 0.5;
    const tfidfWeight = options.tfidfWeight ?? 0.5;
    const k = options.k ?? 60; // RRF constant (standard value)
    
    // Run both searches in parallel (get more results for better RRF ranking)
    const [keywordResults, tfidfResults] = await Promise.all([
      this.search(query, { limit: limit * 2 }),
      this.tfidf ? this.searchTFIDF(query, limit * 2) : Promise.resolve([])
    ]);
    
    // RRF scoring: score(d) = Σ weight_i * (1 / (k + rank_i(d)))
    const rrfScores = new Map();
    
    // Process keyword results with RRF
    for (let i = 0; i < keywordResults.length; i++) {
      const result = keywordResults[i];
      const id = result.chunk.id || `${result.chunk.filePath}:${result.chunk.startLine}`;
      const rrfContribution = keywordWeight * (1 / (k + i + 1));
      
      if (rrfScores.has(id)) {
        const existing = rrfScores.get(id);
        existing.score += rrfContribution;
        existing.keywordRank = i + 1;
        existing.keywordScore = result.score;
        // Merge highlights
        if (result.highlights) {
          existing.highlights = [...new Set([...existing.highlights, ...result.highlights])];
        }
      } else {
        rrfScores.set(id, {
          chunk: result.chunk,
          score: rrfContribution,
          highlights: result.highlights || [],
          keywordRank: i + 1,
          keywordScore: result.score,
          tfidfRank: null,
          tfidfScore: 0
        });
      }
    }
    
    // Process TF-IDF results with RRF
    for (let i = 0; i < tfidfResults.length; i++) {
      const result = tfidfResults[i];
      const id = result.id;
      const rrfContribution = tfidfWeight * (1 / (k + i + 1));
      
      if (rrfScores.has(id)) {
        const existing = rrfScores.get(id);
        existing.score += rrfContribution;
        existing.tfidfRank = i + 1;
        existing.tfidfScore = result.score;
      } else if (result.chunk) {
        rrfScores.set(id, {
          chunk: result.chunk,
          score: rrfContribution,
          highlights: [],
          keywordRank: null,
          keywordScore: 0,
          tfidfRank: i + 1,
          tfidfScore: result.score
        });
      }
    }
    
    // Sort by RRF score and limit
    const results = [...rrfScores.values()]
      .map(r => ({
        chunk: r.chunk,
        score: r.score,
        highlights: r.highlights.slice(0, 5),
        details: {
          keywordRank: r.keywordRank,
          keywordScore: r.keywordScore,
          tfidfRank: r.tfidfRank,
          tfidfScore: r.tfidfScore
        }
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return results;
  }

  /**
   * Get TF-IDF statistics
   * @returns {object|null}
   */
  getTFIDFStats() {
    return this.tfidf ? this.tfidf.getStats() : null;
  }

  /**
   * Clear TF-IDF index
   */
  clearTFIDFIndex() {
    if (this.tfidf) {
      this.tfidf.clear();
      this.tfidfIndexed = false;
    }
  }

  /**
   * Search for relevant files
   */
  async search(query, options = {}) {
    const index = await this.loadIndex();
    const results = [];
    
    // Extract keywords from query
    const keywords = this.extractKeywords(query);
    
    // Search in chunks
    for (const chunk of index.chunks) {
      const score = this.scoreChunk(chunk, keywords, query);
      if (score > 0) {
        results.push({
          chunk,
          score,
          highlights: this.findHighlights(chunk.content, keywords),
        });
      }
    }
    
    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    const limit = options.limit || 10;
    
    return results.slice(0, limit);
  }

  /**
   * Search for files matching pattern
   */
  async searchFiles(pattern, options = {}) {
    const index = await this.loadIndex();
    const results = [];
    
    for (const file of index.files) {
      if (this.matchPattern(file.path, pattern)) {
        results.push(file);
      }
    }
    
    return results;
  }

  /**
   * Get file content
   */
  async getFileContent(relativePath) {
    const fullPath = path.join(this.projectPath, relativePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Get chunks for file
   */
  async getFileChunks(relativePath) {
    const index = await this.loadIndex();
    return index.chunks.filter(c => c.filePath === relativePath);
  }

  /**
   * Extract keywords from query
   */
  extractKeywords(query) {
    // Remove common words
    const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 
                       'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                       'would', 'could', 'should', 'may', 'might', 'must', 'shall',
                       'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
                       'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
                       'добавь', 'создай', 'удали', 'измени', 'покажи', 'найди'];
    
    // Extract words
    const words = query.toLowerCase()
      .replace(/[^\w\sа-яё]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.includes(w));
    
    // Also extract technical terms
    const techTerms = query.match(/[A-Z][a-z]+[A-Z][a-z]+/g) || []; // CamelCase
    const classNames = query.match(/\b[A-Z][a-zA-Z]+\b/g) || []; // Class names
    const methodNames = query.match(/\b[a-z][a-zA-Z]+\(\)/g) || []; // Method calls
    
    return {
      words,
      techTerms: [...techTerms, ...classNames],
      methodNames: methodNames.map(m => m.replace('()', '')),
    };
  }

  /**
   * Score chunk relevance
   */
  scoreChunk(chunk, keywords, originalQuery) {
    let score = 0;
    const content = chunk.content.toLowerCase();
    
    // Score by keyword matches
    for (const word of keywords.words) {
      const regex = new RegExp(word, 'gi');
      const matches = content.match(regex);
      if (matches) {
        score += matches.length * 2;
      }
    }
    
    // Higher score for technical terms
    for (const term of keywords.techTerms) {
      if (content.toLowerCase().includes(term.toLowerCase())) {
        score += 10;
      }
    }
    
    // Higher score for method names
    for (const method of keywords.methodNames) {
      if (content.includes(method)) {
        score += 15;
      }
    }
    
    // Bonus for chunk type
    if (chunk.type === 'class' || chunk.type === 'method') {
      score *= 1.2;
    }
    
    // Bonus for name match
    if (chunk.name && keywords.techTerms.some(t => 
      chunk.name.toLowerCase().includes(t.toLowerCase())
    )) {
      score += 20;
    }
    
    return score;
  }

  /**
   * Find highlights in content
   */
  findHighlights(content, keywords) {
    const highlights = [];
    const allTerms = [
      ...keywords.words,
      ...keywords.techTerms,
      ...keywords.methodNames,
    ];
    
    for (const term of allTerms) {
      const regex = new RegExp(`.{0,50}${term}.{0,50}`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        highlights.push(...matches.slice(0, 2));
      }
    }
    
    return [...new Set(highlights)].slice(0, 5);
  }

  /**
   * Simple pattern matching
   */
  matchPattern(path, pattern) {
    // Use placeholder to avoid ** being processed as two *
    const regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots first
      .replace(/\*\*/g, '{{GLOBSTAR}}')  // Replace ** with placeholder
      .replace(/\*/g, '[^/]*')  // Replace single *
      .replace(/{{GLOBSTAR}}/g, '.*');  // Replace placeholder with .*
    
    const regex = new RegExp(regexPattern);
    return regex.test(path);
  }

}

module.exports = { RAGSearcher };
