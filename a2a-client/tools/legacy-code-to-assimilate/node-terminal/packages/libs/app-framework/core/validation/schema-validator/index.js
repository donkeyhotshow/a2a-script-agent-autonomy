/**
 * Client-side Error Monitoring and Reporting Library
 * Extracted from root/projects-manager/ui/composables/services/useErrorAnalyzer.js
 * Объединенная библиотека утилит для мониторинга ошибок на стороне клиента (браузера/UI)
 */

const DEFAULT_CONFIG = {
  maxErrorsPerReport: 100,
  reportInterval: 30000, // 30 seconds
  enableConsoleCapture: true,
  enableNetworkCapture: true,
  enablePerformanceCapture: true,
  enableUnhandledCapture: true,
  debugMode: true,
  // storageFile и apiEndpoint будут частью options, а не жестко закодированы здесь
  // apiEndpoint: '/api/error-report'
};

class ClientErrorMonitor {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.errors = [];
    this.isCollecting = false;
    this.lastReportTime = null;
    this.intervalId = null;
    this.debug = this.config.debugMode ? this._debug.bind(this) : () => {};
  }

  _debug(message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[ClientErrorMonitor] ${timestamp} - ${message}`;
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }

  determineSeverity(type, data) {
    switch (type) {
      case 'javascript_error':
        return (data && data.fatal) ? 'critical' : 'error';
      case 'network_error':
        return data.status >= 500 ? 'error' : 'warning';
      case 'performance_issue':
        return data.duration > 3000 ? 'error' : 'warning';
      case 'console_error':
        return 'error';
      case 'console_warning':
        return 'warning';
      case 'unhandled_rejection':
        return 'critical';
      case 'resource_load_error':
        return 'warning';
      case 'api_error':
        return data.status >= 500 ? 'critical' : 'error';
      case 'plugin_error':
        return data.critical ? 'critical' : 'error';
      default:
        return 'info';
    }
  }

  createErrorEntry(type, data) {
    const errorEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date().toISOString(),
      url: (typeof window !== 'undefined' && window.location) ? window.location.href : 'server',
      userAgent: (typeof navigator !== 'undefined') ? navigator.userAgent : 'node',
      viewport: {
        width: (typeof window !== 'undefined') ? window.innerWidth : 0,
        height: (typeof window !== 'undefined') ? window.innerHeight : 0
      },
      data,
      severity: this.determineSeverity(type, data)
    };

    if (errorEntry.severity === 'critical') {
      this.debug(`Critical error created: ${type}`, errorEntry);
    }
    return errorEntry;
  }

  addError(type, data) {
    if (!this.isCollecting) return;

    const errorEntry = this.createErrorEntry(type, data);
    this.errors.push(errorEntry);

    this.debug(`Error added to collection: ${type}`, {
      severity: errorEntry.severity,
      message: (data && (data.message || data.reason)) || 'No message',
      totalErrors: this.errors.length
    });

    if (this.errors.length > this.config.maxErrorsPerReport) {
      const removedCount = this.errors.length - this.config.maxErrorsPerReport;
      this.errors = this.errors.slice(-this.config.maxErrorsPerReport);
      this.debug(`Removed ${removedCount} old errors from memory`);
    }

    if (this.errors.length >= this.config.maxErrorsPerReport) {
      this.debug('Error limit reached, sending report');
      this.sendReport();
    }
  }

  addPluginError(pluginName, error, critical = false) {
    this.debug('Plugin error added', {
      plugin: pluginName,
      error: error.message,
      critical
    });

    this.addError('plugin_error', {
      plugin: pluginName,
      message: error.message,
      stack: error.stack,
      critical
    });
  }

  setupJavaScriptErrorHandling() {
    if (!this.config.enableUnhandledCapture) return;

    this.debug('Setting up JavaScript error handling');

    const originalOnError = window.onerror;
    const originalOnUnhandledRejection = window.onunhandledrejection;

    window.onerror = (message, source, lineno, colno, error) => {
      this.debug('Caught JavaScript error', {
        message,
        source,
        lineno,
        colno,
        stack: error?.stack
      });

      this.addError('javascript_error', {
        message,
        source,
        lineno,
        colno,
        stack: error?.stack,
        fatal: false
      });

      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
    };

    window.onunhandledrejection = (event) => {
      this.debug('Caught unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });

      this.addError('unhandled_rejection', {
        reason: event.reason,
        promise: event.promise
      });

      if (originalOnUnhandledRejection) {
        return originalOnUnhandledRejection(event);
      }
    };
  }

  setupConsoleCapture() {
    if (!this.config.enableConsoleCapture) return;

    this.debug('Setting up console error capturing');

    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      this.debug('Caught console error', {
        message,
        arguments: args
      });

      this.addError('console_error', {
        message,
        arguments: args
      });
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      this.debug('Caught console warning', {
        message,
        arguments: args
      });

      this.addError('console_warning', {
        message,
        arguments: args
      });
      originalWarn.apply(console, args);
    };
  }

  setupNetworkErrorHandling() {
    if (!this.config.enableNetworkCapture) return;

    this.debug('Setting up network error handling');

    const originalFetch = window.fetch || global.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;

        if (duration > 3000) {
          this.debug('Slow network request detected', {
            url: args[0],
            duration,
            status: response.status
          });

          this.addError('performance_issue', {
            type: 'slow_network_request',
            url: args[0],
            duration,
            status: response.status
          });
        }

        if (!response.ok) {
          this.debug('HTTP error detected', {
            url: args[0],
            status: response.status,
            statusText: response.statusText,
            duration
          });

          this.addError('network_error', {
            url: args[0],
            status: response.status,
            statusText: response.statusText,
            duration
          });
        }

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        this.debug('Network error detected', {
          url: args[0],
          error: error.message,
          duration
        });

        this.addError('network_error', {
          url: args[0],
          error: error.message,
          duration
        });
        throw error;
      }
    };
  }

  setupPerformanceMonitoring() {
    if (!this.config.enablePerformanceCapture) return;

    this.debug('Setting up performance monitoring');

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        if (loadTime > 3000) {
          this.debug('Slow page load detected', {
            loadTime,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
          });

          this.addError('performance_issue', {
            type: 'slow_page_load',
            loadTime,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
          });
        }
      }
    });

    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        this.debug('Resource load error detected', {
          type: event.target.tagName,
          src: event.target.src || event.target.href,
          message: event.message
        });

        this.addError('resource_load_error', {
          type: event.target.tagName,
          src: event.target.src || event.target.href,
          message: event.message
        });
      }
    }, true);
  }

  async sendReport() {
    if (this.errors.length === 0) return;

    this.debug('Starting error report submission', {
      errorCount: this.errors.length
    });

    try {
      const report = {
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        errors: [...this.errors],
        summary: {
          total: this.errors.length,
          byType: this.errors.reduce((acc, error) => {
            acc[error.type] = (acc[error.type] || 0) + 1;
            return acc;
          }, {}),
          bySeverity: this.errors.reduce((acc, error) => {
            acc[error.severity] = (acc[error.severity] || 0) + 1;
            return acc;
          }, {})
        }
      };

      const response = await fetch(this.config.apiEndpoint || '/api/error-management/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.debug('Error report successfully submitted', {
        responseStatus: response.status,
        errorsSent: this.errors.length
      });

      this.errors = [];
      this.lastReportTime = new Date().toISOString();

    } catch (error) {
      this.debug('Error submitting report', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  getSessionId() {
    let sessionId = (typeof sessionStorage !== 'undefined' ? sessionStorage : global.sessionStorage)?.getItem('error_analyzer_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      (typeof sessionStorage !== 'undefined' ? sessionStorage : global.sessionStorage)?.setItem('error_analyzer_session_id', sessionId);
      this.debug('New session ID created', { sessionId });
    }
    return sessionId;
  }

  startCollecting() {
    if (this.isCollecting) return;

    this.debug('Starting error collection');

    this.isCollecting = true;
    this.errors = [];

    this.setupJavaScriptErrorHandling();
    this.setupConsoleCapture();
    this.setupNetworkErrorHandling();
    this.setupPerformanceMonitoring();

    this.intervalId = setInterval(() => {
      if (this.errors.length > 0) {
        this.debug('Periodic report submission', {
          errorCount: this.errors.length
        });
        this.sendReport();
      }
    }, this.config.reportInterval);

    this.debug('Error collection started successfully');
  }

  stopCollecting() {
    this.debug('Stopping error collection');

    this.isCollecting = false;

    if (this.intervalId) {
      (typeof clearInterval !== 'undefined' ? clearInterval : global.clearInterval)(this.intervalId);
      this.intervalId = null;
      this.debug('Report submission interval cleared');
    }

    if (this.errors.length > 0) {
      this.debug('Submitting final report', {
        errorCount: this.errors.length
      });
      this.sendReport();
    }

    this.debug('Error collection stopped');
  }

  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byType: {},
      bySeverity: { 'critical': 0, 'error': 0, 'warning': 0, 'info': 0 }
    };

    this.errors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  clearErrors() {
    this.debug('Clearing all errors', {
      clearedCount: this.errors.length
    });
    this.errors = [];
  }

  getErrors() {
    return this.errors;
  }

  async loadFromFile(filePath = null) {
    this.debug('Attempting to load errors from file (placeholder)', { filePath });
    return [];
  }

  async saveToFile(filePath = null) {
    this.debug('Attempting to save errors to file (placeholder)', { filePath });
    return true;
  }
}

// Экспортируем класс и инстанс для удобства
export { ClientErrorMonitor };
