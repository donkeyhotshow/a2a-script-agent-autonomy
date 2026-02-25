const { ErrorReportManager } = require('../index.js');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('ErrorReportManager', () => {
  let manager;
  let tempDir;

  beforeEach(async () => {
    // Создаем временную директорию для тестов
    tempDir = path.join(os.tmpdir(), 'error-reports-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    manager = new ErrorReportManager({
      projectRoot: tempDir,
      reportsDir: path.join(tempDir, 'reports'),
      maxReports: 5
    });
  });

  afterEach(async () => {
    // Очищаем временную директорию
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultManager = new ErrorReportManager();
      expect(defaultManager.projectRoot).toBe(process.cwd());
      expect(defaultManager.maxReports).toBe(100);
      expect(defaultManager.archiveOldReports).toBe(true);
    });

    test('should initialize with custom options', () => {
      const customManager = new ErrorReportManager({
        projectRoot: '/custom/path',
        maxReports: 10,
        archiveOldReports: false
      });
      expect(customManager.projectRoot).toBe('/custom/path');
      expect(customManager.maxReports).toBe(10);
      expect(customManager.archiveOldReports).toBe(false);
    });
  });

  describe('createErrorReport', () => {
    test('should create error report successfully', async () => {
      const testError = new Error('Test error message');
      const context = { userId: '123', action: 'test' };

      const result = await manager.createErrorReport(testError, context);

      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
      expect(result.filePath).toBeDefined();

      // Проверяем, что файл создан
      const fileExists = await fs.access(result.filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    test('should handle missing context', async () => {
      const testError = new Error('Test error without context');

      const result = await manager.createErrorReport(testError);

      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
    });

    test('should handle file system errors', async () => {
      // Создаем менеджер с недоступной директорией
      const badManager = new ErrorReportManager({
        reportsDir: '/nonexistent/path/that/does/not/exist'
      });

      const testError = new Error('Test error');
      const result = await badManager.createErrorReport(testError);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getReportsList', () => {
    test('should return empty list when no reports exist', async () => {
      const result = await manager.getReportsList();
      expect(result.success).toBe(true);
      expect(result.reports).toEqual([]);
    });

    test('should return list of reports', async () => {
      // Создаем несколько отчетов
      await manager.createErrorReport(new Error('Error 1'), { id: 1 });
      await manager.createErrorReport(new Error('Error 2'), { id: 2 });

      const result = await manager.getReportsList();
      expect(result.success).toBe(true);
      expect(result.reports.length).toBe(2);
      expect(result.reports[0].errorMessage).toBe('Error 2'); // Новые первыми
      expect(result.reports[1].errorMessage).toBe('Error 1');
    });

    test('should handle corrupted report files', async () => {
      // Создаем корректный отчет
      const result1 = await manager.createErrorReport(new Error('Valid error'));
      expect(result1.success).toBe(true);

      // Создаем поврежденный файл
      const corruptedFile = path.join(manager.reportsDir, 'corrupted.json');
      await fs.writeFile(corruptedFile, 'invalid json content', 'utf8');

      const result = await manager.getReportsList();
      expect(result.success).toBe(true);
      expect(result.reports.length).toBe(1); // Только валидный отчет
    });
  });

  describe('getReport', () => {
    test('should retrieve existing report', async () => {
      const testError = new Error('Test error for retrieval');
      const context = { test: 'context' };

      const createResult = await manager.createErrorReport(testError, context);
      expect(createResult.success).toBe(true);

      const reportId = createResult.reportId;
      const getResult = await manager.getReport(reportId);

      expect(getResult.success).toBe(true);
      expect(getResult.report.error.message).toBe('Test error for retrieval');
      expect(getResult.report.context).toEqual(context);
    });

    test('should return error for non-existent report', async () => {
      const result = await manager.getReport('non-existent-id');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Report not found');
    });
  });

  describe('deleteReport', () => {
    test('should delete existing report', async () => {
      const testError = new Error('Test error for deletion');

      const createResult = await manager.createErrorReport(testError);
      expect(createResult.success).toBe(true);

      const reportId = createResult.reportId;

      // Проверяем, что отчет существует
      const getResult1 = await manager.getReport(reportId);
      expect(getResult1.success).toBe(true);

      // Удаляем отчет
      const deleteResult = await manager.deleteReport(reportId);
      expect(deleteResult.success).toBe(true);

      // Проверяем, что отчет больше не существует
      const getResult2 = await manager.getReport(reportId);
      expect(getResult2.success).toBe(false);
    });

    test('should return error for non-existent report', async () => {
      const result = await manager.deleteReport('non-existent-id');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Report not found');
    });
  });

  describe('cleanupOldReports', () => {
    test('should not cleanup when under limit', async () => {
      // Создаем менеджер с лимитом 3
      const smallManager = new ErrorReportManager({
        reportsDir: path.join(tempDir, 'cleanup-test'),
        maxReports: 3
      });

      // Создаем 2 отчета (меньше лимита)
      await smallManager.createErrorReport(new Error('Error 1'));
      await smallManager.createErrorReport(new Error('Error 2'));

      const result = await smallManager.cleanupOldReports();
      expect(result.success).toBe(true);
      expect(result.message).toBe('No cleanup needed');
    });

    test('should cleanup old reports when over limit', async () => {
      // Создаем менеджер с лимитом 2
      const smallManager = new ErrorReportManager({
        reportsDir: path.join(tempDir, 'cleanup-test2'),
        maxReports: 2
      });

      // Создаем 3 отчета (больше лимита)
      await smallManager.createErrorReport(new Error('Error 1'));
      await smallManager.createErrorReport(new Error('Error 2'));
      await smallManager.createErrorReport(new Error('Error 3'));

      const result = await smallManager.cleanupOldReports();
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(1); // Должен удалить 1 старый отчет

      // Проверяем, что осталось только 2 отчета
      const listResult = await smallManager.getReportsList();
      expect(listResult.success).toBe(true);
      expect(listResult.reports.length).toBe(2);
    });
  });

  describe('error handling', () => {
    test('should handle file system errors gracefully', async () => {
      // Создаем менеджер с директорией без прав доступа
      const readonlyManager = new ErrorReportManager({
        reportsDir: '/root/protected' // Обычно недоступная директория
      });

      const testError = new Error('Test error');
      const result = await readonlyManager.createErrorReport(testError);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
