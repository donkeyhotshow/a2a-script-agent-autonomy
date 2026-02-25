/**
 * Debug System - Заглушка для системы отладки
 */

const DEBUG_CATEGORIES = {
  COMMAND_EXECUTION: 'command_execution',
  FILE_OPERATIONS: 'file_operations',
  NETWORK_REQUESTS: 'network_requests',
  PERFORMANCE: 'performance',
  ERROR_HANDLING: 'error_handling'
};

class DebugSystem {
  constructor() {
    this.enabled = false;
    this.categories = new Set();
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  enableCategory(category) {
    this.categories.add(category);
  }

  disableCategory(category) {
    this.categories.delete(category);
  }

  isEnabled(category = null) {
    if (!this.enabled) return false;
    if (!category) return true;
    return this.categories.has(category);
  }

  log(category, message, data = {}) {
    if (this.isEnabled(category)) {
      console.log(`[DEBUG:${category}] ${message}`, data);
    }
  }

  error(category, message, error = {}) {
    if (this.isEnabled(category)) {
      console.error(`[DEBUG:${category}] ${message}`, error);
    }
  }

  warn(category, message, data = {}) {
    if (this.isEnabled(category)) {
      console.warn(`[DEBUG:${category}] ${message}`, data);
    }
  }

  info(category, message, data = {}) {
    if (this.isEnabled(category)) {
      console.info(`[DEBUG:${category}] ${message}`, data);
    }
  }
}

const debugSystem = new DebugSystem();

module.exports = { debugSystem, DebugSystem, DEBUG_CATEGORIES };
