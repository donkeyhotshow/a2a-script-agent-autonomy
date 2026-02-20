/**
 * @a2a/api-client - HTTP client for A2A server communication
 * 
 * Provides methods for:
 * - Creating and managing task cards
 * - Answering server questions
 * - Reporting command execution results
 * - Managing card lifecycle
 * 
 * @module @a2a/api-client
 */

const fetch = require('node-fetch');

/**
 * API Error class for handling HTTP errors
 */
class ApiError extends Error {
  /**
   * Create an API error
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {Object} data - Additional error data
   */
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * API Client for A2A server communication
 */
class ApiClient {
  /**
   * Create an API client instance
   * @param {Object} config - Configuration options
   * @param {string} config.serverUrl - Server URL (default: http://localhost:3000/v1)
   * @param {string} [config.token] - Authentication token
   * @param {string} [config.clientId] - Client identifier
   * @param {number} [config.timeout=30000] - Request timeout in ms
   */
  constructor(config) {
    this.serverUrl = config.serverUrl || 'http://localhost:3000/v1';
    this.token = config.token;
    this.clientId = config.clientId;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Make HTTP request to server
   * @private
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {Object|null} body - Request body
   * @returns {Promise<Object>} Response data
   * @throws {ApiError} On request failure
   */
  async request(method, path, body = null) {
    const url = `${this.serverUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.clientId) {
      headers['X-Client-ID'] = this.clientId;
    }

    const options = {
      method,
      headers,
      timeout: this.timeout,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(data.error?.message || 'Request failed', response.status, data);
      }

      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      throw err;
    }
  }

  /**
   * Create new task card
   * @param {Object} card - Card data
   * @param {string} card.sessionId - Session identifier
   * @param {Object} card.userRequest - User request data
   * @param {Object} card.sections - Card sections
   * @returns {Promise<Object>} Created card with server response
   */
  async createCard(card) {
    return this.request('POST', '/cards', {
      action: 'submit_card',
      card,
    });
  }

  /**
   * Update task card
   * @param {string} cardId - Card identifier
   * @param {Object} updates - Card updates
   * @returns {Promise<Object>} Updated card
   */
  async updateCard(cardId, updates) {
    return this.request('PATCH', `/cards/${cardId}`, {
      action: 'update_card',
      card: updates,
    });
  }

  /**
   * Answer questions from server
   * @param {string} cardId - Card identifier
   * @param {Object} answers - Answers to questions
   * @returns {Promise<Object>} Server response
   */
  async answerQuestions(cardId, answers) {
    return this.request('PATCH', `/cards/${cardId}`, {
      action: 'answer_questions',
      cardId,
      answers,
    });
  }

  /**
   * Report command execution results to server
   * @param {string} cardId - Card identifier
   * @param {Array} commandResults - Array of command execution results
   * @returns {Promise<Object>} Server response
   */
  async reportCommands(cardId, commandResults) {
    return this.request('POST', `/cards/${cardId}/commands`, {
      action: 'execute_commands',
      cardId,
      commandResults,
    });
  }

  /**
   * Get card status
   * @param {string} cardId - Card identifier
   * @returns {Promise<Object>} Card data
   */
  async getCard(cardId) {
    return this.request('GET', `/cards/${cardId}`);
  }

  /**
   * Cancel task/card
   * @param {string} cardId - Card identifier
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelCard(cardId) {
    return this.request('DELETE', `/cards/${cardId}`);
  }

  /**
   * Search RAG index via server
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} [options.limit=10] - Max results
   * @returns {Promise<Object>} Search results
   */
  async searchRAG(query, options = {}) {
    return this.request('POST', '/search', {
      query,
      limit: options.limit || 10,
    });
  }

  /**
   * Get server status
   * @returns {Promise<Object>} Server status
   */
  async getStatus() {
    return this.request('GET', '/status');
  }
}

module.exports = {
  ApiClient,
  ApiError,
};
