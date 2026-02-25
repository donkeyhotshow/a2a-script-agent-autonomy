/**
 * @fileoverview Система метрик для MCP Terminal Server
 * Собирает, анализирует и предоставляет метрики производительности системы
 * @author MCP Team
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class MetricsCollector {
  constructor(options = {}) {
    this.metricsDir = options.metricsDir || path.join(process.cwd(), 'metrics');
    this.retentionDays = options.retentionDays || 30;
    this.collectionInterval = options.collectionInterval || 60000; // 1 минута
    this.isCollecting = false;
    this.metrics = {
      system: {},
      performance: {},
      commands: {},
      errors: {},
      custom: {}
    };
    
    this.ensureMetricsDirectory();
  }

  /**
   * Создает директорию для метрик если не существует
   */
  async ensureMetricsDirectory() {
    try {
      await fs.mkdir(this.metricsDir, { recursive: true });
    } catch (error) {
      console.error('Ошибка создания директории метрик:', error.message);
    }
  }

  /**
   * Начинает сбор метрик
   */
  startCollection() {
    if (this.isCollecting) {
      return;
    }
    
    this.isCollecting = true;
    this.collectSystemMetrics();
    this.interval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.collectionInterval);
  }

  /**
   * Останавливает сбор метрик
   */
  stopCollection() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isCollecting = false;
  }

  /**
   * Собирает системные метрики
   */
  collectSystemMetrics() {
    const timestamp = Date.now();
    
    // Системные метрики
    this.metrics.system = {
      timestamp,
      uptime: process.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      },
      cpu: {
        loadAverage: os.loadavg(),
        cpus: os.cpus().length
      },
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version
    };

    // Метрики производительности процесса
    this.metrics.performance = {
      timestamp,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      pid: process.pid
    };

    this.saveMetrics();
  }

  /**
   * Записывает метрику команды
   */
  recordCommand(command, duration, success = true, error = null) {
    const timestamp = Date.now();
    
    if (!this.metrics.commands[command]) {
      this.metrics.commands[command] = {
        total: 0,
        successful: 0,
        failed: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        lastExecuted: null,
        errors: []
      };
    }

    const cmdMetrics = this.metrics.commands[command];
    cmdMetrics.total++;
    cmdMetrics.totalDuration += duration;
    cmdMetrics.avgDuration = cmdMetrics.totalDuration / cmdMetrics.total;
    cmdMetrics.minDuration = Math.min(cmdMetrics.minDuration, duration);
    cmdMetrics.maxDuration = Math.max(cmdMetrics.maxDuration, duration);
    cmdMetrics.lastExecuted = timestamp;

    if (success) {
      cmdMetrics.successful++;
    } else {
      cmdMetrics.failed++;
      if (error) {
        cmdMetrics.errors.push({
          timestamp,
          error: error.message || error,
          duration
        });
        // Ограничиваем количество ошибок
        if (cmdMetrics.errors.length > 100) {
          cmdMetrics.errors = cmdMetrics.errors.slice(-100);
        }
      }
    }
  }

  /**
   * Записывает ошибку
   */
  recordError(error, context = {}) {
    const timestamp = Date.now();
    
    if (!this.metrics.errors[error.name || 'Unknown']) {
      this.metrics.errors[error.name || 'Unknown'] = {
        count: 0,
        lastOccurrence: null,
        contexts: []
      };
    }

    const errorMetrics = this.metrics.errors[error.name || 'Unknown'];
    errorMetrics.count++;
    errorMetrics.lastOccurrence = timestamp;
    errorMetrics.contexts.push({
      timestamp,
      message: error.message,
      stack: error.stack,
      context
    });

    // Ограничиваем количество контекстов
    if (errorMetrics.contexts.length > 50) {
      errorMetrics.contexts = errorMetrics.contexts.slice(-50);
    }
  }

  /**
   * Записывает пользовательскую метрику
   */
  recordCustomMetric(category, name, value, tags = {}) {
    const timestamp = Date.now();
    
    if (!this.metrics.custom[category]) {
      this.metrics.custom[category] = {};
    }

    if (!this.metrics.custom[category][name]) {
      this.metrics.custom[category][name] = {
        values: [],
        count: 0,
        sum: 0,
        avg: 0,
        min: Infinity,
        max: -Infinity,
        lastValue: null,
        tags: {}
      };
    }

    const metric = this.metrics.custom[category][name];
    metric.values.push({ timestamp, value, tags });
    metric.count++;
    metric.sum += value;
    metric.avg = metric.sum / metric.count;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.lastValue = value;
    metric.tags = { ...metric.tags, ...tags };

    // Ограничиваем количество значений
    if (metric.values.length > 1000) {
      metric.values = metric.values.slice(-1000);
    }
  }

  /**
   * Сохраняет метрики в файл
   */
  async saveMetrics() {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `metrics-${timestamp}.json`;
      const filepath = path.join(this.metricsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Ошибка сохранения метрик:', error.message);
    }
  }

  /**
   * Получает метрики за период
   */
  async getMetrics(startDate, endDate) {
    try {
      const files = await fs.readdir(this.metricsDir);
      const metrics = [];
      
      for (const file of files) {
        if (file.startsWith('metrics-') && file.endsWith('.json')) {
          const fileDate = file.replace('metrics-', '').replace('.json', '');
          if (fileDate >= startDate && fileDate <= endDate) {
            const content = await fs.readFile(path.join(this.metricsDir, file), 'utf8');
            metrics.push({ date: fileDate, ...JSON.parse(content) });
          }
        }
      }
      
      return metrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Ошибка чтения метрик:', error.message);
      return [];
    }
  }

  /**
   * Получает текущие метрики
   */
  getCurrentMetrics() {
    return { ...this.metrics };
  }

  /**
   * Очищает старые метрики
   */
  async cleanupOldMetrics() {
    try {
      const files = await fs.readdir(this.metricsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.startsWith('metrics-') && file.endsWith('.json')) {
          const fileDate = file.replace('metrics-', '').replace('.json', '');
          const fileDateTime = new Date(fileDate);
          
          if (fileDateTime < cutoffDate) {
            await fs.unlink(path.join(this.metricsDir, file));
            deletedCount++;
          }
        }
      }
      return { deletedCount };
    } catch (error) {
      console.error('Ошибка очистки старых метрик:', error.message);
      return { deletedCount: 0, error: error.message };
    }
  }

  /**
   * Экспортирует метрики в различные форматы
   */
  async exportMetrics(format = 'json', startDate = null, endDate = null) {
    const metrics = startDate && endDate 
      ? await this.getMetrics(startDate, endDate)
      : [this.getCurrentMetrics()];

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(metrics, null, 2);
      
      case 'csv':
        return this.convertToCSV(metrics);
      
      case 'summary':
        return this.generateSummary(metrics);
      
      default:
        throw new Error(`Неподдерживаемый формат: ${format}`);
    }
  }

  /**
   * Конвертирует метрики в CSV
   */
  convertToCSV(metrics) {
    // Реализация конвертации в CSV
    return 'timestamp,metric,value\n';
  }

  /**
   * Генерирует сводку метрик
   */
  generateSummary(metrics) {
    const summary = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      avgCommandDuration: 0,
      totalErrors: 0,
      memoryUsage: {
        avg: 0,
        max: 0
      }
    };

    // Анализ метрик
    metrics.forEach(metricSet => {
      Object.values(metricSet.commands || {}).forEach(cmd => {
        summary.totalCommands += cmd.total;
        summary.successfulCommands += cmd.successful;
        summary.failedCommands += cmd.failed;
      });
    });

    return summary;
  }
}

export default MetricsCollector;
