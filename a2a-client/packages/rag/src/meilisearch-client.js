/**
 * Meilisearch Client - Integration with Meilisearch for BM25 search
 * 
 * Provides integration with Meilisearch for full-text search with BM25 ranking.
 * Meilisearch is a fast, open-source search engine perfect for code search.
 * 
 * @module @a2a/rag/meilisearch
 * @version 1.0.0
 */

/**
 * Default Meilisearch index settings
 */
const DEFAULT_SETTINGS = {
  searchableAttributes: [
    'content',
    'name',
    'path',
    'type',
  ],
  filterableAttributes: [
    'type',
    'extension',
    'framework',
  ],
  sortableAttributes: [
    'score',
    'lastModified',
    'path',
  ],
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
  ],
};

/**
 * Meilisearch client for code search
 */
class MeilisearchClient {
  /**
   * Create a Meilisearch client
   * @param {Object} config - Configuration options
   * @param {string} [config.host='http://localhost:7700'] - Meilisearch host URL
   * @param {string} [config.apiKey] - Meilisearch API key
   * @param {string} [config.indexName='code'] - Index name
   */
  constructor(config = {}) {
    this.host = config.host || process.env.MEILISEARCH_HOST || 'http://localhost:7700';
    this.apiKey = config.apiKey || process.env.MEILISEARCH_API_KEY;
    this.indexName = config.indexName || 'code';
    
    this.index = null;
    this.initialized = false;
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
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  /**
   * Initialize the client and create/index if needed
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Check if index exists
      const indexes = await this._getIndexes();
      const exists = indexes.some(idx => idx.uid === this.indexName);
      
      if (!exists) {
        await this._createIndex();
      }
      
      // Configure index
      await this._configureIndex();
      
      this.initialized = true;
    } catch (error) {
      console.error('[MeilisearchClient] Failed to initialize:', error.message);
      throw error;
    }
  }

  /**
   * Get list of indexes
   * @returns {Promise<Array>} Indexes
   * @private
   */
  async _getIndexes() {
    const response = await fetch(`${this.host}/indexes`, {
      method: 'GET',
      headers: this._getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get indexes: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
  }

  /**
   * Create a new index
   * @returns {Promise<void>}
   * @private
   */
  async _createIndex() {
    const response = await fetch(`${this.host}/indexes`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({
        uid: this.indexName,
        primaryKey: 'id',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create index: ${response.status}`);
    }
    
    // Wait for index to be ready
    await this._waitForIndex();
  }

  /**
   * Wait for index to be ready
   * @returns {Promise<void>}
   * @private
   */
  async _waitForIndex() {
    const maxAttempts = 10;
    const delay = 500;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.host}/indexes/${this.indexName}`, {
          method: 'GET',
          headers: this._getHeaders(),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ready') {
            return;
          }
        }
      } catch (e) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Index did not become ready in time');
  }

  /**
   * Configure index settings
   * @returns {Promise<void>}
   * @private
   */
  async _configureIndex() {
    const response = await fetch(`${this.host}/indexes/${this.indexName}/settings`, {
      method: 'PATCH',
      headers: this._getHeaders(),
      body: JSON.stringify(DEFAULT_SETTINGS),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to configure index: ${response.status}`);
    }
  }

  /**
   * Add or update documents in the index
   * @param {Array<Object>} documents - Documents to index
   * @returns {Promise<string>} Task UID
   */
  async addDocuments(documents) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const response = await fetch(`${this.host}/indexes/${this.indexName}/documents`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(documents),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add documents: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return data.taskUid;
  }

  /**
   * Search documents
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} [options.limit=20] - Maximum results
   * @param {string[]} [options.filter] - Filter expressions
   * @param {string[]} [options.attributesToRetrieve] - Attributes to return
   * @returns {Promise<Object>} Search results
   */
  async search(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const searchParams = {
      q: query,
      limit: options.limit || 20,
      offset: options.offset || 0,
    };
    
    if (options.filter && options.filter.length > 0) {
      searchParams.filter = options.filter;
    }
    
    if (options.attributesToRetrieve) {
      searchParams.attributesToRetrieve = options.attributesToRetrieve;
    }
    
    if (options.attributesToHighlight) {
      searchParams.attributesToHighlight = options.attributesToHighlight;
    }
    
    const response = await fetch(`${this.host}/indexes/${this.indexName}/search`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(searchParams),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Search failed: ${response.status} ${error}`);
    }
    
    return response.json();
  }

  /**
   * Delete a document by ID
   * @param {string} id - Document ID
   * @returns {Promise<string>} Task UID
   */
  async deleteDocument(id) {
    const response = await fetch(`${this.host}/indexes/${this.indexName}/documents/${id}`, {
      method: 'DELETE',
      headers: this._getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.status}`);
    }
    
    const data = await response.json();
    return data.taskUid;
  }

  /**
   * Delete all documents
   * @returns {Promise<string>} Task UID
   */
  async deleteAllDocuments() {
    const response = await fetch(`${this.host}/indexes/${this.indexName}/documents`, {
      method: 'DELETE',
      headers: this._getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete all documents: ${response.status}`);
    }
    
    const data = await response.json();
    return data.taskUid;
  }

  /**
   * Get index statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    const response = await fetch(`${this.host}/indexes/${this.indexName}/stats`, {
      method: 'GET',
      headers: this._getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Check if Meilisearch is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.host}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get health status
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    const response = await fetch(`${this.host}/health`, {
      method: 'GET',
      headers: this._getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    return response.json();
  }
}

/**
 * Create a Meilisearch client
 * @param {Object} config - Configuration options
 * @returns {MeilisearchClient}
 *
 * @example
 * const client = createMeilisearchClient({
 *   host: 'http://localhost:7700',
 *   apiKey: 'masterKey',
 *   indexName: 'code',
 * });
 *
 * // Initialize
 * await client.initialize();
 *
 * // Add documents
 * await client.addDocuments([
 *   { id: '1', path: 'UserService.php', content: 'class UserService...', type: 'class' },
 * ]);
 *
 * // Search
 * const results = await client.search('UserService', { limit: 10 });
 */
function createMeilisearchClient(config) {
  return new MeilisearchClient(config);
}

/**
 * Meilisearch configuration
 * @typedef {Object} MeilisearchConfig
 * @property {string} [host='http://localhost:7700'] - Meilisearch host URL
 * @property {string} [apiKey] - Meilisearch API key
 * @property {string} [indexName='code'] - Index name
 */

/**
 * Document to be indexed
 * @typedef {Object} MeilisearchDocument
 * @property {string} id - Unique document ID
 * @property {string} path - File path
 * @property {string} content - File content
 * @property {string} name - File/directory name
 * @property {string} type - Type (class, function, method, etc.)
 * @property {string} extension - File extension
 * @property {string} framework - Framework name
 * @property {number} lastModified - Last modified timestamp
 */

module.exports = {
  MeilisearchClient,
  createMeilisearchClient,
  DEFAULT_SETTINGS,
};
