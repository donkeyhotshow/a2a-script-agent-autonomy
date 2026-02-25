/**
 * Request Handler
 * Extracted from main-gateway application
 */

class RequestHandler {
  constructor() {
    this.middleware = [];
    this.errorHandlers = [];
  }

  /**
   * Add middleware
   */
  use(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Add error handler
   */
  useError(handler) {
    this.errorHandlers.push(handler);
  }

  /**
   * Handle request
   */
  async handleRequest(req, res, next) {
    try {
      // Apply middleware
      for (const middleware of this.middleware) {
        await middleware(req, res, next);
      }
    } catch (error) {
      // Apply error handlers
      for (const handler of this.errorHandlers) {
        await handler(error, req, res, next);
      }
    }
  }

  /**
   * Validate request
   */
  validateRequest(req, schema) {
    // Implementation for request validation
    return { valid: true };
  }

  /**
   * Parse request body
   */
  parseBody(req) {
    return req.body;
  }

  /**
   * Get request headers
   */
  getHeaders(req) {
    return req.headers;
  }

  /**
   * Get request parameters
   */
  getParams(req) {
    return req.params;
  }

  /**
   * Get query parameters
   */
  getQuery(req) {
    return req.query;
  }
}

export { RequestHandler };
