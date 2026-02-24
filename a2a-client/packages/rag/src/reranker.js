/**
 * Reranker Client - Cross-encoder reranking for search results
 * 
 * Provides reranking using Cohere or Jina API to improve search result quality.
 * Reranking uses a cross-encoder to score query-document pairs more accurately.
 * 
 * @module @a2a/rag/reranker
 * @version 1.0.0
 */

/**
 * Supported reranker providers
 */
const PROVIDERS = {
  COHERE: 'cohere',
  JINA: 'jina',
  LOCAL: 'local',
};

/**
 * Default configurations for providers
 */
const DEFAULT_CONFIGS = {
  cohere: {
    model: 'rerank-multilingual-v3.0',
    maxChunks: 1000,
    returnDocuments: true,
  },
  jina: {
    model: 'jina-reranker-v2-base-multilingual',
    topN: 10,
  },
};

/**
 * Reranker client for improving search results
 */
class RerankerClient {
  /**
   * Create a reranker client
   * @param {Object} config - Configuration options
   * @param {string} [config.provider='cohere'] - Provider: 'cohere', 'jina', 'local'
   * @param {string} [config.apiKey] - API key for provider
   * @param {string} [config.baseUrl] - Custom base URL
   * @param {Object} [config.modelOptions] - Provider-specific options
   */
  constructor(config = {}) {
    this.provider = config.provider || PROVIDERS.COHERE;
    this.apiKey = config.apiKey || process.env.RERANKER_API_KEY;
    this.baseUrl = config.baseUrl;
    
    // Provider-specific configuration
    this.modelOptions = {
      ...DEFAULT_CONFIGS[this.provider],
      ...config.modelOptions,
    };
  }

  /**
   * Get headers for API requests
   * @returns {Object} Headers object
   * @private
   */
  _getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.provider === PROVIDERS.COHERE && this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else if (this.provider === PROVIDERS.JINA && this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  /**
   * Rerank search results using the configured provider
   * @param {string} query - Search query
   * @param {Array<{id: string, content: string}>} documents - Documents to rerank
   * @param {Object} options - Reranking options
   * @param {number} [options.topN=10] - Number of results to return
   * @returns {Promise<Array<{id: string, content: string, score: number}>>} Reranked results
   */
  async rerank(query, documents, options = {}) {
    if (!query || !documents || documents.length === 0) {
      return [];
    }
    
    const topN = options.topN || this.modelOptions.topN || 10;
    
    switch (this.provider) {
      case PROVIDERS.COHERE:
        return this._rerankCohere(query, documents, topN);
      case PROVIDERS.JINA:
        return this._rerankJina(query, documents, topN);
      case PROVIDERS.LOCAL:
        return this._rerankLocal(query, documents, topN);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  /**
   * Rerank using Cohere API
   * @param {string} query - Search query
   * @param {Array} documents - Documents to rerank
   * @param {number} topN - Number of results
   * @returns {Promise<Array>} Reranked results
   * @private
   */
  async _rerankCohere(query, documents, topN) {
    const url = this.baseUrl || 'https://api.cohere.com/v1/rerank';
    
    // Prepare documents for Cohere (string or object)
    const docStrings = documents.map(doc => 
      typeof doc === 'string' ? doc : (doc.content || doc.text || '')
    );
    
    const requestBody = {
      query,
      documents: docStrings,
      model: this.modelOptions.model,
      top_n: topN,
      return_documents: this.modelOptions.returnDocuments,
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cohere rerank error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    
    // Map results back to original documents
    return data.results.map(result => ({
      id: documents[result.index]?.id || String(result.index),
      content: result.document?.text || docStrings[result.index],
      score: result.relevance_score,
    }));
  }

  /**
   * Rerank using Jina API
   * @param {string} query - Search query
   * @param {Array} documents - Documents to rerank
   * @param {number} topN - Number of results
   * @returns {Promise<Array>} Reranked results
   * @private
   */
  async _rerankJina(query, documents, topN) {
    const url = this.baseUrl || 'https://api.jina.ai/v1/rerank';
    
    // Prepare documents for Jina
    const docObjects = documents.map((doc, idx) => ({
      id: doc.id || String(idx),
      text: typeof doc === 'string' ? doc : (doc.content || doc.text || ''),
    }));
    
    const requestBody = {
      query,
      documents: docObjects,
      model: this.modelOptions.model,
      top_n: topN,
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jina rerank error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    
    return data.results.map(result => ({
      id: docObjects[result.index].id,
      content: result.document.text,
      score: result.relevance_score,
    }));
  }

  /**
   * Local reranking (simple cross-encoder simulation)
   * Uses keyword matching as a fallback
   * @param {string} query - Search query
   * @param {Array} documents - Documents to rerank
   * @param {number} topN - Number of results
   * @returns {Array} Reranked results
   * @private
   */
  _rerankLocal(query, documents, topN) {
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    const scored = documents.map((doc, idx) => {
      const content = (typeof doc === 'string' ? doc : (doc.content || doc.text || '')).toLowerCase();
      
      // Simple scoring: count matching terms
      let score = 0;
      for (const term of queryTerms) {
        if (content.includes(term)) {
          score += 1;
        }
        // Bonus for exact match
        if (content === term) {
          score += 2;
        }
      }
      
      return {
        id: doc.id || String(idx),
        content: typeof doc === 'string' ? doc : (doc.content || doc.text || ''),
        score,
      };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, topN);
  }

  /**
   * Check if reranker is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (this.provider === PROVIDERS.LOCAL) {
      return true;
    }
    
    try {
      const url = this.baseUrl || (this.provider === PROVIDERS.COHERE 
        ? 'https://api.cohere.com/v1/models' 
        : 'https://api.jina.ai/v1/models');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this._getHeaders(),
      });
      
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get provider information
   * @returns {Object} Provider info
   */
  getInfo() {
    return {
      provider: this.provider,
      model: this.modelOptions.model,
      available: true, // Will be updated with isAvailable()
    };
  }
}

/**
 * Create a reranker client
 * @param {Object} config - Configuration options
 * @returns {RerankerClient}
 *
 * @example
 * // Using Cohere
 * const reranker = createReranker({
 *   provider: 'cohere',
 *   apiKey: process.env.COHERE_API_KEY,
 * });
 *
 * // Using Jina
 * const reranker = createReranker({
 *   provider: 'jina',
 *   apiKey: process.env.JINA_API_KEY,
 * });
 *
 * // Rerank results
 * const results = await reranker.rerank(
 *   'UserService methods',
 *   [{ id: '1', content: 'UserService class...' }, ...],
 *   { topN: 5 }
 * );
 */
function createReranker(config) {
  return new RerankerClient(config);
}

/**
 * Reranker configuration
 * @typedef {Object} RerankerConfig
 * @property {'cohere'|'jina'|'local'} [provider='cohere'] - Reranker provider
 * @property {string} [apiKey] - API key for provider
 * @property {string} [baseUrl] - Custom base URL
 * @property {Object} [modelOptions] - Provider-specific options
 */

/**
 * Rerank result
 * @typedef {Object} RerankResult
 * @property {string} id - Document identifier
 * @property {string} content - Document content
 * @property {number} score - Relevance score
 */

module.exports = {
  RerankerClient,
  createReranker,
  PROVIDERS,
  DEFAULT_CONFIGS,
};
