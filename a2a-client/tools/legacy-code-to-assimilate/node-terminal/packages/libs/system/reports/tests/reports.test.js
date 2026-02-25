/**
 * @fileoverview Тесты для модуля отчетов
 * @author MCP Team
 * @version 1.0.0
 */

const ReportGenerator = require('../index.js');
const fs = require('fs').promises;
const path = require('path');

describe('ReportGenerator', () => {
  let reportGenerator;
  let testReportsDir;
  let testTemplatesDir;

  beforeEach(async () => {
    testReportsDir = path.join(__dirname, 'test-reports');
    testTemplatesDir = path.join(__dirname, 'test-templates');
    
    reportGenerator = new ReportGenerator({
      reportsDir: testReportsDir,
      templatesDir: testTemplatesDir
    });
    
    // Очищаем тестовые директории
    try {
      await fs.rm(testReportsDir, { recursive: true, force: true });
      await fs.rm(testTemplatesDir, { recursive: true, force: true });
    } catch (error) {
      // Игнорируем ошибки если директории не существуют
    }
  });

  afterEach(async () => {
    // Очищаем тестовые директории
    try {
      await fs.rm(testReportsDir, { recursive: true, force: true });
      await fs.rm(testTemplatesDir, { recursive: true, force: true });
    } catch (error) {
      // Игнорируем ошибки
    }
  });

  describe('Инициализация', () => {
    test('должен создавать экземпляр с правильными настройками', () => {
      expect(reportGenerator).toBeDefined();
      expect(reportGenerator.reportsDir).toBe(testReportsDir);
      expect(reportGenerator.templatesDir).toBe(testTemplatesDir);
    });

    test('должен создавать необходимые директории при инициализации', async () => {
      await reportGenerator.ensureDirectories();
      
      const reportsExists = await fs.access(testReportsDir).then(() => true).catch(() => false);
      const templatesExists = await fs.access(testTemplatesDir).then(() => true).catch(() => false);
      
      expect(reportsExists).toBe(true);
      expect(templatesExists).toBe(true);
    });
  });

  describe('Отчеты о производительности', () => {
    const mockMetrics = {
      system: {
        uptime: 3600,
        memory: {
          total: 8589934592,
          free: 4294967296,
          used: 4294967296,
          usagePercent: 50
        },
        cpu: {
          loadAverage: [1.5, 1.2, 1.0],
          cpus: 4
        },
        platform: 'win32',
        arch: 'x64',
        nodeVersion: 'v18.0.0'
      },
      commands: {
        'test-command': {
          total: 100,
          successful: 95,
          failed: 5,
          totalDuration: 5000,
          avgDuration: 50,
          minDuration: 10,
          maxDuration: 200,
          lastExecuted: Date.now()
        },
        'another-command': {
          total: 50,
          successful: 45,
          failed: 5,
          totalDuration: 3000,
          avgDuration: 60,
          minDuration: 20,
          maxDuration: 150,
          lastExecuted: Date.now()
        }
      },
      performance: {
        memoryUsage: {
          heapUsed: 52428800,
          heapTotal: 104857600,
          external: 1024000,
          rss: 67108864
        },
        cpuUsage: {
          user: 1000000,
          system: 500000
        },
        pid: 12345
      },
      errors: {
        'Error': {
          count: 10,
          lastOccurrence: Date.now(),
          contexts: [
            { timestamp: Date.now(), message: 'Test error', stack: 'Error stack' }
          ]
        }
      }
    };

    test('должен генерировать отчет о производительности', async () => {
      await reportGenerator.ensureDirectories();
      
      const result = await reportGenerator.generatePerformanceReport(mockMetrics);
      
      expect(result.success).toBe(true);
      expect(result.filepath).toBeDefined();
      expect(result.report).toBeDefined();
      expect(result.report.title).toBe('Отчет о производительности системы');
      expect(result.report.generatedAt).toBeDefined();
      expect(result.report.summary).toBeDefined();
      expect(result.report.details).toBeDefined();
      expect(result.report.recommendations).toBeDefined();
      
      // Проверяем что файл создан
      const fileExists = await fs.access(result.filepath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    test('должен генерировать правильную сводку производительности', () => {
      const summary = reportGenerator.generatePerformanceSummary(mockMetrics);
      
      expect(summary.uptime).toBe(3600);
      expect(summary.totalCommands).toBe(150);
      expect(summary.successRate).toBeCloseTo(93.33, 1);
      expect(summary.avgResponseTime).toBe(50);
      expect(summary.memoryUsage.current).toBe(52428800);
      expect(summary.memoryUsage.peak).toBe(104857600);
      expect(summary.errors.total).toBe(10);
    });

    test('должен генерировать детали производительности', () => {
      const details = reportGenerator.generatePerformanceDetails(mockMetrics);
      
      expect(details.commands['test-command']).toBeDefined();
      expect(details.commands['test-command'].total).toBe(100);
      expect(details.commands['test-command'].successRate).toBe(95);
      expect(details.commands['test-command'].avgDuration).toBe(50);
      
      expect(details.errors['Error']).toBeDefined();
      expect(details.errors['Error'].count).toBe(10);
      
      expect(details.system.platform).toBe('win32');
      expect(details.system.arch).toBe('x64');
    });

    test('должен генерировать рекомендации по производительности', () => {
      const recommendations = reportGenerator.generatePerformanceRecommendations(mockMetrics);
      
      expect(Array.isArray(recommendations)).toBe(true);
      
      // Проверяем рекомендации по памяти (50% использования)
      const memoryRecommendation = recommendations.find(r => r.category === 'memory');
      expect(memoryRecommendation).toBeDefined();
      expect(memoryRecommendation.type).toBe('warning');
      
      // Проверяем рекомендации по командам
      const commandRecommendations = recommendations.filter(r => r.category === 'commands');
      expect(commandRecommendations.length).toBeGreaterThan(0);
    });

    test('должен обрабатывать пустые метрики', () => {
      const emptyMetrics = {};
      
      const summary = reportGenerator.generatePerformanceSummary(emptyMetrics);
      expect(summary.uptime).toBe(0);
      expect(summary.totalCommands).toBe(0);
      expect(summary.successRate).toBe(0);
      
      const details = reportGenerator.generatePerformanceDetails(emptyMetrics);
      expect(details.commands).toEqual({});
      expect(details.errors).toEqual({});
      
      const recommendations = reportGenerator.generatePerformanceRecommendations(emptyMetrics);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Отчеты о безопасности', () => {
    const mockSecurityData = {
      threats: [
        { type: 'malware', severity: 'high', description: 'Suspicious file detected' },
        { type: 'unauthorized_access', severity: 'medium', description: 'Failed login attempt' }
      ],
      blockedCommands: 15,
      vulnerabilities: 3,
      lastScan: new Date().toISOString(),
      blockedCommands: 15,
      vulnerabilities: 3
    };

    test('должен генерировать отчет о безопасности', async () => {
      await reportGenerator.ensureDirectories();
      
      const result = await reportGenerator.generateSecurityReport(mockSecurityData);
      
      expect(result.success).toBe(true);
      expect(result.report.title).toBe('Отчет о безопасности системы');
      expect(result.report.summary).toBeDefined();
      expect(result.report.threats).toBeDefined();
      expect(result.report.recommendations).toBeDefined();
    });

    test('должен генерировать правильную сводку безопасности', () => {
      const summary = reportGenerator.generateSecuritySummary(mockSecurityData);
      
      expect(summary.totalThreats).toBe(2);
      expect(summary.blockedCommands).toBe(15);
      expect(summary.vulnerabilities).toBe(3);
      expect(summary.lastScan).toBe(mockSecurityData.lastScan);
      expect(summary.riskLevel).toBe('high');
    });

    test('должен генерировать список угроз', () => {
      const threats = reportGenerator.generateSecurityThreats(mockSecurityData);
      
      expect(threats).toHaveLength(2);
      expect(threats[0].type).toBe('malware');
      expect(threats[0].severity).toBe('high');
      expect(threats[1].type).toBe('unauthorized_access');
      expect(threats[1].severity).toBe('medium');
    });

    test('должен генерировать рекомендации по безопасности', () => {
      const recommendations = reportGenerator.generateSecurityRecommendations(mockSecurityData);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      const threatRecommendation = recommendations.find(r => r.type === 'critical');
      expect(threatRecommendation).toBeDefined();
      expect(threatRecommendation.message).toContain('угрозы безопасности');
      
      const vulnerabilityRecommendation = recommendations.find(r => r.type === 'warning');
      expect(vulnerabilityRecommendation).toBeDefined();
      expect(vulnerabilityRecommendation.message).toContain('уязвимости');
    });

    test('должен правильно вычислять уровень риска', () => {
      const lowRiskData = { threats: [], vulnerabilities: 0 };
      const mediumRiskData = { threats: [{ type: 'test' }], vulnerabilities: 1 };
      const highRiskData = { threats: Array(5).fill({ type: 'test' }), vulnerabilities: 2 };
      const criticalRiskData = { threats: Array(15).fill({ type: 'test' }), vulnerabilities: 8 };
      
      expect(reportGenerator.calculateRiskLevel(lowRiskData)).toBe('low');
      expect(reportGenerator.calculateRiskLevel(mediumRiskData)).toBe('medium');
      expect(reportGenerator.calculateRiskLevel(highRiskData)).toBe('high');
      expect(reportGenerator.calculateRiskLevel(criticalRiskData)).toBe('critical');
    });
  });

  describe('Отчеты об использовании', () => {
    const mockUsageData = {
      sessions: {
        total: 100,
        active: 5,
        avgDuration: 1800,
        trends: [
          { date: '2024-01-01', count: 10 },
          { date: '2024-01-02', count: 15 }
        ]
      },
      commands: {
        total: 500,
        'test-command': { count: 200, avgDuration: 50 },
        'another-command': { count: 300, avgDuration: 30 },
        trends: [
          { date: '2024-01-01', count: 25 },
          { date: '2024-01-02', count: 30 }
        ]
      },
      users: {
        unique: 25,
        active: 8
      },
      peakUsage: {
        concurrentUsers: 12,
        timestamp: Date.now()
      },
      timeDistribution: {
        '00:00-06:00': 10,
        '06:00-12:00': 30,
        '12:00-18:00': 40,
        '18:00-24:00': 20
      }
    };

    test('должен генерировать отчет об использовании', async () => {
      await reportGenerator.ensureDirectories();
      
      const result = await reportGenerator.generateUsageReport(mockUsageData);
      
      expect(result.success).toBe(true);
      expect(result.report.title).toBe('Отчет об использовании системы');
      expect(result.report.summary).toBeDefined();
      expect(result.report.details).toBeDefined();
      expect(result.report.trends).toBeDefined();
    });

    test('должен генерировать правильную сводку использования', () => {
      const summary = reportGenerator.generateUsageSummary(mockUsageData);
      
      expect(summary.totalSessions).toBe(100);
      expect(summary.activeSessions).toBe(5);
      expect(summary.totalCommands).toBe(500);
      expect(summary.uniqueUsers).toBe(25);
      expect(summary.avgSessionDuration).toBe(1800);
      expect(summary.peakUsage).toEqual(mockUsageData.peakUsage);
    });

    test('должен генерировать детали использования', () => {
      const details = reportGenerator.generateUsageDetails(mockUsageData);
      
      expect(details.commands).toEqual(mockUsageData.commands);
      expect(details.sessions).toEqual(mockUsageData.sessions);
      expect(details.users).toEqual(mockUsageData.users);
      expect(details.timeDistribution).toEqual(mockUsageData.timeDistribution);
    });

    test('должен генерировать тренды использования', () => {
      const trends = reportGenerator.generateUsageTrends(mockUsageData);
      
      expect(trends.commands).toEqual(mockUsageData.commands.trends);
      expect(trends.sessions).toEqual(mockUsageData.sessions.trends);
      expect(trends.errors).toEqual([]);
    });
  });

  describe('Экспорт отчетов', () => {
    const mockReport = {
      title: 'Test Report',
      generatedAt: new Date().toISOString(),
      summary: { test: 'data' },
      recommendations: [
        { type: 'warning', message: 'Test warning' },
        { type: 'critical', message: 'Test critical' }
      ]
    };

    test('должен экспортировать в JSON формат', async () => {
      const jsonExport = await reportGenerator.exportReport(mockReport, 'json');
      const parsed = JSON.parse(jsonExport);
      
      expect(parsed.title).toBe('Test Report');
      expect(parsed.summary).toEqual({ test: 'data' });
    });

    test('должен экспортировать в HTML формат', async () => {
      const htmlExport = await reportGenerator.exportReport(mockReport, 'html');
      
      expect(htmlExport).toContain('<!DOCTYPE html>');
      expect(htmlExport).toContain('Test Report');
      expect(htmlExport).toContain('Test warning');
      expect(htmlExport).toContain('Test critical');
      expect(htmlExport).toContain('<style>');
    });

    test('должен экспортировать в Markdown формат', async () => {
      const markdownExport = await reportGenerator.exportReport(mockReport, 'markdown');
      
      expect(markdownExport).toContain('# Test Report');
      expect(markdownExport).toContain('**Сгенерирован:**');
      expect(markdownExport).toContain('## Сводка');
      expect(markdownExport).toContain('## Рекомендации');
      expect(markdownExport).toContain('### WARNING');
      expect(markdownExport).toContain('### CRITICAL');
    });

    test('должен экспортировать в CSV формат', async () => {
      const csvExport = await reportGenerator.exportReport(mockReport, 'csv');
      
      expect(csvExport).toContain('metric,value');
    });

    test('должен выбрасывать ошибку для неподдерживаемого формата', async () => {
      await expect(reportGenerator.exportReport(mockReport, 'unsupported'))
        .rejects.toThrow('Неподдерживаемый формат: unsupported');
    });
  });

  describe('Управление отчетами', () => {
    test('должен получать список отчетов', async () => {
      await reportGenerator.ensureDirectories();
      
      // Создаем тестовые отчеты
      const testReport1 = { test: 'data1' };
      const testReport2 = { test: 'data2' };
      
      await fs.writeFile(
        path.join(testReportsDir, 'report1.json'),
        JSON.stringify(testReport1)
      );
      await fs.writeFile(
        path.join(testReportsDir, 'report2.json'),
        JSON.stringify(testReport2)
      );
      
      const reports = await reportGenerator.listReports();
      
      expect(reports).toHaveLength(2);
      expect(reports[0].filename).toBeDefined();
      expect(reports[0].size).toBeGreaterThan(0);
      expect(reports[0].created).toBeDefined();
      expect(reports[0].modified).toBeDefined();
    });

    test('должен очищать старые отчеты', async () => {
      await reportGenerator.ensureDirectories();
      
      // Создаем старые и новые отчеты
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const newDate = new Date();
      
      await fs.writeFile(
        path.join(testReportsDir, 'old-report.json'),
        JSON.stringify({ old: 'data' })
      );
      await fs.writeFile(
        path.join(testReportsDir, 'new-report.json'),
        JSON.stringify({ new: 'data' })
      );
      
      // Устанавливаем время создания файлов
      await fs.utimes(path.join(testReportsDir, 'old-report.json'), oldDate, oldDate);
      await fs.utimes(path.join(testReportsDir, 'new-report.json'), newDate, newDate);
      
      const result = await reportGenerator.cleanupOldReports(30);
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      
      const files = await fs.readdir(testReportsDir);
      expect(files).toContain('new-report.json');
      expect(files).not.toContain('old-report.json');
    });

    test('должен обрабатывать ошибки при очистке', async () => {
      // Попытка очистки несуществующей директории
      const nonExistentGenerator = new ReportGenerator({
        reportsDir: '/non/existent/path'
      });
      
      const result = await nonExistentGenerator.cleanupOldReports(30);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Интеграционные тесты', () => {
    test('должен работать в полном цикле генерации отчетов', async () => {
      await reportGenerator.ensureDirectories();
      
      // Подготавливаем тестовые данные
      const metrics = {
        system: { uptime: 3600, memory: { usagePercent: 75 } },
        commands: {
          'test-command': { total: 100, successful: 90, failed: 10, avgDuration: 50 }
        },
        errors: { 'Error': { count: 5 } }
      };
      
      const securityData = {
        threats: [{ type: 'test', severity: 'medium' }],
        vulnerabilities: 2,
        blockedCommands: 10
      };
      
      const usageData = {
        sessions: { total: 50, active: 5 },
        commands: { total: 200 },
        users: { unique: 10 }
      };
      
      // Генерируем отчеты
      const perfResult = await reportGenerator.generatePerformanceReport(metrics);
      const secResult = await reportGenerator.generateSecurityReport(securityData);
      const usageResult = await reportGenerator.generateUsageReport(usageData);
      
      expect(perfResult.success).toBe(true);
      expect(secResult.success).toBe(true);
      expect(usageResult.success).toBe(true);
      
      // Проверяем что файлы созданы
      const files = await fs.readdir(testReportsDir);
      expect(files.length).toBeGreaterThanOrEqual(3);
      
      // Экспортируем в разные форматы
      const htmlExport = await reportGenerator.exportReport(perfResult.report, 'html');
      const markdownExport = await reportGenerator.exportReport(secResult.report, 'markdown');
      
      expect(htmlExport).toContain('<!DOCTYPE html>');
      expect(markdownExport).toContain('# Отчет о безопасности системы');
      
      // Получаем список отчетов
      const reports = await reportGenerator.listReports();
      expect(reports.length).toBeGreaterThanOrEqual(3);
    });
  });
});
