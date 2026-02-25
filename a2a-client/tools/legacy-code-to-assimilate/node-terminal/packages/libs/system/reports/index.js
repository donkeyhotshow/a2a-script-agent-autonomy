/**
 * @fileoverview Система отчетов для MCP Terminal Server
 * Генерирует различные типы отчетов на основе метрик и данных системы
 * @author MCP Team
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

class ReportGenerator {
  constructor(options = {}) {
    this.reportsDir = options.reportsDir || path.join(process.cwd(), 'reports');
    this.templatesDir = options.templatesDir || path.join(__dirname, 'templates');
    this.ensureDirectories();
  }

  /**
   * Создает необходимые директории
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      await fs.mkdir(this.templatesDir, { recursive: true });
    } catch (error) {
      console.error('Ошибка создания директорий отчетов:', error.message);
    }
  }

  /**
   * Генерирует отчет о производительности
   */
  async generatePerformanceReport(metrics, options = {}) {
    const report = {
      title: 'Отчет о производительности системы',
      generatedAt: new Date().toISOString(),
      period: options.period || 'last_24h',
      summary: this.generatePerformanceSummary(metrics),
      details: this.generatePerformanceDetails(metrics),
      recommendations: this.generatePerformanceRecommendations(metrics)
    };

    const filename = `performance-report-${Date.now()}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    return { success: true, filepath, report };
  }

  /**
   * Генерирует сводку производительности
   */
  generatePerformanceSummary(metrics) {
    const summary = {
      uptime: 0,
      totalCommands: 0,
      successRate: 0,
      avgResponseTime: 0,
      memoryUsage: {
        current: 0,
        peak: 0,
        avg: 0
      },
      cpuUsage: {
        current: 0,
        avg: 0
      },
      errors: {
        total: 0,
        critical: 0,
        warnings: 0
      }
    };

    if (metrics.system) {
      summary.uptime = metrics.system.uptime || 0;
    }

    if (metrics.commands) {
      Object.values(metrics.commands).forEach(cmd => {
        summary.totalCommands += cmd.total || 0;
        summary.successRate = (cmd.successful || 0) / (cmd.total || 1) * 100;
        summary.avgResponseTime = (cmd.avgDuration || 0);
      });
    }

    if (metrics.performance) {
      const memUsage = metrics.performance.memoryUsage;
      if (memUsage) {
        summary.memoryUsage.current = memUsage.heapUsed || 0;
        summary.memoryUsage.peak = memUsage.heapTotal || 0;
      }
    }

    return summary;
  }

  /**
   * Генерирует детали производительности
   */
  generatePerformanceDetails(metrics) {
    const details = {
      commands: {},
      errors: {},
      system: {},
      custom: {}
    };

    // Детали по командам
    if (metrics.commands) {
      Object.entries(metrics.commands).forEach(([cmdName, cmdData]) => {
        details.commands[cmdName] = {
          total: cmdData.total,
          successful: cmdData.successful,
          failed: cmdData.failed,
          successRate: (cmdData.successful / cmdData.total) * 100,
          avgDuration: cmdData.avgDuration,
          minDuration: cmdData.minDuration,
          maxDuration: cmdData.maxDuration,
          lastExecuted: cmdData.lastExecuted
        };
      });
    }

    // Детали по ошибкам
    if (metrics.errors) {
      Object.entries(metrics.errors).forEach(([errorName, errorData]) => {
        details.errors[errorName] = {
          count: errorData.count,
          lastOccurrence: errorData.lastOccurrence,
          recentErrors: errorData.contexts?.slice(-5) || []
        };
      });
    }

    // Системные детали
    if (metrics.system) {
      details.system = {
        platform: metrics.system.platform,
        arch: metrics.system.arch,
        nodeVersion: metrics.system.nodeVersion,
        memory: metrics.system.memory,
        cpu: metrics.system.cpu
      };
    }

    return details;
  }

  /**
   * Генерирует рекомендации по производительности
   */
  generatePerformanceRecommendations(metrics) {
    const recommendations = [];

    // Анализ памяти
    if (metrics.system?.memory) {
      const memUsage = metrics.system.memory.usagePercent;
      if (memUsage > 80) {
        recommendations.push({
          type: 'warning',
          category: 'memory',
          message: 'Высокое использование памяти. Рекомендуется оптимизация или увеличение ресурсов.',
          priority: 'high'
        });
      }
    }

    // Анализ ошибок
    if (metrics.errors) {
      const totalErrors = Object.values(metrics.errors).reduce((sum, err) => sum + err.count, 0);
      if (totalErrors > 100) {
        recommendations.push({
          type: 'error',
          category: 'errors',
          message: 'Большое количество ошибок. Необходимо провести анализ и исправление.',
          priority: 'critical'
        });
      }
    }

    // Анализ команд
    if (metrics.commands) {
      Object.entries(metrics.commands).forEach(([cmdName, cmdData]) => {
        const successRate = (cmdData.successful / cmdData.total) * 100;
        if (successRate < 90) {
          recommendations.push({
            type: 'warning',
            category: 'commands',
            message: `Низкий процент успешности команды "${cmdName}": ${successRate.toFixed(1)}%`,
            priority: 'medium'
          });
        }
      });
    }

    return recommendations;
  }

  /**
   * Генерирует отчет о безопасности
   */
  async generateSecurityReport(securityData, options = {}) {
    const report = {
      title: 'Отчет о безопасности системы',
      generatedAt: new Date().toISOString(),
      summary: this.generateSecuritySummary(securityData),
      threats: this.generateSecurityThreats(securityData),
      recommendations: this.generateSecurityRecommendations(securityData)
    };

    const filename = `security-report-${Date.now()}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    return { success: true, filepath, report };
  }

  /**
   * Генерирует сводку безопасности
   */
  generateSecuritySummary(securityData) {
    return {
      totalThreats: securityData.threats?.length || 0,
      blockedCommands: securityData.blockedCommands || 0,
      vulnerabilities: securityData.vulnerabilities || 0,
      lastScan: securityData.lastScan || new Date().toISOString(),
      riskLevel: this.calculateRiskLevel(securityData)
    };
  }

  /**
   * Генерирует список угроз
   */
  generateSecurityThreats(securityData) {
    return securityData.threats || [];
  }

  /**
   * Генерирует рекомендации по безопасности
   */
  generateSecurityRecommendations(securityData) {
    const recommendations = [];

    if (securityData.threats?.length > 0) {
      recommendations.push({
        type: 'critical',
        message: 'Обнаружены угрозы безопасности. Требуется немедленное вмешательство.',
        priority: 'highest'
      });
    }

    if (securityData.vulnerabilities > 0) {
      recommendations.push({
        type: 'warning',
        message: 'Обнаружены уязвимости. Рекомендуется обновление системы.',
        priority: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Вычисляет уровень риска
   */
  calculateRiskLevel(securityData) {
    const threats = securityData.threats?.length || 0;
    const vulnerabilities = securityData.vulnerabilities || 0;

    if (threats > 10 || vulnerabilities > 5) return 'critical';
    if (threats > 5 || vulnerabilities > 2) return 'high';
    if (threats > 0 || vulnerabilities > 0) return 'medium';
    return 'low';
  }

  /**
   * Генерирует отчет об использовании
   */
  async generateUsageReport(usageData, options = {}) {
    const report = {
      title: 'Отчет об использовании системы',
      generatedAt: new Date().toISOString(),
      period: options.period || 'last_30d',
      summary: this.generateUsageSummary(usageData),
      details: this.generateUsageDetails(usageData),
      trends: this.generateUsageTrends(usageData)
    };

    const filename = `usage-report-${Date.now()}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    return { success: true, filepath, report };
  }

  /**
   * Генерирует сводку использования
   */
  generateUsageSummary(usageData) {
    return {
      totalSessions: usageData.sessions?.total || 0,
      activeSessions: usageData.sessions?.active || 0,
      totalCommands: usageData.commands?.total || 0,
      uniqueUsers: usageData.users?.unique || 0,
      avgSessionDuration: usageData.sessions?.avgDuration || 0,
      peakUsage: usageData.peakUsage || {}
    };
  }

  /**
   * Генерирует детали использования
   */
  generateUsageDetails(usageData) {
    return {
      commands: usageData.commands || {},
      sessions: usageData.sessions || {},
      users: usageData.users || {},
      timeDistribution: usageData.timeDistribution || {}
    };
  }

  /**
   * Генерирует тренды использования
   */
  generateUsageTrends(usageData) {
    return {
      commands: usageData.commands?.trends || [],
      sessions: usageData.sessions?.trends || [],
      errors: usageData.errors?.trends || []
    };
  }

  /**
   * Экспортирует отчет в различные форматы
   */
  async exportReport(report, format = 'json') {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(report, null, 2);
      
      case 'html':
        return this.convertToHTML(report);
      
      case 'markdown':
        return this.convertToMarkdown(report);
      
      case 'csv':
        return this.convertToCSV(report);
      
      default:
        throw new Error(`Неподдерживаемый формат: ${format}`);
    }
  }

  /**
   * Конвертирует отчет в HTML
   */
  convertToHTML(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .recommendation { margin: 10px 0; padding: 10px; border-left: 4px solid #007cba; }
        .critical { border-left-color: #dc3545; }
        .warning { border-left-color: #ffc107; }
    </style>
</head>
<body>
    <h1>${report.title}</h1>
    <p>Сгенерирован: ${report.generatedAt}</p>
    
    <div class="summary">
        <h2>Сводка</h2>
        <pre>${JSON.stringify(report.summary, null, 2)}</pre>
    </div>
    
    ${report.recommendations ? `
    <div class="recommendations">
        <h2>Рекомендации</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation ${rec.type}">
                <strong>${rec.type.toUpperCase()}:</strong> ${rec.message}
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;
  }

  /**
   * Конвертирует отчет в Markdown
   */
  convertToMarkdown(report) {
    let markdown = `# ${report.title}\n\n`;
    markdown += `**Сгенерирован:** ${report.generatedAt}\n\n`;
    
    if (report.summary) {
      markdown += `## Сводка\n\n`;
      markdown += `\`\`\`json\n${JSON.stringify(report.summary, null, 2)}\n\`\`\`\n\n`;
    }
    
    if (report.recommendations) {
      markdown += `## Рекомендации\n\n`;
      report.recommendations.forEach(rec => {
        markdown += `### ${rec.type.toUpperCase()}\n`;
        markdown += `${rec.message}\n\n`;
      });
    }
    
    return markdown;
  }

  /**
   * Конвертирует отчет в CSV
   */
  convertToCSV(report) {
    // Базовая реализация конвертации в CSV
    return 'metric,value\n';
  }

  /**
   * Получает список всех отчетов
   */
  async listReports() {
    try {
      const files = await fs.readdir(this.reportsDir);
      const reports = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const stats = await fs.stat(path.join(this.reportsDir, file));
          reports.push({
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          });
        }
      }
      
      return reports.sort((a, b) => b.modified - a.modified);
    } catch (error) {
      console.error('Ошибка получения списка отчетов:', error.message);
      return [];
    }
  }

  /**
   * Удаляет старые отчеты
   */
  async cleanupOldReports(daysToKeep = 30) {
    try {
      const files = await fs.readdir(this.reportsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      let deletedCount = 0;
      for (const file of files) {
        if (file.endsWith('.json')) {
          const stats = await fs.stat(path.join(this.reportsDir, file));
          if (stats.mtime < cutoffDate) {
            await fs.unlink(path.join(this.reportsDir, file));
            deletedCount++;
          }
        }
      }
      
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Ошибка очистки старых отчетов:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default ReportGenerator;
