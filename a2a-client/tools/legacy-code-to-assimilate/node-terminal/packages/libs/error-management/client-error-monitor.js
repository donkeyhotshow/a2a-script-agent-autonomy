import { ErrorHandlingUtils } from './error-handler/index.mjs';
// import { LoggingUtils } from '../../root/projects-manager/ui/lib/empty-module.js'; // Removed as it's an empty module

class ClientErrorMonitor {
  constructor(options = {}) {
    // If no logger is provided, default to console for browser compatibility
    this.logger = options.logger || console;
    this.errorHandler = options.errorHandler || new ErrorHandlingUtils({ logger: this.logger });
  }

  initialize() {
    this.logger.info('[ClientErrorMonitor] Initializing client error monitor.');

    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        type: 'unhandled_javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandled_promise_rejection',
      });
    });

    // You can add more error monitoring mechanisms here, e.g., for specific frameworks
  }

  /**
   * Handles an error by logging it and potentially sending it to the error handler.
   * @param {Error} error - The error object.
   * @param {Object} context - Additional context for the error.
   */
  handleError(error, context = {}) {
    this.logger.error('[ClientErrorMonitor] Caught error:', error, context);
    this.errorHandler.logError(error, { source: 'client', ...context });
  }

  /**
   * Manually report an error.
   * @param {Error} error - The error object.
   * @param {Object} context - Additional context for the error.
   */
  reportError(error, context = {}) {
    this.handleError(error, { source: 'manual_report', ...context });
  }
}

export { ClientErrorMonitor };
