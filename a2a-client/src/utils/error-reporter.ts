/**
 * Error Reporting Service
 * Captures and reports errors to monitoring service
 */

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  context?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: string;
}

export class ErrorReporter {
  private static instance: ErrorReporter;
  private endpoint: string | null = null;
  private enabled = false;
  private errorQueue: ErrorReport[] = [];
  private metricsQueue: PerformanceMetric[] = [];
  private flushInterval: number | null = null;

  private constructor() {
    this.setupGlobalHandlers();
  }

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  init(config: { endpoint?: string; enabled?: boolean; flushIntervalMs?: number }) {
    this.endpoint = config.endpoint || null;
    this.enabled = config.enabled ?? true;
    
    if (this.flushInterval) {
      window.clearInterval(this.flushInterval);
    }
    
    if (this.enabled) {
      this.flushInterval = window.setInterval(
        () => this.flush(),
        config.flushIntervalMs || 30000
      );
    }
  }

  capture(error: Error | string, context?: Record<string, any>) {
    if (!this.enabled) return;

    const report: ErrorReport = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      context,
    };

    this.errorQueue.push(report);

    // Flush immediately for critical errors
    if (this.isCriticalError(report)) {
      this.flush();
    }

    // Console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorReporter]', report);
    }
  }

  trackMetric(name: string, value: number, unit: PerformanceMetric['unit'] = 'ms') {
    if (!this.enabled) return;

    this.metricsQueue.push({
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
    });
  }

  trackPerformance(entry: PerformanceEntry) {
    this.trackMetric(entry.name, entry.duration, 'ms');
  }

  private isCriticalError(report: ErrorReport): boolean {
    const criticalPatterns = [
      /out of memory/i,
      /script error/i,
      /securityerror/i,
    ];
    return criticalPatterns.some(pattern => pattern.test(report.message));
  }

  private async flush() {
    if (!this.endpoint || (this.errorQueue.length === 0 && this.metricsQueue.length === 0)) {
      return;
    }

    const payload = {
      errors: [...this.errorQueue],
      metrics: [...this.metricsQueue],
      sessionId: this.getSessionId(),
    };

    this.errorQueue = [];
    this.metricsQueue = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (e) {
      // Silent fail - don't cause more errors
      if (import.meta.env.DEV) {
        console.error('[ErrorReporter] Failed to flush:', e);
      }
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error-reporter-session');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-reporter-session', sessionId);
    }
    return sessionId;
  }

  private setupGlobalHandlers() {
    // Expose globally for vanilla JS access
    (window as any).ErrorReporter = this;
  }
}

// Singleton export
export const errorReporter = ErrorReporter.getInstance();

// Performance Observer setup
export function initPerformanceMonitoring() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        errorReporter.trackPerformance(entry);
      }
    });
    
    observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  }

  // Web Vitals
  if ('web-vitals' in window) {
    // @ts-ignore
    const { getCLS, getFID, getFCP, getLCP, getTTFB } = window['web-vitals'];
    getCLS((metric: any) => errorReporter.trackMetric('CLS', metric.value, 'count'));
    getFID((metric: any) => errorReporter.trackMetric('FID', metric.value, 'ms'));
    getFCP((metric: any) => errorReporter.trackMetric('FCP', metric.value, 'ms'));
    getLCP((metric: any) => errorReporter.trackMetric('LCP', metric.value, 'ms'));
    getTTFB((metric: any) => errorReporter.trackMetric('TTFB', metric.value, 'ms'));
  }
}
