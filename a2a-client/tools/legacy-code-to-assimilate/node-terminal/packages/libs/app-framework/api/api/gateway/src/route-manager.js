/**
 * Route Manager
 * Extracted from main-gateway application
 */

class RouteManager {
  constructor() {
    this.routes = new Map();
  }

  /**
   * Add route
   */
  addRoute(path, config) {
    this.routes.set(path, config);
  }

  /**
   * Remove route
   */
  removeRoute(path) {
    return this.routes.delete(path);
  }

  /**
   * Get route
   */
  getRoute(path) {
    return this.routes.get(path);
  }

  /**
   * Get all routes
   */
  getAllRoutes() {
    return Array.from(this.routes.entries());
  }

  /**
   * Clear all routes
   */
  clear() {
    this.routes.clear();
  }

  /**
   * Count routes
   */
  countRoutes() {
    return this.routes.size;
  }

  /**
   * Check if route exists
   */
  hasRoute(path) {
    return this.routes.has(path);
  }

  /**
   * Get routes by method
   */
  getRoutesByMethod(method) {
    const filteredRoutes = [];
    for (const [path, config] of this.routes.entries()) {
      if (config.method && config.method.toUpperCase() === method.toUpperCase()) {
        filteredRoutes.push([path, config]);
      }
    }
    return filteredRoutes;
  }

  /**
   * Get routes by path pattern
   */
  getRoutesByPattern(pattern) {
    const filteredRoutes = [];
    // Заменяем * на [^/]* для соответствия нулю или более символов в сегменте пути
    const regex = new RegExp(pattern.replace(/\*/g, '[^/]*')); 
    for (const [path, config] of this.routes.entries()) {
      if (regex.test(path)) {
        filteredRoutes.push([path, config]);
      }
    }
    return filteredRoutes;
  }

  /**
   * Validate route configuration
   */
  validateRoute(path, config) {
    if (!config || typeof config !== 'object') {
      return false;
    }
    if (!config.method || typeof config.method !== 'string' || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(config.method.toUpperCase())) {
      return false;
    }
    if (!config.handler || typeof config.handler !== 'function') {
      return false;
    }

    // Дополнительные проверки для schema, middleware, rateLimit, cache
    if (config.schema && typeof config.schema !== 'object') {
      return false;
    }
    if (config.middleware && (!Array.isArray(config.middleware) || !config.middleware.every(m => typeof m === 'string'))) {
      return false;
    }
    if (config.rateLimit && typeof config.rateLimit !== 'object') {
      return false;
    }
    if (config.cache && typeof config.cache !== 'object') {
      return false;
    }

    return true;
  }
}

export { RouteManager };
