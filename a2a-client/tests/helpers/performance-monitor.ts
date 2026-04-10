export interface PerformanceMetrics {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  external: number;
  cpuUsage?: NodeJS.CpuUsage;
  eventLoopLag: number;
  activeHandles: number;
  activeRequests: number;
}

export interface ConnectionMetrics {
  timestamp: number;
  sessionId: string;
  connected: boolean;
  messagesReceived: number;
  messagesSent: number;
  connectionTime: number;
  lastMessageTime?: number;
  reconnectCount: number;
  errors: string[];
}

export interface PageMetrics {
  timestamp: number;
  url: string;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift: number;
  memoryUsage?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
  networkRequests: number;
  failedRequests: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private connectionMetrics: ConnectionMetrics[] = [];
  private pageMetrics: PageMetrics[] = [];
  private monitoring = false;
  private intervalId?: NodeJS.Timeout;

  constructor(private readonly collectionInterval = 5000) {}

  start(): void {
    if (this.monitoring) return;
    this.monitoring = true;

    this.intervalId = setInterval(() => {
      this.collectNodeMetrics();
    }, this.collectionInterval);
  }

  stop(): void {
    if (!this.monitoring) return;
    this.monitoring = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private collectNodeMetrics(): void {
    // Skip if not in Node.js environment
    if (typeof process === 'undefined') return;

    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const eventLoopLag = this.measureEventLoopLag();

      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        heapLimit: memUsage.heapTotal + memUsage.external,
        external: memUsage.external,
        cpuUsage,
        eventLoopLag,
        activeHandles: this.getActiveHandles(),
        activeRequests: this.getActiveRequests()
      };

      this.metrics.push(metrics);
    } catch (error) {
      console.warn('Failed to collect Node.js metrics:', error);
    }
  }

   private measureEventLoopLag(): Promise<number> {
     const start = process.hrtime.bigint();
     return new Promise<number>((resolve) => {
       setImmediate(() => {
         const end = process.hrtime.bigint();
         resolve(Number(end - start) / 1e6); // Convert to milliseconds
       });
     });
   }

  private getActiveHandles(): number {
    // This is a simplified approximation
    return process._getActiveHandles ? process._getActiveHandles().length : 0;
  }

  private getActiveRequests(): number {
    // This is a simplified approximation
    return process._getActiveRequests ? process._getActiveRequests().length : 0;
  }

  async collectPageMetrics(page: any, sessionId?: string): Promise<PageMetrics> {
    try {
      const timestamp = Date.now();

      // Get performance timing
      const timing = await page.evaluate(() => {
        const perf = performance.timing;
        return {
          domContentLoaded: perf.domContentLoadedEventEnd - perf.navigationStart,
          loadComplete: perf.loadEventEnd - perf.navigationStart
        };
      });

       // Get Web Vitals (simplified)
       const webVitals = await page.evaluate(() => {
         // @ts-expect-error - PerformanceObserver is a browser API that may not be available in all TS environments
         const observer = new PerformanceObserver((list) => {
           const entries = list.getEntries();
           return entries;
         });

         return new Promise((resolve) => {
           // @ts-expect-error - window.performance.memory is a browser API that may not be available in all TS environments
           if (window.performance && window.performance.memory) {
             // @ts-expect-error - window.performance.memory is a browser API that may not be available in all TS environments
             resolve(window.performance.memory);
           } else {
             resolve(null);
           }
         });
       });

       // Get network request counts
       const networkRequests = await page.evaluate(() => {
         // @ts-expect-error - window.performance.getEntriesByType is a browser API that may not be available in all TS environments
         if (window.performance && window.performance.getEntriesByType) {
           // @ts-expect-error - window.performance.getEntriesByType is a browser API that may not be available in all TS environments
           const entries = window.performance.getEntriesByType('resource');
           const failed = entries.filter((entry: any) => entry.transferSize === 0 && entry.decodedBodySize === 0).length;
           return {
             total: entries.length,
             failed
           };
         }
         return { total: 0, failed: 0 };
       });

      const metrics: PageMetrics = {
        timestamp,
        url: page.url(),
        domContentLoaded: timing.domContentLoaded,
        loadComplete: timing.loadComplete,
        cumulativeLayoutShift: 0, // Would need additional setup for CLS
        memoryUsage: webVitals,
        networkRequests: networkRequests.total,
        failedRequests: networkRequests.failed
      };

      this.pageMetrics.push(metrics);
      return metrics;
    } catch (error) {
      console.warn('Failed to collect page metrics:', error);
      throw error;
    }
  }

  recordConnectionMetrics(metrics: ConnectionMetrics): void {
    this.connectionMetrics.push(metrics);
  }

  getMetrics(): {
    node: PerformanceMetrics[];
    connections: ConnectionMetrics[];
    pages: PageMetrics[];
  } {
    return {
      node: [...this.metrics],
      connections: [...this.connectionMetrics],
      pages: [...this.pageMetrics]
    };
  }

  getLatestNodeMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getLatestConnectionMetrics(sessionId: string): ConnectionMetrics | null {
    const sessionMetrics = this.connectionMetrics.filter(m => m.sessionId === sessionId);
    return sessionMetrics.length > 0 ? sessionMetrics[sessionMetrics.length - 1] : null;
  }

  clear(): void {
    this.metrics = [];
    this.connectionMetrics = [];
    this.pageMetrics = [];
  }

  exportToFile(filepath: string): void {
    const fs = require('fs');
    const data = {
      collected: new Date().toISOString(),
      metrics: this.getMetrics()
    };
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  }

  // Utility methods for analysis
  getAverageHeapUsage(): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((acc, m) => acc + m.heapUsed, 0);
    return sum / this.metrics.length;
  }

  getPeakHeapUsage(): number {
    if (this.metrics.length === 0) return 0;
    return Math.max(...this.metrics.map(m => m.heapUsed));
  }

  getConnectionHealthSummary(): {
    totalConnections: number;
    activeConnections: number;
    averageMessagesPerConnection: number;
    totalErrors: number;
  } {
    const totalConnections = this.connectionMetrics.length;
    const activeConnections = this.connectionMetrics.filter(m => m.connected).length;
    const totalMessages = this.connectionMetrics.reduce((acc, m) => acc + m.messagesReceived, 0);
    const totalErrors = this.connectionMetrics.reduce((acc, m) => acc + m.errors.length, 0);

    return {
      totalConnections,
      activeConnections,
      averageMessagesPerConnection: totalConnections > 0 ? totalMessages / totalConnections : 0,
      totalErrors
    };
  }
}