/**
 * @a2a/embedding - Embedding Client Module
 *
 * Provides embedding generation for semantic search.
 * Supports Ollama (local), OpenAI, Cohere, Voyage AI, and more.
 *
 * @module @a2a/embedding
 * @version 1.0.0
 */

const crypto = require('crypto');

/**
 * Supported providers
 */
const PROVIDERS = {
  OLLAMA: 'ollama',
  OPENAI: 'openai',
  COHERE: 'cohere',
  VOYAGE: 'voyage',
  MOCK: 'mock',
};

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
  // OpenAI
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
  // Cohere
  'embed-multilingual-v3.0': 1024,
  'embed-english-v3.0': 1024,
  // Voyage
  'voyage-law-2': 1024,
  'voyage-code-2': 1536,
};

/**
 * Default models by provider
 */
const DEFAULT_MODELS = {
  ollama: 'nomic-embed-text',
  openai: 'text-embedding-3-small',
  cohere: 'embed-multilingual-v3.0',
  voyage: 'voyage-code-2',
};

/**
 * Create embedding client based on configuration
 * @param {Object} config - Configuration options
 * @param {string} [config.provider='ollama'] - Provider: 'ollama', 'openai', 'cohere', 'voyage', 'mock'
 * @param {string} [config.baseUrl] - Custom base URL (for Ollama, OpenAI compatible)
 * @param {string} [config.model] - Model name
 * @param {string} [config.apiKey] - API key for cloud providers
 * @param {string} [config.cacheFile] - Path to cache file for embeddings
 * @returns {EmbeddingClient}
 */
function createEmbeddingClient(config = {}) {
  return new EmbeddingClient(config);
}

/**
 * Embedding Client
 * Generates vector embeddings for text using various providers.
 */
class EmbeddingClient {
  constructor(config = {}) {
    this.provider = config.provider || PROVIDERS.OLLAMA;
    this.apiKey = config.apiKey || process.env.EMBEDDING_API_KEY;
    this.baseUrl = config.baseUrl;
    this.model = config.model || DEFAULT_MODELS[this.provider] || 'nomic-embed-text';
    
    // In-memory cache
    this.cache = new Map();
    
    // Cache file path (optional, for persistence)
    this.cacheFile = config.cacheFile || null;
    
    // Batch size for API calls
    this.batchSize = config.batchSize || 100;
    
    // Timeout
    this.timeout = config.timeout || 60000;
    
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
      case PROVIDERS.OLLAMA:
        embedding = await this._embedOllama(text);
        break;
      case PROVIDERS.OPENAI:
        embedding = await this._embedOpenAI(text);
        break;
      case PROVIDERS.COHERE:
        embedding = await this._embedCohere(text);
        break;
      case PROVIDERS.VOYAGE:
        embedding = await this._embedVoyage(text);
        break;
      case PROVIDERS.MOCK:
      default:
        embedding = this._embedDeterministic(text);
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

    // Batch API call
    if (toEmbed.length > 0 && this.provider !== PROVIDERS.MOCK) {
      let embeddings;
      switch (this.provider) {
        case PROVIDERS.OLLAMA:
          embeddings = await this._embedBatchOllama(toEmbed.map(t => t.text));
          break;
        case PROVIDERS.OPENAI:
          embeddings = await this._embedBatchOpenAI(toEmbed.map(t => t.text));
          break;
        case PROVIDERS.COHERE:
          embeddings = await this._embedBatchCohere(toEmbed.map(t => t.text));
          break;
        case PROVIDERS.VOYAGE:
          embeddings = await this._embedBatchVoyage(toEmbed.map(t => t.text));
          break;
        default:
          embeddings = toEmbed.map(t => this._embedDeterministic(t.text));
      }
      
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
        const embedding = this._embedDeterministic(text);
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
    const baseUrl = this.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  /**
   * Batch Ollama embedding
   * @private
   */
  async _embedBatchOllama(texts) {
    const allEmbeddings = [];
    const baseUrl = this.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      
      const batchEmbeddings = await Promise.all(
        batch.map(text => 
          fetch(`${baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: this.model, prompt: text }),
            signal: AbortSignal.timeout(this.timeout),
          }).then(r => r.json()).then(d => d.embedding).catch(() => this._zeroVector())
        )
      );
      
      allEmbeddings.push(...batchEmbeddings);
    }
    
    return allEmbeddings;
  }

  /**
   * OpenAI embedding API
   * @private
   */
  async _embedOpenAI(text) {
    const baseUrl = this.baseUrl || 'https://api.openai.com/v1';
    const apiKey = this.apiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key required');
    }
    
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Batch OpenAI embedding
   * @private
   */
  async _embedBatchOpenAI(texts) {
    const baseUrl = this.baseUrl || 'https://api.openai.com/v1';
    const apiKey = this.apiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key required');
    }
    
    // OpenAI supports batch embeddings
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.data.map(d => d.embedding);
  }

  /**
   * Cohere embedding API
   * @private
   */
  async _embedCohere(text) {
    const apiKey = this.apiKey || process.env.COHERE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Cohere API key required');
    }
    
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        texts: [text],
        input_type: 'search_document',
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cohere API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.embeddings[0];
  }

  /**
   * Batch Cohere embedding
   * @private
   */
  async _embedBatchCohere(texts) {
    const apiKey = this.apiKey || process.env.COHERE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Cohere API key required');
    }
    
    // Cohere supports up to 96 texts in batch
    const allEmbeddings = [];
    
    for (let i = 0; i < texts.length; i += 96) {
      const batch = texts.slice(i, i + 96);
      
      const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          texts: batch,
          input_type: 'search_document',
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cohere API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      allEmbeddings.push(...data.embeddings);
    }
    
    return allEmbeddings;
  }

  /**
   * Voyage AI embedding API
   * @private
   */
  async _embedVoyage(text) {
    const apiKey = this.apiKey || process.env.VOYAGE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Voyage AI API key required');
    }
    
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage AI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Batch Voyage AI embedding
   * @private
   */
  async _embedBatchVoyage(texts) {
    const apiKey = this.apiKey || process.env.VOYAGE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Voyage AI API key required');
    }
    
    // Voyage supports up to 64 texts in batch
    const allEmbeddings = [];
    
    for (let i = 0; i < texts.length; i += 64) {
      const batch = texts.slice(i, i + 64);
      
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: batch,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Voyage AI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      allEmbeddings.push(...data.data.map(d => d.embedding));
    }
    
    return allEmbeddings;
  }

  /**
   * Deterministic embedding for testing/fallback
   * Generates embeddings based on text hash
   * @private
   */
  _embedDeterministic(text) {
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
   * Check if provider is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      switch (this.provider) {
        case PROVIDERS.OLLAMA:
          const ollamaUrl = this.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
          const ollamaRes = await fetch(`${ollamaUrl}/api/tags`, { 
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          return ollamaRes.ok;
          
        case PROVIDERS.OPENAI:
          return !!this.apiKey || !!process.env.OPENAI_API_KEY;
          
        case PROVIDERS.COHERE:
          return !!this.apiKey || !!process.env.COHERE_API_KEY;
          
        case PROVIDERS.VOYAGE:
          return !!this.apiKey || !!process.env.VOYAGE_API_KEY;
          
        default:
          return true;
      }
    } catch (e) {
      return false;
    }
  }

  /**
   * List available models from provider
   * @returns {Promise<string[]>}
   */
  async listModels() {
    try {
      switch (this.provider) {
        case PROVIDERS.OLLAMA:
          const ollamaUrl = this.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
          const response = await fetch(`${ollamaUrl}/api/tags`);
          const data = await response.json();
          return data.models?.map(m => m.name) || [];
          
        default:
          return [this.model];
      }
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
  PROVIDERS,
  DIMENSIONS,
  DEFAULT_MODELS,
};
