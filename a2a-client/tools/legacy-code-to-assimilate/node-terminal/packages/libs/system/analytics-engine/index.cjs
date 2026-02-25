const fs = require('fs');
const path = require('path');

/**
 * Система аналитики и метрик для MCP Terminal Server
 * Собирает, анализирует и предоставляет отчеты о производительности системы
 */
class AnalyticsEngine {
  constructor() {
    this.metricsDir = path.join(process.cwd(), 'metrics');
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.ensureDirectories();
    
    // Кэш метрик в памяти для быстрого доступа
    this.metricsCache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 минут
    
    // Инициализация базовых метрик
    this.initializeMetrics();
  }

  ensureDirectories() {
    try {
      if (!fs.existsSync(this.metricsDir)) {
        fs.mkdirSync(this.metricsDir, { recursive: true });
      }
      if (!fs.existsSync(this.reportsDir)) {
        fs.mkdirSync(this.reportsDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create analytics directories:', error.message);
    }
  }

  initializeMetrics() {
    this.baseMetrics = {
      commands: {
        total: 0,
        successful: 0,
        failed: 0,
        blocked: 0,
        avgDuration: 0,
        totalDuration: 0
      },
      security: {
        blocks: 0,
        threats: 0,
        selfTests: 0,
        vulnerabilities: 0
      },
      performance: {
        avgResponseTime: 0,
        peakMemoryUsage: 0,
        cpuUsage: 0,
        errors: 0
      },
      sessions: {
        total: 0,
        active: 0,
        avgCommandsPerSession: 0
      },
      system: {
        uptime: 0,
        restarts: 0,
        errors: 0,
        warnings: 0
      }
    };
  }

  /**
   * Запись метрики события
   */
  recordMetric(category, event, data = {}, value = 1) {
    const timestamp = Date.now();
    const metricKey = category + ':' + event;
    
    // Обновляем кэш
    if (!this.metricsCache.has(metricKey)) {
      this.metricsCache.set(metricKey, {
        count: 0,
        totalValue: 0,
        lastUpdate: timestamp,
        data: []
      });
    }
    
    const cached = this.metricsCache.get(metricKey);
    cached.count += 1;
    cached.totalValue += value;
    cached.lastUpdate = timestamp;
    cached.data.push({
      timestamp,
      value,
      data
    });
    
    // Ограничиваем размер данных
    if (cached.data.length > 1000) {
      cached.data = cached.data.slice(-1000);
    }
    
    // Обновляем базовые метрики
    this.updateBaseMetrics(category, event, value);
  }

  updateBaseMetrics(category, event, value) {
    if (category === 'commands') {
      this.baseMetrics.commands.total += 1;
      if (event === 'success') {
        this.baseMetrics.commands.successful += 1;
      } else if (event === 'failed') {
        this.baseMetrics.commands.failed += 1;
      } else if (event === 'blocked') {
        this.baseMetrics.commands.blocked += 1;
      }
      this.baseMetrics.commands.totalDuration += value;
      this.baseMetrics.commands.avgDuration = this.baseMetrics.commands.totalDuration / this.baseMetrics.commands.total;
    } else if (category === 'security') {
      if (event === 'block') {
        this.baseMetrics.security.blocks += 1;
      } else if (event === 'threat') {
        this.baseMetrics.security.threats += 1;
      }
    } else if (category === 'performance') {
      if (event === 'response_time') {
        this.baseMetrics.performance.avgResponseTime = value;
      } else if (event === 'memory_usage') {
        this.baseMetrics.performance.peakMemoryUsage = Math.max(this.baseMetrics.performance.peakMemoryUsage, value);
      } else if (event === 'error') {
        this.baseMetrics.performance.errors += 1;
      }
    } else if (category === 'sessions') {
      if (event === 'start') {
        this.baseMetrics.sessions.total += 1;
        this.baseMetrics.sessions.active += 1;
      } else if (event === 'end') {
        this.baseMetrics.sessions.active = Math.max(0, this.baseMetrics.sessions.active - 1);
      }
    } else if (category === 'system') {
      if (event === 'error') {
        this.baseMetrics.system.errors += 1;
      } else if (event === 'warning') {
        this.baseMetrics.system.warnings += 1;
      } else if (event === 'restart') {
        this.baseMetrics.system.restarts += 1;
      }
    }
  }

  /**
   * Получение метрик
   */
  getMetrics(category = null, event = null) {
    if (category && event) {
      const metricKey = category + ':' + event;
      return this.metricsCache.get(metricKey) || null;
    } else if (category) {
      const categoryMetrics = {};
      for (const [key, value] of this.metricsCache.entries()) {
        if (key.startsWith(category + ':')) {
          categoryMetrics[key] = value;
        }
      }
      return categoryMetrics;
    } else {
      return {
        cache: Object.fromEntries(this.metricsCache),
        base: this.baseMetrics
      };
    }
  }

  /**
   * Генерация отчета
   */
  generateReport(format = 'json') {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      summary: {
        totalCommands: this.baseMetrics.commands.total,
        successRate: this.baseMetrics.commands.total > 0 ? 
          (this.baseMetrics.commands.successful / this.baseMetrics.commands.total * 100).toFixed(2) + '%' : '0%',
        activeSessions: this.baseMetrics.sessions.active,
        systemErrors: this.baseMetrics.system.errors
      }
    };

    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else if (format === 'html') {
      return this.generateHtmlReport(report);
    } else {
      return report;
    }
  }

  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>MCP Analytics Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>MCP Analytics Report</h1>
    <p>Generated: ${report.timestamp}</p>
    
    <div class="metric">
        <h3>Summary</h3>
        <p>Total Commands: ${report.summary.totalCommands}</p>
        <p>Success Rate: <span class="success">${report.summary.successRate}</span></p>
        <p>Active Sessions: ${report.summary.activeSessions}</p>
        <p>System Errors: <span class="error">${report.summary.systemErrors}</span></p>
    </div>
</body>
</html>`;
  }

  /**
   * Сохранение отчета
   */
  saveReport(report, filename = null) {
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `analytics-report-${timestamp}.json`;
    }
    
    const filePath = path.join(this.reportsDir, filename);
    
    try {
      fs.writeFileSync(filePath, report);
      return { success: true, path: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Экспорт метрик
   */
  exportMetrics(format = 'json') {
    const data = this.getMetrics();
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      return this.convertToCSV(data);
    } else {
      return data;
    }
  }

  convertToCSV(data) {
    const lines = ['Category,Event,Count,TotalValue,LastUpdate'];
    
    for (const [key, value] of Object.entries(data.cache)) {
      const [category, event] = key.split(':');
      lines.push(`${category},${event},${value.count},${value.totalValue},${new Date(value.lastUpdate).toISOString()}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Очистка старых метрик
   */
  cleanupMetrics(maxAge = 24 * 60 * 60 * 1000) { // 24 часа по умолчанию
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.metricsCache.entries()) {
      if (now - value.lastUpdate > maxAge) {
        this.metricsCache.delete(key);
        cleaned++;
      }
    }
    
    return { cleaned, remaining: this.metricsCache.size };
  }
}

// Создаем глобальный экземпляр
const analyticsEngine = new AnalyticsEngine();

// Удобные функции для записи метрик
function recordCommandMetric(action, success, duration = 0) {
  analyticsEngine.recordMetric('commands', success ? 'success' : 'failed', { action }, duration);
}

function recordSecurityMetric(event, details = {}) {
  analyticsEngine.recordMetric('security', event, details);
}

function recordPerformanceMetric(event, value, details = {}) {
  analyticsEngine.recordMetric('performance', event, details, value);
}

function recordSessionMetric(event, sessionId = null) {
  analyticsEngine.recordMetric('sessions', event, { sessionId });
}

function recordSystemMetric(event, details = {}) {
  analyticsEngine.recordMetric('system', event, details);
}

module.exports = {
  AnalyticsEngine,
  analyticsEngine,
  recordCommandMetric,
  recordSecurityMetric,
  recordPerformanceMetric,
  recordSessionMetric,
  recordSystemMetric,
  getMetrics: (category, event) => analyticsEngine.getMetrics(category, event),
  generateReport: (format) => analyticsEngine.generateReport(format),
  saveReport: (report, filename) => analyticsEngine.saveReport(report, filename),
  exportMetrics: (format) => analyticsEngine.exportMetrics(format),
  cleanupMetrics: (maxAge) => analyticsEngine.cleanupMetrics(maxAge)
};
