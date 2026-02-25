/**
 * @fileoverview Тесты для модуля метрик
 * @author MCP Team
 * @version 1.0.0
 */

const MetricsCollector = require('../index.js');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('MetricsCollector', () => {
  let metricsCollector;
  let testMetricsDir;

  beforeEach(async () => {
    testMetricsDir = path.join(__dirname, 'test-metrics');
    metricsCollector = new MetricsCollector({
      metricsDir: testMetricsDir,
      retentionDays: 7,
      collectionInterval: 1000
    });
    
    // Очищаем тестовую директорию
    try {
      await fs.rm(testMetricsDir, { recursive: true, force: true });
    } catch (error) {
      // Игнорируем ошибки если директория не существует
    }
  });

  afterEach(async () => {
    // Останавливаем сбор метрик
    metricsCollector.stopCollection();
    
    // Очищаем тестовую директорию
    try {
      await fs.rm(testMetricsDir, { recursive: true, force: true });
    } catch (error) {
      // Игнорируем ошибки
    }
  });

  describe('Инициализация', () => {
    test('должен создавать экземпляр с правильными настройками', () => {
      expect(metricsCollector).toBeDefined();
      expect(metricsCollector.metricsDir).toBe(testMetricsDir);
      expect(metricsCollector.retentionDays).toBe(7);
      expect(metricsCollector.collectionInterval).toBe(1000);
      expect(metricsCollector.isCollecting).toBe(false);
    });

    test('должен создавать директорию метрик при инициализации', async () => {
      await metricsCollector.ensureMetricsDirectory();
      const exists = await fs.access(testMetricsDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    test('должен инициализировать базовые метрики', () => {
      const metrics = metricsCollector.getCurrentMetrics();
      expect(metrics.system).toBeDefined();
      expect(metrics.performance).toBeDefined();
      expect(metrics.commands).toBeDefined();
      expect(metrics.errors).toBeDefined();
      expect(metrics.custom).toBeDefined();
    });
  });

  describe('Сбор системных метрик', () => {
    test('должен собирать системные метрики', () => {
      metricsCollector.collectSystemMetrics();
      const metrics = metricsCollector.getCurrentMetrics();
      
      expect(metrics.system.timestamp).toBeDefined();
      expect(metrics.system.uptime).toBeGreaterThan(0);
      expect(metrics.system.memory).toBeDefined();
      expect(metrics.system.memory.total).toBeGreaterThan(0);
      expect(metrics.system.memory.free).toBeGreaterThan(0);
      expect(metrics.system.memory.used).toBeGreaterThan(0);
      expect(metrics.system.memory.usagePercent).toBeGreaterThan(0);
      expect(metrics.system.cpu).toBeDefined();
      expect(metrics.system.platform).toBe(os.platform());
      expect(metrics.system.arch).toBe(os.arch());
      expect(metrics.system.nodeVersion).toBe(process.version);
    });

    test('должен собирать метрики производительности процесса', () => {
      metricsCollector.collectSystemMetrics();
      const metrics = metricsCollector.getCurrentMetrics();
      
      expect(metrics.performance.timestamp).toBeDefined();
      expect(metrics.performance.memoryUsage).toBeDefined();
      expect(metrics.performance.cpuUsage).toBeDefined();
      expect(metrics.performance.pid).toBe(process.pid);
    });

    test('должен начинать и останавливать сбор метрик', () => {
      expect(metricsCollector.isCollecting).toBe(false);
      
      metricsCollector.startCollection();
      expect(metricsCollector.isCollecting).toBe(true);
      expect(metricsCollector.interval).toBeDefined();
      
      metricsCollector.stopCollection();
      expect(metricsCollector.isCollecting).toBe(false);
      expect(metricsCollector.interval).toBeNull();
    });

    test('не должен запускать повторный сбор если уже запущен', () => {
      metricsCollector.startCollection();
      const firstInterval = metricsCollector.interval;
      
      metricsCollector.startCollection();
      expect(metricsCollector.interval).toBe(firstInterval);
      
      metricsCollector.stopCollection();
    });
  });

  describe('Запись метрик команд', () => {
    test('должен записывать метрики успешной команды', () => {
      const command = 'test-command';
      const duration = 150;
      
      metricsCollector.recordCommand(command, duration, true);
      const metrics = metricsCollector.getCurrentMetrics();
      
      expect(metrics.commands[command]).toBeDefined();
      expect(metrics.commands[command].total).toBe(1);
      expect(metrics.commands[command].successful).toBe(1);
      expect(metrics.commands[command].failed).toBe(0);
      expect(metrics.commands[command].totalDuration).toBe(duration);
      expect(metrics.commands[command].avgDuration).toBe(duration);
      expect(metrics.commands[command].minDuration).toBe(duration);
      expect(metrics.commands[command].maxDuration).toBe(duration);
      expect(metrics.commands[command].lastExecuted).toBeDefined();
    });

    test('должен записывать метрики неуспешной команды', () => {
      const command = 'failed-command';
      const duration = 200;
      const error = new Error('Test error');
      
      metricsCollector.recordCommand(command, duration, false, error);
      const metrics = metricsCollector.getCurrentMetrics();
      
      expect(metrics.commands[command].total).toBe(1);
      expect(metrics.commands[command].successful).toBe(0);
      expect(metrics.commands[command].failed).toBe(1);
      expect(metrics.commands[command].errors).toHaveLength(1);
      expect(metrics.commands[command].errors[0].error).toBe('Test error');
    });

    test('должен обновлять статистику при повторных вызовах', () => {
      const command = 'repeated-command';
      
      metricsCollector.recordCommand(command, 100, true);
      metricsCollector.recordCommand(command, 200, true);
      metricsCollector.recordCommand(command, 150, false);
      
      const metrics = metricsCollector.getCurrentMetrics();
      const cmdMetrics = metrics.commands[command];
      
      expect(cmdMetrics.total).toBe(3);
      expect(cmdMetrics.successful).toBe(2);
      expect(cmdMetrics.failed).toBe(1);
      expect(cmdMetrics.totalDuration).toBe(450);
      expect(cmdMetrics.avgDuration).toBe(150);
      expect(cmdMetrics.minDuration).toBe(100);
      expect(cmdMetrics.maxDuration).toBe(200);
    });

    test('должен ограничивать количество ошибок', () => {
      const command = 'error-command';
      
      // Добавляем больше 100 ошибок
      for (let i = 0; i < 150; i++) {
        metricsCollector.recordCommand(command, 100, false, new Error(`Error ${i}`));
      }
      
      const metrics = metricsCollector.getCurrentMetrics();
      expect(metrics.commands[command].errors).toHaveLength(100);
      expect(metrics.commands[command].errors[0].error).toBe('Error 50');
      expect(metrics.commands[command].errors[99].error).toBe('Error 149');
    });
  });

  describe('Запись ошибок', () => {
    test('должен записывать ошибки', () => {
      const error = new Error('Test error');
      const context = { command: 'test', params: { test: true } };
      
      metricsCollector.recordError(error, context);
      const metrics = metricsCollector.getCurrentMetrics();
      
      expect(metrics.errors['Error']).toBeDefined();
      expect(metrics.errors['Error'].count).toBe(1);
      expect(metrics.errors['Error'].lastOccurrence).toBeDefined();
      expect(metrics.errors['Error'].contexts).toHaveLength(1);
      expect(metrics.errors['Error'].contexts[0].message).toBe('Test error');
      expect(metrics.errors['Error'].contexts[0].context).toEqual(context);
    });

    test('должен группировать ошибки по имени', () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');
      
      metricsCollector.recordError(error1);
      metricsCollector.recordError(error2);
      
      const metrics = metricsCollector.getCurrentMetrics();
      expect(metrics.errors['Error'].count).toBe(2);
    });

    test('должен ограничивать количество контекстов ошибок', () => {
      const error = new Error('Test error');
      
      // Добавляем больше 50 ошибок
      for (let i = 0; i < 60; i++) {
        metricsCollector.recordError(error, { index: i });
      }
      
      const metrics = metricsCollector.getCurrentMetrics();
      expect(metrics.errors['Error'].contexts).toHaveLength(50);
      expect(metrics.errors['Error'].contexts[0].context.index).toBe(10);
      expect(metrics.errors['Error'].contexts[49].context.index).toBe(59);
    });
  });

  describe('Пользовательские метрики', () => {
    test('должен записывать пользовательские метрики', () => {
      const category = 'test-category';
      const name = 'test-metric';
      const value = 42;
      const tags = { tag1: 'value1', tag2: 'value2' };
      
      metricsCollector.recordCustomMetric(category, name, value, tags);
      const metrics = metricsCollector.getCurrentMetrics();
      
      expect(metrics.custom[category]).toBeDefined();
      expect(metrics.custom[category][name]).toBeDefined();
      
      const metric = metrics.custom[category][name];
      expect(metric.values).toHaveLength(1);
      expect(metric.count).toBe(1);
      expect(metric.sum).toBe(value);
      expect(metric.avg).toBe(value);
      expect(metric.min).toBe(value);
      expect(metric.max).toBe(value);
      expect(metric.lastValue).toBe(value);
      expect(metric.tags).toEqual(tags);
    });

    test('должен обновлять статистику пользовательских метрик', () => {
      const category = 'test-category';
      const name = 'test-metric';
      
      metricsCollector.recordCustomMetric(category, name, 10);
      metricsCollector.recordCustomMetric(category, name, 20);
      metricsCollector.recordCustomMetric(category, name, 30);
      
      const metrics = metricsCollector.getCurrentMetrics();
      const metric = metrics.custom[category][name];
      
      expect(metric.count).toBe(3);
      expect(metric.sum).toBe(60);
      expect(metric.avg).toBe(20);
      expect(metric.min).toBe(10);
      expect(metric.max).toBe(30);
      expect(metric.values).toHaveLength(3);
    });

    test('должен ограничивать количество значений', () => {
      const category = 'test-category';
      const name = 'test-metric';
      
      // Добавляем больше 1000 значений
      for (let i = 0; i < 1100; i++) {
        metricsCollector.recordCustomMetric(category, name, i);
      }
      
      const metrics = metricsCollector.getCurrentMetrics();
      const metric = metrics.custom[category][name];
      
      expect(metric.values).toHaveLength(1000);
      expect(metric.values[0].value).toBe(100);
      expect(metric.values[999].value).toBe(1099);
    });
  });

  describe('Сохранение и загрузка метрик', () => {
    test('должен сохранять метрики в файл', async () => {
      await metricsCollector.ensureMetricsDirectory();
      
      // Добавляем тестовые метрики
      metricsCollector.recordCommand('test-command', 100, true);
      metricsCollector.recordError(new Error('Test error'));
      metricsCollector.recordCustomMetric('test', 'metric', 42);
      
      await metricsCollector.saveMetrics();
      
      const files = await fs.readdir(testMetricsDir);
      const metricFiles = files.filter(file => file.startsWith('metrics-') && file.endsWith('.json'));
      
      expect(metricFiles.length).toBeGreaterThan(0);
      
      const latestFile = metricFiles[metricFiles.length - 1];
      const content = await fs.readFile(path.join(testMetricsDir, latestFile), 'utf8');
      const savedMetrics = JSON.parse(content);
      
      expect(savedMetrics.commands['test-command']).toBeDefined();
      expect(savedMetrics.errors['Error']).toBeDefined();
      expect(savedMetrics.custom.test.metric).toBeDefined();
    });

    test('должен загружать метрики за период', async () => {
      await metricsCollector.ensureMetricsDirectory();
      
      // Создаем тестовые файлы метрик
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const testMetrics1 = { system: { test: 'data1' }, timestamp: Date.now() };
      const testMetrics2 = { system: { test: 'data2' }, timestamp: Date.now() };
      
      await fs.writeFile(
        path.join(testMetricsDir, `metrics-${yesterday}.json`),
        JSON.stringify(testMetrics2)
      );
      await fs.writeFile(
        path.join(testMetricsDir, `metrics-${today}.json`),
        JSON.stringify(testMetrics1)
      );
      
      const loadedMetrics = await metricsCollector.getMetrics(yesterday, today);
      expect(loadedMetrics).toHaveLength(2);
      expect(loadedMetrics[0].system.test).toBe('data2'); // Ожидаем отсортированные по дате данные
      expect(loadedMetrics[1].system.test).toBe('data1');
    });
  });

  describe('Экспорт метрик', () => {
    test('должен экспортировать в JSON формат', async () => {
      metricsCollector.recordCommand('test-command', 100, true);
      
      const jsonExport = await metricsCollector.exportMetrics('json');
      const parsed = JSON.parse(jsonExport);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].commands['test-command']).toBeDefined();
    });

    test('должен экспортировать сводку', async () => {
      metricsCollector.recordCommand('test-command', 100, true);
      metricsCollector.recordCommand('test-command', 200, false);
      
      const summary = await metricsCollector.exportMetrics('summary');
      
      expect(summary.totalCommands).toBe(2);
      expect(summary.successfulCommands).toBe(1);
      expect(summary.failedCommands).toBe(1);
    });

    test('должен выбрасывать ошибку для неподдерживаемого формата', async () => {
      await expect(metricsCollector.exportMetrics('unsupported'))
        .rejects.toThrow('Неподдерживаемый формат: unsupported');
    });
  });

  describe('Очистка старых метрик', () => {
    test('должен очищать старые метрики', async () => {
      await metricsCollector.ensureMetricsDirectory();
      
      // Создаем старые файлы метрик
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      
      await fs.writeFile(
        path.join(testMetricsDir, `metrics-${oldDate}.json`),
        JSON.stringify({ old: 'data' })
      );
      await fs.writeFile(
        path.join(testMetricsDir, `metrics-${today}.json`),
        JSON.stringify({ new: 'data' })
      );
      
      const result = await metricsCollector.cleanupOldMetrics();
      
      expect(result.deletedCount).toBe(1);
      
      const files = await fs.readdir(testMetricsDir);
      expect(files).toContain(`metrics-${today}.json`);
      expect(files).not.toContain(`metrics-${oldDate}.json`);
    });
  });

  describe('Интеграционные тесты', () => {
    test('должен корректно работать в полном цикле', async () => {
      await metricsCollector.ensureMetricsDirectory();
      
      // Запускаем сбор метрик
      metricsCollector.startCollection();
      
      // Добавляем тестовые данные
      metricsCollector.recordCommand('integration-test', 150, true);
      metricsCollector.recordError(new Error('Integration error'));
      metricsCollector.recordCustomMetric('integration', 'test', 100);
      
      // Ждем немного для сбора системных метрик
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Останавливаем сбор
      metricsCollector.stopCollection();
      
      // Сохраняем метрики
      await metricsCollector.saveMetrics();
      
      // Проверяем результат
      const metrics = metricsCollector.getCurrentMetrics();
      
      expect(metrics.system.timestamp).toBeDefined();
      expect(metrics.commands['integration-test']).toBeDefined();
      expect(metrics.errors['Error']).toBeDefined();
      expect(metrics.custom.integration.test).toBeDefined();
      
      // Проверяем что файл создан
      const files = await fs.readdir(testMetricsDir);
      const metricFiles = files.filter(file => file.startsWith('metrics-') && file.endsWith('.json'));
      expect(metricFiles.length).toBeGreaterThan(0);
    });
  });
});
