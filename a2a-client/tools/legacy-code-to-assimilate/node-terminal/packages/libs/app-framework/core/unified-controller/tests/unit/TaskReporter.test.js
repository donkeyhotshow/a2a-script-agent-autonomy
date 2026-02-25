import TaskReporter, { recordPluginError, recordApiError, recordComponentError } from '../../src/TaskReporter.js';

// Моки для console.error
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Моки для localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Моки для fetch
global.fetch = jest.fn();

describe('TaskReporter', () => {
  let taskReporter;

  beforeEach(() => {
    jest.clearAllMocks();
    taskReporter = new TaskReporter();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('should initialize with empty reports array and false initialization state', () => {
    expect(taskReporter.reports).toEqual([]);
    expect(taskReporter.isInitialized).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[critical] TaskReporter инициализирован'));
  });

  describe('initialize', () => {
    test('should initialize successfully', async () => {
    await taskReporter.initialize();

      expect(taskReporter.isInitialized).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('TaskReporter инициализирован успешно'));
    });

    test('should not initialize if already initialized', async () => {
      taskReporter.isInitialized = true;

      await taskReporter.initialize();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('TaskReporter уже инициализирован'));
    });

    test('should handle initialization errors', async () => {
      // Мокируем ошибку в loadReports
      const originalLoadReports = taskReporter.loadReports;
      taskReporter.loadReports = jest.fn().mockRejectedValue(new Error('Load reports failed'));

      await expect(taskReporter.initialize()).rejects.toThrow('Load reports failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Критическая ошибка инициализации TaskReporter'));

      taskReporter.loadReports = originalLoadReports;
    });
  });

  describe('loadReports', () => {
    test('should load reports from localStorage in browser environment', async () => {
      const mockReports = [
        { id: '1', type: 'error_report', timestamp: '2023-01-01T00:00:00.000Z' },
        { id: '2', type: 'error_report', timestamp: '2023-01-02T00:00:00.000Z' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockReports));

      await taskReporter.loadReports();

      expect(taskReporter.reports).toEqual(mockReports);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Загружено 2 отчетов из localStorage'));
    });

    test('should handle empty localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      await taskReporter.loadReports();

      expect(taskReporter.reports).toEqual([]);
    });

    test('should handle invalid JSON in localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      await taskReporter.loadReports();

      expect(taskReporter.reports).toEqual([]);
    });
  });

  describe('saveReports', () => {
    test('should save reports to localStorage in browser environment', async () => {
      const mockReports = [
        { id: '1', type: 'error_report', timestamp: '2023-01-01T00:00:00.000Z' }
      ];
      taskReporter.reports = mockReports;

      await taskReporter.saveReports();

      expect(localStorageMock.setItem).toHaveBeenCalledWith('task_reports', JSON.stringify(mockReports));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Сохранено 1 отчетов в localStorage'));
    });

    test('should handle save errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await taskReporter.saveReports();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка сохранения отчетов'));
    });
  });

  describe('createErrorReport', () => {
    test('should create error report successfully', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      const context = { component: 'TestComponent' };

      const report = taskReporter.createErrorReport(error, context);

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^task_\d+_[a-z0-9]+$/);
      expect(report.type).toBe('error_report');
      expect(report.status).toBe('open');
      expect(report.error.message).toBe('Test error');
      expect(report.error.stack).toBe('Error stack trace');
      expect(report.context.component).toBe('TestComponent');
      expect(report.context.url).toBeDefined();
      expect(report.context.userAgent).toBeDefined();
      expect(report.metadata.createdBy).toBe('TaskReporter');
      expect(report.metadata.version).toBe('1.0.0');
      expect(taskReporter.reports).toContain(report);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Отчет об ошибке создан'));
    });

    test('should handle createErrorReport errors gracefully', () => {
      const invalidError = null;

      const report = taskReporter.createErrorReport(invalidError);

      expect(report).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка создания отчета'));
    });
  });

  describe('determinePriority', () => {
    test('should return critical for TypeError', () => {
      const error = new TypeError('Type error');
      const priority = taskReporter.determinePriority(error, {});
      expect(priority).toBe('critical');
    });

    test('should return critical for ReferenceError', () => {
      const error = new ReferenceError('Reference error');
      const priority = taskReporter.determinePriority(error, {});
      expect(priority).toBe('critical');
    });

    test('should return high for network errors', () => {
      const error = new Error('fetch failed');
      const priority = taskReporter.determinePriority(error, {});
      expect(priority).toBe('high');
    });

    test('should return medium for plugin errors', () => {
      const error = new Error('Plugin error');
      const priority = taskReporter.determinePriority(error, { plugin: 'testPlugin' });
      expect(priority).toBe('medium');
    });

    test('should return medium for API errors', () => {
      const error = new Error('API error');
      const priority = taskReporter.determinePriority(error, { api: '/test' });
      expect(priority).toBe('medium');
    });

    test('should return low for other errors', () => {
      const error = new Error('Generic error');
      const priority = taskReporter.determinePriority(error, {});
      expect(priority).toBe('low');
    });
  });

  describe('recordPluginError', () => {
    test('should record plugin error successfully', () => {
      const error = new Error('Plugin error');
      const report = taskReporter.recordPluginError('testPlugin', error, 'test context');

      expect(report).toBeDefined();
      expect(report.context.plugin).toBe('testPlugin');
      expect(report.context.source).toBe('plugin');
      expect(report.context.context).toBe('test context');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Запись ошибки плагина'));
    });

    test('should handle recordPluginError errors gracefully', () => {
      const report = taskReporter.recordPluginError('testPlugin', null);

      expect(report).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка записи ошибки плагина'));
    });
  });

  describe('recordApiError', () => {
    test('should record API error successfully', () => {
      const error = new Error('API error');
      const context = { method: 'POST' };
      const report = taskReporter.recordApiError('/test', error, context);

      expect(report).toBeDefined();
      expect(report.context.api).toBe('/test');
      expect(report.context.source).toBe('api');
      expect(report.context.method).toBe('POST');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Запись ошибки API'));
    });

    test('should handle recordApiError errors gracefully', () => {
      const report = taskReporter.recordApiError('/test', null);

      expect(report).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка записи ошибки API'));
    });
  });

  describe('recordComponentError', () => {
    test('should record component error successfully', () => {
      const error = new Error('Component error');
      const context = { props: { id: 1 } };
      const report = taskReporter.recordComponentError('TestComponent', error, context);

      expect(report).toBeDefined();
      expect(report.context.component).toBe('TestComponent');
      expect(report.context.source).toBe('component');
      expect(report.context.props).toEqual({ id: 1 });
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Запись ошибки компонента'));
    });

    test('should handle recordComponentError errors gracefully', () => {
      const report = taskReporter.recordComponentError('TestComponent', null);

      expect(report).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка записи ошибки компонента'));
    });
  });

  describe('sendReport', () => {
    test('should send report successfully', async () => {
      const mockReport = {
        id: 'test-report-1',
        type: 'error_report',
        timestamp: '2023-01-01T00:00:00.000Z'
      };
      taskReporter.reports = [mockReport];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const result = await taskReporter.sendReport('test-report-1');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/error-management/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockReport)
      });
      expect(mockReport.status).toBe('sent');
      expect(mockReport.sentAt).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Отчет успешно отправлен'));
    });

    test('should handle non-existent report', async () => {
      const result = await taskReporter.sendReport('non-existent');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Отчет не найден'));
    });

    test('should handle send errors', async () => {
      const mockReport = {
        id: 'test-report-1',
        type: 'error_report'
      };
      taskReporter.reports = [mockReport];

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await taskReporter.sendReport('test-report-1');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка отправки отчета'));
    });

    test('should handle HTTP errors', async () => {
      const mockReport = {
        id: 'test-report-1',
        type: 'error_report'
      };
      taskReporter.reports = [mockReport];

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await taskReporter.sendReport('test-report-1');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка отправки отчета'));
    });
  });

  describe('getReports', () => {
    beforeEach(() => {
      taskReporter.reports = [
        {
      id: '1',
      status: 'open',
      priority: 'high',
          timestamp: '2023-01-01T00:00:00.000Z',
          context: { source: 'plugin', plugin: 'testPlugin' }
        },
        {
      id: '2',
      status: 'closed',
      priority: 'low',
          timestamp: '2023-01-02T00:00:00.000Z',
          context: { source: 'api' }
        },
        {
      id: '3',
      status: 'open',
      priority: 'critical',
          timestamp: '2023-01-03T00:00:00.000Z',
          context: { source: 'component' }
        }
      ];
    });

    test('should return all reports without filters', () => {
      const reports = taskReporter.getReports();
      expect(reports).toHaveLength(3);
    });

    test('should filter by status', () => {
      const reports = taskReporter.getReports({ status: 'open' });
      expect(reports).toHaveLength(2);
      expect(reports.every(r => r.status === 'open')).toBe(true);
    });

    test('should filter by priority', () => {
      const reports = taskReporter.getReports({ priority: 'high' });
      expect(reports).toHaveLength(1);
      expect(reports[0].priority).toBe('high');
    });

    test('should filter by source', () => {
      const reports = taskReporter.getReports({ source: 'plugin' });
      expect(reports).toHaveLength(1);
      expect(reports[0].context.source).toBe('plugin');
    });

    test('should filter by plugin', () => {
      const reports = taskReporter.getReports({ plugin: 'testPlugin' });
      expect(reports).toHaveLength(1);
      expect(reports[0].context.plugin).toBe('testPlugin');
    });

    test('should filter by date', () => {
      const reports = taskReporter.getReports({ since: '2023-01-02T00:00:00.000Z' });
      expect(reports).toHaveLength(2);
    });

    test('should sort by timestamp', () => {
      const reports = taskReporter.getReports({ sortBy: 'timestamp' });
      expect(reports[0].timestamp).toBe('2023-01-03T00:00:00.000Z');
      expect(reports[2].timestamp).toBe('2023-01-01T00:00:00.000Z');
    });

    test('should sort by priority', () => {
      const reports = taskReporter.getReports({ sortBy: 'priority' });
      expect(reports[0].priority).toBe('critical');
      expect(reports[1].priority).toBe('high');
      expect(reports[2].priority).toBe('low');
    });

    test('should handle getReports errors gracefully', () => {
      taskReporter.reports = null; // Принудительно вызываем ошибку

      const reports = taskReporter.getReports();
      expect(reports).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка получения отчетов'));
    });
  });

  describe('updateReportStatus', () => {
    beforeEach(() => {
      taskReporter.reports = [
        {
          id: 'test-report-1',
          status: 'open',
          timestamp: '2023-01-01T00:00:00.000Z'
        }
      ];
    });

    test('should update report status successfully', () => {
      const result = taskReporter.updateReportStatus('test-report-1', 'closed', 'Fixed');

      expect(result).toBe(true);
      const report = taskReporter.reports[0];
      expect(report.status).toBe('closed');
      expect(report.notes).toBe('Fixed');
      expect(report.updatedAt).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Статус отчета обновлен'));
    });

    test('should handle non-existent report', () => {
      const result = taskReporter.updateReportStatus('non-existent', 'closed');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Отчет не найден для обновления'));
    });

    test('should handle update errors gracefully', () => {
      taskReporter.reports = null; // Принудительно вызываем ошибку

      const result = taskReporter.updateReportStatus('test-report-1', 'closed');
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка обновления статуса отчета'));
    });
  });

  describe('deleteReport', () => {
    beforeEach(() => {
      taskReporter.reports = [
        {
          id: 'test-report-1',
          status: 'open'
        },
        {
          id: 'test-report-2',
          status: 'closed'
        }
      ];
    });

    test('should delete report successfully', () => {
      const result = taskReporter.deleteReport('test-report-1');

      expect(result).toBe(true);
      expect(taskReporter.reports).toHaveLength(1);
      expect(taskReporter.reports[0].id).toBe('test-report-2');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Отчет удален'));
    });

    test('should handle non-existent report', () => {
      const result = taskReporter.deleteReport('non-existent');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Отчет не найден для удаления'));
    });

    test('should handle delete errors gracefully', () => {
      taskReporter.reports = null; // Принудительно вызываем ошибку

      const result = taskReporter.deleteReport('test-report-1');
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка удаления отчета'));
    });
  });

  describe('cleanupOldReports', () => {
    beforeEach(() => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 дней назад
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 дней назад

      taskReporter.reports = [
        {
          id: 'old-report',
          timestamp: oldDate.toISOString()
        },
        {
          id: 'recent-report',
          timestamp: recentDate.toISOString()
        }
      ];
    });

    test('should cleanup old reports successfully', () => {
      const removedCount = taskReporter.cleanupOldReports(30);

      expect(removedCount).toBe(1);
      expect(taskReporter.reports).toHaveLength(1);
      expect(taskReporter.reports[0].id).toBe('recent-report');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Очистка старых отчетов завершена'));
    });

    test('should handle cleanup errors gracefully', () => {
      taskReporter.reports = null; // Принудительно вызываем ошибку

      const removedCount = taskReporter.cleanupOldReports(30);
      expect(removedCount).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка очистки старых отчетов'));
    });
  });

  describe('getReportStats', () => {
    beforeEach(() => {
      taskReporter.reports = [
        {
      id: '1',
      status: 'open',
      priority: 'high',
          timestamp: '2023-01-01T00:00:00.000Z',
          context: { source: 'plugin', plugin: 'testPlugin' }
        },
        {
      id: '2',
      status: 'closed',
      priority: 'low',
          timestamp: '2023-01-02T00:00:00.000Z',
          context: { source: 'api' }
        },
        {
      id: '3',
      status: 'open',
      priority: 'critical',
          timestamp: new Date().toISOString(), // Сегодня
          context: { source: 'component' }
        }
      ];
    });

    test('should return correct statistics', () => {
      const stats = taskReporter.getReportStats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.open).toBe(2);
      expect(stats.byStatus.closed).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.byPriority.critical).toBe(1);
      expect(stats.bySource.plugin).toBe(1);
      expect(stats.bySource.api).toBe(1);
      expect(stats.bySource.component).toBe(1);
      expect(stats.byPlugin.testPlugin).toBe(1);
      expect(stats.recent).toBe(1); // Только один отчет за последнюю неделю
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Статистика отчетов получена'));
    });

    test('should handle getReportStats errors gracefully', () => {
      taskReporter.reports = null; // Принудительно вызываем ошибку

      const stats = taskReporter.getReportStats();
      expect(stats.total).toBe(0);
      expect(stats.byStatus).toEqual({});
      expect(stats.byPriority).toEqual({});
      expect(stats.bySource).toEqual({});
      expect(stats.byPlugin).toEqual({});
      expect(stats.recent).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка получения статистики отчетов'));
    });
  });

  describe('Global functions', () => {
    test('recordPluginError should work as global function', () => {
      const error = new Error('Plugin error');
      const report = recordPluginError('testPlugin', error, 'test context');

      expect(report).toBeDefined();
      expect(report.context.plugin).toBe('testPlugin');
    });

    test('recordApiError should work as global function', () => {
      const error = new Error('API error');
      const report = recordApiError('/test', error, { method: 'POST' });

      expect(report).toBeDefined();
      expect(report.context.api).toBe('/test');
    });

    test('recordComponentError should work as global function', () => {
      const error = new Error('Component error');
      const report = recordComponentError('TestComponent', error, { props: { id: 1 } });

      expect(report).toBeDefined();
      expect(report.context.component).toBe('TestComponent');
    });
  });
});