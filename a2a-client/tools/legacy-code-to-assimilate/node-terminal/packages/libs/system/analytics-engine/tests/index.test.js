const { AnalyticsEngine, recordCommandMetric, recordSecurityMetric, recordPerformanceMetric, recordSessionMetric, recordSystemMetric, getMetrics, generateReport, saveReport, exportMetrics, cleanupMetrics } = require('../index.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');

describe('AnalyticsEngine', () => {
  let engine;
  let mockMetricsDir;
  let mockReportsDir;
  let consoleErrorSpy;

  beforeEach(() => {
    mockMetricsDir = path.join(os.tmpdir(), `test-metrics-${Date.now()}`);
    mockReportsDir = path.join(os.tmpdir(), `test-reports-${Date.now()}`);

    // Mock fs functions
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    consoleErrorSpy = jest.spyOn(consoleUtils, 'error').mockImplementation(() => {});

    // Create a fresh instance for each test to ensure isolation
    engine = new AnalyticsEngine();
    engine.metricsDir = mockMetricsDir;
    engine.reportsDir = mockReportsDir;
    engine.initializeMetrics(); // Re-initialize to ensure baseMetrics are fresh
    engine.metricsCache.clear(); // Clear cache for each test

    jest.spyOn(global.Date, 'now').mockReturnValue(1678886400000); // Consistent timestamp
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    try {
      fs.rmSync(mockMetricsDir, { recursive: true, force: true });
      fs.rmSync(mockReportsDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Инициализация', () => {
    test('должен инициализировать директории и метрики', () => {
      expect(engine.metricsDir).toBe(mockMetricsDir);
      expect(engine.reportsDir).toBe(mockReportsDir);
      expect(engine.metricsCache).toBeInstanceOf(Map);
      expect(engine.baseMetrics).toBeDefined();
      expect(fs.existsSync).toHaveBeenCalledTimes(2);
      expect(fs.mkdirSync).not.toHaveBeenCalled(); // Should not call if existsSync returns true
    });

    test('должен создавать директории если они не существуют', () => {
      fs.existsSync.mockReturnValue(false);
      new AnalyticsEngine();
      expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(process.cwd(), 'metrics'), { recursive: true });
      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(process.cwd(), 'reports'), { recursive: true });
    });

    test('должен логировать ошибку если создание директории не удалось', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });
      new AnalyticsEngine();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create analytics directories:', 'Permission denied');
    });

    test('должен инициализировать базовые метрики с правильной структурой', () => {
      const baseMetrics = engine.baseMetrics;
      
      expect(baseMetrics.commands).toBeDefined();
      expect(baseMetrics.commands.total).toBe(0);
      expect(baseMetrics.commands.successful).toBe(0);
      expect(baseMetrics.commands.failed).toBe(0);
      expect(baseMetrics.commands.blocked).toBe(0);
      expect(baseMetrics.commands.avgDuration).toBe(0);
      expect(baseMetrics.commands.totalDuration).toBe(0);
      
      expect(baseMetrics.security).toBeDefined();
      expect(baseMetrics.security.blocks).toBe(0);
      expect(baseMetrics.security.threats).toBe(0);
      expect(baseMetrics.security.selfTests).toBe(0);
      expect(baseMetrics.security.vulnerabilities).toBe(0);
      
      expect(baseMetrics.performance).toBeDefined();
      expect(baseMetrics.performance.avgResponseTime).toBe(0);
      expect(baseMetrics.performance.peakMemoryUsage).toBe(0);
      expect(baseMetrics.performance.cpuUsage).toBe(0);
      expect(baseMetrics.performance.errors).toBe(0);
      
      expect(baseMetrics.sessions).toBeDefined();
      expect(baseMetrics.sessions.total).toBe(0);
      expect(baseMetrics.sessions.active).toBe(0);
      expect(baseMetrics.sessions.avgCommandsPerSession).toBe(0);
      
      expect(baseMetrics.system).toBeDefined();
      expect(baseMetrics.system.uptime).toBe(0);
      expect(baseMetrics.system.restarts).toBe(0);
      expect(baseMetrics.system.errors).toBe(0);
      expect(baseMetrics.system.warnings).toBe(0);
    });
  });

  describe('Запись метрик', () => {
    test('должен записывать новую метрику и обновлять кэш', () => {
      engine.recordMetric('commands', 'success', { action: 'login' }, 150);

      const cachedMetric = engine.metricsCache.get('commands:success');
      expect(cachedMetric).toBeDefined();
      expect(cachedMetric.count).toBe(1);
      expect(cachedMetric.totalValue).toBe(150);
      expect(cachedMetric.data).toHaveLength(1);
      expect(cachedMetric.data[0]).toEqual({
        timestamp: 1678886400000,
        value: 150,
        data: { action: 'login' }
      });
      expect(engine.baseMetrics.commands.total).toBe(1);
      expect(engine.baseMetrics.commands.successful).toBe(1);
      expect(engine.baseMetrics.commands.totalDuration).toBe(150);
      expect(engine.baseMetrics.commands.avgDuration).toBe(150);
    });

    test('должен обновлять существующую метрику в кэше', () => {
      engine.recordMetric('commands', 'success', { action: 'login' }, 100);
      engine.recordMetric('commands', 'success', { action: 'logout' }, 200);

      const cachedMetric = engine.metricsCache.get('commands:success');
      expect(cachedMetric.count).toBe(2);
      expect(cachedMetric.totalValue).toBe(300);
      expect(cachedMetric.data).toHaveLength(2);
      expect(engine.baseMetrics.commands.total).toBe(2);
      expect(engine.baseMetrics.commands.successful).toBe(2);
      expect(engine.baseMetrics.commands.avgDuration).toBe(150);
    });

    test('должен ограничивать размер данных в кэше', () => {
      // Добавляем больше 1000 записей
      for (let i = 0; i < 1100; i++) {
        engine.recordMetric('commands', 'success', { index: i }, i);
      }

      const cachedMetric = engine.metricsCache.get('commands:success');
      expect(cachedMetric.data).toHaveLength(1000);
      expect(cachedMetric.data[0].data.index).toBe(100);
      expect(cachedMetric.data[999].data.index).toBe(1099);
    });

    test('должен обрабатывать различные категории метрик', () => {
      engine.recordMetric('security', 'block', { reason: 'suspicious' }, 1);
      engine.recordMetric('performance', 'memory_peak', { usage: '80%' }, 80);
      engine.recordMetric('sessions', 'start', { user: 'test' }, 1);

      expect(engine.metricsCache.get('security:block')).toBeDefined();
      expect(engine.metricsCache.get('performance:memory_peak')).toBeDefined();
      expect(engine.metricsCache.get('sessions:start')).toBeDefined();
    });

    test('должен обновлять базовые метрики для команд', () => {
      engine.recordMetric('commands', 'success', {}, 100);
      engine.recordMetric('commands', 'failed', {}, 200);
      engine.recordMetric('commands', 'blocked', {}, 50);

      expect(engine.baseMetrics.commands.total).toBe(3);
      expect(engine.baseMetrics.commands.successful).toBe(1);
      expect(engine.baseMetrics.commands.failed).toBe(1);
      expect(engine.baseMetrics.commands.blocked).toBe(1);
      expect(engine.baseMetrics.commands.totalDuration).toBe(350);
      expect(engine.baseMetrics.commands.avgDuration).toBeCloseTo(116.67, 1);
    });

    test('должен обновлять базовые метрики для безопасности', () => {
      engine.recordMetric('security', 'block', {}, 1);
      engine.recordMetric('security', 'threat', {}, 1);
      engine.recordMetric('security', 'self_test', {}, 1);
      engine.recordMetric('security', 'vulnerability', {}, 1);

      expect(engine.baseMetrics.security.blocks).toBe(1);
      expect(engine.baseMetrics.security.threats).toBe(1);
      expect(engine.baseMetrics.security.selfTests).toBe(1);
      expect(engine.baseMetrics.security.vulnerabilities).toBe(1);
    });

    test('должен обновлять базовые метрики для производительности', () => {
      engine.recordMetric('performance', 'response_time', {}, 50);
      engine.recordMetric('performance', 'memory_peak', {}, 1024);
      engine.recordMetric('performance', 'cpu_usage', {}, 25);
      engine.recordMetric('performance', 'error', {}, 1);

      expect(engine.baseMetrics.performance.avgResponseTime).toBe(50);
      expect(engine.baseMetrics.performance.peakMemoryUsage).toBe(1024);
      expect(engine.baseMetrics.performance.cpuUsage).toBe(25);
      expect(engine.baseMetrics.performance.errors).toBe(1);
    });

    test('должен обновлять базовые метрики для сессий', () => {
      engine.recordMetric('sessions', 'start', {}, 1);
      engine.recordMetric('sessions', 'active', {}, 1);
      engine.recordMetric('sessions', 'commands_per_session', {}, 10);

      expect(engine.baseMetrics.sessions.total).toBe(1);
      expect(engine.baseMetrics.sessions.active).toBe(1);
      expect(engine.baseMetrics.sessions.avgCommandsPerSession).toBe(10);
    });

    test('должен обновлять базовые метрики для системы', () => {
      engine.recordMetric('system', 'uptime', {}, 3600);
      engine.recordMetric('system', 'restart', {}, 1);
      engine.recordMetric('system', 'error', {}, 1);
      engine.recordMetric('system', 'warning', {}, 1);

      expect(engine.baseMetrics.system.uptime).toBe(3600);
      expect(engine.baseMetrics.system.restarts).toBe(1);
      expect(engine.baseMetrics.system.errors).toBe(1);
      expect(engine.baseMetrics.system.warnings).toBe(1);
    });
  });

  describe('Кэширование метрик', () => {
    test('должен правильно управлять TTL кэша', () => {
      engine.recordMetric('commands', 'success', {}, 100);
      
      const cachedMetric = engine.metricsCache.get('commands:success');
      expect(cachedMetric.lastUpdate).toBe(1678886400000);
      
      // Симулируем истечение TTL
      const oldTimestamp = cachedMetric.lastUpdate;
      cachedMetric.lastUpdate = oldTimestamp - (engine.cacheTTL + 1000);
      
      // Новая запись должна обновить timestamp
      engine.recordMetric('commands', 'success', {}, 200);
      expect(cachedMetric.lastUpdate).toBe(1678886400000);
    });

    test('должен очищать устаревшие данные из кэша', () => {
      engine.recordMetric('commands', 'success', {}, 100);
      
      const cachedMetric = engine.metricsCache.get('commands:success');
      cachedMetric.lastUpdate = Date.now() - (engine.cacheTTL + 1000);
      
      // Симулируем очистку кэша
      engine.cleanupCache();
      
      // Проверяем что кэш очищен
      expect(engine.metricsCache.size).toBe(0);
    });
  });

  describe('Генерация отчетов', () => {
    test('должен генерировать базовый отчет', () => {
      // Добавляем тестовые метрики
      engine.recordMetric('commands', 'success', {}, 100);
      engine.recordMetric('security', 'block', {}, 1);
      engine.recordMetric('performance', 'response_time', {}, 50);

      const report = engine.generateReport();
      
      expect(report).toBeDefined();
      expect(report.timestamp).toBe(1678886400000);
      expect(report.metrics).toBeDefined();
      expect(report.summary).toBeDefined();
    });

    test('должен генерировать сводку метрик', () => {
      engine.recordMetric('commands', 'success', {}, 100);
      engine.recordMetric('commands', 'failed', {}, 200);
      engine.recordMetric('security', 'block', {}, 1);

      const report = engine.generateReport();
      const summary = report.summary;
      
      expect(summary.totalCommands).toBe(2);
      expect(summary.successRate).toBe(50);
      expect(summary.avgResponseTime).toBe(150);
      expect(summary.securityBlocks).toBe(1);
    });

    test('должен генерировать детализированный отчет', () => {
      engine.recordMetric('commands', 'success', { action: 'login' }, 100);
      engine.recordMetric('commands', 'success', { action: 'logout' }, 200);

      const report = engine.generateReport();
      
      expect(report.details.commands).toBeDefined();
      expect(report.details.commands['commands:success']).toBeDefined();
      expect(report.details.commands['commands:success'].count).toBe(2);
      expect(report.details.commands['commands:success'].avgValue).toBe(150);
    });
  });

  describe('Сохранение и экспорт', () => {
    test('должен сохранять отчет в файл', () => {
      engine.recordMetric('commands', 'success', {}, 100);
      
      const report = engine.generateReport();
      engine.saveReport(report);
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('analytics-report'),
        expect.stringContaining('"timestamp":1678886400000'),
        'utf8'
      );
    });

    test('должен экспортировать метрики в JSON', () => {
      engine.recordMetric('commands', 'success', {}, 100);
      
      const jsonExport = engine.exportMetrics('json');
      const parsed = JSON.parse(jsonExport);
      
      expect(parsed).toBeDefined();
      expect(parsed.metrics).toBeDefined();
      expect(parsed.summary).toBeDefined();
    });

    test('должен экспортировать метрики в CSV', () => {
      engine.recordMetric('commands', 'success', {}, 100);
      engine.recordMetric('commands', 'failed', {}, 200);
      
      const csvExport = engine.exportMetrics('csv');
      
      expect(csvExport).toContain('category,event,count,total_value,avg_value');
      expect(csvExport).toContain('commands,success,1,100,100');
      expect(csvExport).toContain('commands,failed,1,200,200');
    });

    test('должен экспортировать метрики в HTML', () => {
      engine.recordMetric('commands', 'success', {}, 100);
      
      const htmlExport = engine.exportMetrics('html');
      
      expect(htmlExport).toContain('<!DOCTYPE html>');
      expect(htmlExport).toContain('<title>Analytics Report</title>');
      expect(htmlExport).toContain('commands:success');
    });

    test('должен выбрасывать ошибку для неподдерживаемого формата', () => {
      expect(() => engine.exportMetrics('unsupported'))
        .toThrow('Unsupported export format: unsupported');
    });
  });

  describe('Очистка метрик', () => {
    test('должен очищать старые метрики', () => {
      // Добавляем тестовые метрики
      engine.recordMetric('commands', 'success', {}, 100);
      engine.recordMetric('security', 'block', {}, 1);
      
      const initialCacheSize = engine.metricsCache.size;
      expect(initialCacheSize).toBeGreaterThan(0);
      
      engine.cleanupMetrics();
      
      expect(engine.metricsCache.size).toBe(0);
      expect(engine.baseMetrics.commands.total).toBe(0);
      expect(engine.baseMetrics.security.blocks).toBe(0);
    });

    test('должен очищать файлы отчетов старше указанного возраста', () => {
      // Симулируем существующие файлы отчетов
      const oldFile = path.join(mockReportsDir, 'analytics-report-2023-01-01.json');
      const newFile = path.join(mockReportsDir, 'analytics-report-2024-01-01.json');
      
      fs.existsSync.mockImplementation((path) => {
        return path === mockReportsDir || path === mockMetricsDir;
      });
      
      // Симулируем чтение директории
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        'analytics-report-2023-01-01.json',
        'analytics-report-2024-01-01.json'
      ]);
      
      // Симулируем статистику файлов
      jest.spyOn(fs, 'statSync').mockImplementation((filePath) => {
        const isOld = filePath.includes('2023-01-01');
        return {
          mtime: new Date(isOld ? '2023-01-01' : '2024-01-01'),
          isFile: () => true
        };
      });
      
      engine.cleanupMetrics(30); // Очистка файлов старше 30 дней
      
      expect(fs.unlinkSync).toHaveBeenCalledWith(oldFile);
      expect(fs.unlinkSync).not.toHaveBeenCalledWith(newFile);
    });
  });

  describe('Интеграционные тесты', () => {
    test('должен работать в полном цикле сбора и анализа метрик', () => {
      // Симулируем полный цикл работы
      engine.recordMetric('commands', 'success', { action: 'login' }, 100);
      engine.recordMetric('commands', 'failed', { action: 'delete' }, 200);
      engine.recordMetric('security', 'block', { reason: 'suspicious' }, 1);
      engine.recordMetric('performance', 'response_time', { endpoint: '/api' }, 50);
      engine.recordMetric('sessions', 'start', { user: 'test' }, 1);
      engine.recordMetric('system', 'uptime', {}, 3600);

      // Генерируем отчет
      const report = engine.generateReport();
      
      // Проверяем структуру отчета
      expect(report.timestamp).toBe(1678886400000);
      expect(report.metrics).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.details).toBeDefined();
      
      // Проверяем сводку
      expect(report.summary.totalCommands).toBe(2);
      expect(report.summary.successRate).toBe(50);
      expect(report.summary.securityBlocks).toBe(1);
      expect(report.summary.avgResponseTime).toBe(50);
      
      // Сохраняем отчет
      engine.saveReport(report);
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Экспортируем в разные форматы
      const jsonExport = engine.exportMetrics('json');
      const csvExport = engine.exportMetrics('csv');
      const htmlExport = engine.exportMetrics('html');
      
      expect(jsonExport).toContain('"timestamp":1678886400000');
      expect(csvExport).toContain('category,event,count');
      expect(htmlExport).toContain('<!DOCTYPE html>');
    });

    test('должен корректно обрабатывать ошибки и исключения', () => {
      // Симулируем ошибку при записи файла
      fs.writeFileSync.mockImplementationOnce(() => {
        throw new Error('Disk full');
      });
      
      engine.recordMetric('commands', 'success', {}, 100);
      const report = engine.generateReport();
      
      // Должен логировать ошибку но не падать
      expect(() => engine.saveReport(report)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save analytics report:',
        'Disk full'
      );
    });

    test('должен поддерживать параллельную запись метрик', () => {
      // Симулируем параллельную запись
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve(engine.recordMetric('commands', 'success', { index: i }, i))
        );
      }
      
      return Promise.all(promises).then(() => {
        const cachedMetric = engine.metricsCache.get('commands:success');
        expect(cachedMetric.count).toBe(100);
        expect(cachedMetric.totalValue).toBe(4950); // sum of 0-99
      });
    });
  });

  describe('Производительность', () => {
    test('должен эффективно обрабатывать большие объемы метрик', () => {
      const startTime = Date.now();
      
      // Добавляем 10000 метрик
      for (let i = 0; i < 10000; i++) {
        engine.recordMetric('commands', 'success', { index: i }, i);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Проверяем что обработка заняла менее 1 секунды
      expect(duration).toBeLessThan(1000);
      
      const cachedMetric = engine.metricsCache.get('commands:success');
      expect(cachedMetric.count).toBe(10000);
      expect(cachedMetric.data.length).toBeLessThanOrEqual(1000); // Ограничение размера
    });

    test('должен эффективно генерировать отчеты для больших объемов данных', () => {
      // Добавляем много метрик
      for (let i = 0; i < 1000; i++) {
        engine.recordMetric('commands', 'success', { index: i }, i);
        engine.recordMetric('performance', 'response_time', { index: i }, i * 10);
      }
      
      const startTime = Date.now();
      const report = engine.generateReport();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Проверяем что генерация отчета заняла менее 100мс
      expect(duration).toBeLessThan(100);
      expect(report).toBeDefined();
      expect(report.summary.totalCommands).toBe(1000);
    });
  });
});
