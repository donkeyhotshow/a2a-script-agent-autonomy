/**
 * @a2a/embedding - Embedding Client Module
 *
 * Provides embedding generation for semantic search.
 * Supports Ollama (local) and mock for testing.
 *
 * @module @a2a/embedding
 */

const crypto = require('crypto');

/**
 * Ollama model dimension constants
 */
const DIMENSIONS = {
  'nomic-embed-text': 768,
  'mxbai-embed-large': 1536,
  'bge-m3': 1024,
  'bge-large': 1024,
  'bge-small': 384,
  'sentence-transformers': 384,
};

/**
 * Default Ollama models for code
 */
const DEFAULT_MODELS = {
  code: 'nomic-embed-text',
  general: 'mxbai-embed-large',
};

/**
 * Create embedding client based on configuration
 * @param {Object} config - Configuration options
 * @param {string} [config.provider='ollama'] - Provider: 'ollama', 'mock'
 * @param {string} [config.baseUrl='http://localhost:11434'] - Ollama base URL
 * @param {string} [config.model='nomic-embed-text'] - Model name
 * @param {string} [config.cacheFile] - Path to cache file for embeddings
 * @returns {EmbeddingClient}
 */
function createEmbeddingClient(config = {}) {
  return new EmbeddingClient(config);
}

/**
 * Embedding Client
 * Generates vector embeddings for text using Ollama (local).
 */
class EmbeddingClient {
  constructor(config = {}) {
    this.provider = config.provider || 'ollama';
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = config.model || DEFAULT_MODELS.code;
    
    // In-memory cache
    this.cache = new Map();
    
    // Cache file path (optional, for persistence)
    this.cacheFile = config.cacheFile || null;
    
    // Batch size for API calls
    this.batchSize = config.batchSize || 100;
    
    // Initialize cache from file if available
    this._loadCache();
  }

  /**
   * Get embedding dimension for current model
   * @returns {number}
   */
  getDimension() {
    return DIMENSIONS[this.model] || 768;
  }

  /**
   * Generate hash for text (cache key)
   * @private
   */
  _hashText(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * Load cache from file
   * @private
   */
  async _loadCache() {
    if (!this.cacheFile) return;
    
    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(this.cacheFile, 'utf-8');
      const data = JSON.parse(content);
      this.cache = new Map(data);
    } catch (e) {
      // Cache file doesn't exist or is invalid
    }
  }

  /**
   * Save cache to file
   * @private
   */
  async _saveCache() {
    if (!this.cacheFile) return;
    
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const dir = path.dirname(this.cacheFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.cacheFile, JSON.stringify([...this.cache]));
    } catch (e) {
      console.warn('[EmbeddingClient] Failed to save cache:', e.message);
    }
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async embed(text) {
    if (!text || text.trim().length === 0) {
      return this._zeroVector();
    }

    const cacheKey = this._hashText(text);
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Generate embedding based on provider
    let embedding;
    switch (this.provider) {
      case 'ollama':
        embedding = await this._embedOllama(text);
        break;
      case 'mock':
      default:
        embedding = this._embedMock(text);
    }

    // Cache result
    this.cache.set(cacheKey, embedding);
    
    // Optionally persist cache
    if (this.cacheFile) {
      this._saveCache();
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} Array of embedding vectors
   */
  async embedBatch(texts) {
    // Filter and cache existing
    const results = [];
    const toEmbed = [];
    
    for (const text of texts) {
      if (!text || text.trim().length === 0) {
        results.push(this._zeroVector());
        continue;
      }
      
      const cacheKey = this._hashText(text);
      if (this.cache.has(cacheKey)) {
        results.push(this.cache.get(cacheKey));
      } else {
        results.push(null);
        toEmbed.push({ text, cacheKey });
      }
    }

    // Batch API call if needed
    if (toEmbed.length > 0 && this.provider === 'ollama') {
      const embeddings = await this._embedBatchOllama(toEmbed.map(t => t.text));
      
      for (let i = 0; i < toEmbed.length; i++) {
        const { cacheKey } = toEmbed[i];
        const embedding = embeddings[i];
        
        if (embedding) {
          this.cache.set(cacheKey, embedding);
          results[results.indexOf(null)] = embedding;
        }
      }
    } else if (toEmbed.length > 0) {
      // Mock provider
      for (const { text, cacheKey } of toEmbed) {
        const embedding = this._embedMock(text);
        this.cache.set(cacheKey, embedding);
        results[results.indexOf(null)] = embedding;
      }
    }

    // Persist cache
    if (this.cacheFile && toEmbed.length > 0) {
      this._saveCache();
    }

    return results;
  }

  /**
   * Ollama embedding API
   * @private
   */
  async _embedOllama(text) {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  /**
   * Batch Ollama embedding (processes in batches)
   * @private
   */
  async _embedBatchOllama(texts) {
    const allEmbeddings = [];
    
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      
      // Ollama doesn't support batch embeddings in one call,
      // so we make parallel requests
      const batchEmbeddings = await Promise.all(
        batch.map(text => this._embedOllama(text).catch(() => this._zeroVector()))
      );
      
      allEmbeddings.push(...batchEmbeddings);
    }
    
    return allEmbeddings;
  }

  /**
   * Mock embedding for testing
   * Generates deterministic embeddings based on text hash
   * @private
   */
  _embedMock(text) {
    const dimension = this.getDimension();
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding = new Array(dimension);
    
    // Use hash bytes to generate deterministic embedding
    for (let i = 0; i < dimension; i++) {
      embedding[i] = (hash[i % hash.length] - 128) / 128;
    }
    
    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / magnitude);
  }

  /**
   * Zero vector
   * @private
   */
  _zeroVector() {
    const dimension = this.getDimension();
    return new Array(dimension).fill(0);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      provider: this.provider,
      model: this.model,
      dimension: this.getDimension(),
      baseUrl: this.baseUrl,
    };
  }

  /**
   * Check if Ollama is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * List available models from Ollama
   * @returns {Promise<string[]>}
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models?.map(m => m.name) || [];
    } catch (e) {
      console.warn('[EmbeddingClient] Failed to list models:', e.message);
      return [];
    }
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.clearCache();
  }
}

module.exports = {
  EmbeddingClient,
  createEmbeddingClient,
  DIMENSIONS,
  DEFAULT_MODELS,
};
