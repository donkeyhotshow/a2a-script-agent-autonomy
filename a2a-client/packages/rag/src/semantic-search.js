/**
 * Semantic Search - Code Understanding and Similarity Search
 * 
 * Provides semantic search capabilities using embedding models for code understanding.
 */

const { RAGSearcher } = require('./searcher');
const { ChunkManager } = require('./chunk-manager');
const { TFIDFService } = require('./tfidf');
const { createEmbeddingClient } = require('@a2a/embedding');

class SemanticSearcher extends RAGSearcher {
  constructor(config = {}) {
    super(config);
    
    // Initialize embedding client
    this.embeddingClient = createEmbeddingClient(config.embedding || {});
    
    // Vector index for semantic search
    this.vectorIndex = null;
    this.vectorIndexReady = false;
    
    // Cache for embeddings
    this.embeddingCache = new Map();
  }

  /**
   * Build vector index from RAG index
   */
  async buildVectorIndex() {
    if (this.vectorIndexReady) return;
    
    console.log('Building vector index...');
    
    const index = await this.loadIndex();
    
    // Create vector index
    this.vectorIndex = new Map();
    
    // Index all chunks with embeddings
    for (const chunk of index.chunks) {
      const embedding = await this.getEmbedding(chunk.content);
      this.vectorIndex.set(chunk.id || `${chunk.filePath}:${chunk.startLine}`, embedding);
    }
    
    this.vectorIndexReady = true;
    console.log('Vector index built');
  }

  /**
   * Get embedding for content (with caching)
   */
  async getEmbedding(content) {
    const cacheKey = content.substring(0, 100); // Use first 100 chars as cache key
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey);
    }
    
    const embedding = await this.embeddingClient.embed(content);
    this.embeddingCache.set(cacheKey, embedding);
    return embedding;
  }

  /**
   * Search for similar code chunks using semantic similarity
   */
  async searchSimilar(query, options = {}) {
    const limit = options.limit || 10;
    
    // Get query embedding
    const queryEmbedding = await this.getEmbedding(query);
    
    // Build vector index if not ready
    if (!this.vectorIndexReady) {
      await this.buildVectorIndex();
    }
    
    // Calculate similarities
    const similarities = [];
    for (const [chunkId, chunkEmbedding] of this.vectorIndex) {
      const similarity = this.calculateSimilarity(queryEmbedding, chunkEmbedding);
      similarities.push({ chunkId, similarity });
    }
    
    // Sort by similarity and get top results
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    const topResults = similarities.slice(0, limit);
    
    // Enrich with chunk data
    const index = await this.loadIndex();
    const chunkMap = new Map();
    for (const chunk of index.chunks) {
      const key = chunk.id || `${chunk.filePath}:${chunk.startLine}`;
      chunkMap.set(key, chunk);
    }
    
    return topResults.map(r => ({
      chunk: chunkMap.get(r.chunkId),
      similarity: r.similarity,
      details: { chunkId: r.chunkId }
    }));
  }

  /**
   * Search for similar functions/methods
   */
  async searchSimilarFunctions(query, options = {}) {
    const limit = options.limit || 10;
    
    // Get query embedding
    const queryEmbedding = await this.getEmbedding(query);
    
    // Build vector index if not ready
    if (!this.vectorIndexReady) {
      await this.buildVectorIndex();
    }
    
    // Filter for function/method chunks
    const functionChunks = [];
    for (const [chunkId, chunkEmbedding] of this.vectorIndex) {
      const chunk = this.getChunkById(chunkId);
      if (chunk && (chunk.type === 'function' || chunk.type === 'method')) {
        const similarity = this.calculateSimilarity(queryEmbedding, chunkEmbedding);
        functionChunks.push({ chunkId, similarity, chunk });
      }
    }
    
    // Sort by similarity and get top results
    functionChunks.sort((a, b) => b.similarity - a.similarity);
    
    return functionChunks.slice(0, limit).map(r => ({
      chunk: r.chunk,
      similarity: r.similarity,
      details: { chunkId: r.chunkId }
    }));
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1, embedding2) {
    // Simple dot product similarity for demonstration
    // In production, use proper cosine similarity or other metric
    let dotProduct = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
    }
    return dotProduct;
  }

  /**
   * Get chunk by ID
   */
  getChunkById(chunkId) {
    const index = await this.loadIndex();
    return index.chunks.find(c => c.id === chunkId || 
      `${c.filePath}:${c.startLine}` === chunkId);
  }

  /**
   * Hybrid search combining keyword, TF-IDF, and semantic search
   */
  async searchHybridSemantic(query, options = {}) {
    const limit = options.limit || 10;
    const keywordWeight = options.keywordWeight ?? 0.3;
    const tfidfWeight = options.tfidfWeight ?? 0.3;
    const semanticWeight = options.semanticWeight ?? 0.4;
    const k = options.k ?? 60; // RRF constant
    
    // Run all three searches in parallel
    const [keywordResults, tfidfResults, semanticResults] = await Promise.all([
      this.search(query, { limit: limit * 2 }),
      this.tfidf ? this.searchTFIDF(query, limit * 2) : Promise.resolve([]),
      this.searchSimilar(query, { limit: limit * 2 })
    ]);
    
    // RRF scoring for hybrid search
    const rrfScores = new Map();
    
    // Process keyword results
    for (let i = 0; i < keywordResults.length; i++) {
      const result = keywordResults[i];
      const id = result.chunk.id || `${result.chunk.filePath}:${result.chunk.startLine}`;
      const rrfContribution = keywordWeight * (1 / (k + i + 1));
      
      if (rrfScores.has(id)) {
        const existing = rrfScores.get(id);
        existing.score += rrfContribution;
        existing.keywordRank = i + 1;
        existing.keywordScore = result.score;
      } else {
        rrfScores.set(id, {
          chunk: result.chunk,
          score: rrfContribution,
          highlights: result.highlights,
          keywordRank: i + 1,
          keywordScore: result.score,
          tfidfRank: null,
          tfidfScore: 0,
          semanticRank: null,
          semanticScore: 0
        });
      }
    }
    
    // Process TF-IDF results
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
          tfidfScore: result.score,
          semanticRank: null,
          semanticScore: 0
        });
      }
    }
    
    // Process semantic results
    for (let i = 0; i < semanticResults.length; i++) {
      const result = semanticResults[i];
      const id = result.details.chunkId;
      const rrfContribution = semanticWeight * (1 / (k + i + 1));
      
      if (rrfScores.has(id)) {
        const existing = rrfScores.get(id);
        existing.score += rrfContribution;
        existing.semanticRank = i + 1;
        existing.semanticScore = result.similarity;
      } else if (result.chunk) {
        rrfScores.set(id, {
          chunk: result.chunk,
          score: rrfContribution,
          highlights: [],
          keywordRank: null,
          keywordScore: 0,
          tfidfRank: null,
          tfidfScore: 0,
          semanticRank: i + 1,
          semanticScore: result.similarity
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
          tfidfScore: r.tfidfScore,
          semanticRank: r.semanticRank,
          semanticScore: r.semanticScore
        }
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return results;
  }

  /**
   * Clear vector index and embeddings cache
   */
  clearVectorIndex() {
    this.vectorIndex = null;
    this.vectorIndexReady = false;
    this.embeddingCache.clear();
  }

  /**
   * Dispose resources
   */
  dispose() {
    super.dispose();
    this.clearVectorIndex();
    this.embeddingClient.dispose();
  }
}

module.exports = { SemanticSearcher };