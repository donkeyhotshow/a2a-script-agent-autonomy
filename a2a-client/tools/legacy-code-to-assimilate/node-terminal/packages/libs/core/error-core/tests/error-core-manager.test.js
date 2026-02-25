const { ErrorCoreManager } = require('../index');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');

// Мокируем fs.promises для предотвращения реальных операций с файловой системой
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(() => Promise.resolve()),
    writeFile: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() => Promise.resolve('{}')), // По умолчанию возвращаем пустой объект JSON
    unlink: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('os', () => ({
  hostname: jest.fn(() => 'mocked-hostname'),
}));

// Мокируем FileOperations
jest.mock('C:/apps/libs/system/file-operations/src/file-operations.cjs', () => {
  return jest.fn().mockImplementation(() => {
    return {
      // Мокируем только те методы, которые используются LoggingUtils
      ensureDir: jest.fn(() => Promise.resolve()),
      deleteFile: jest.fn(() => Promise.resolve()), // Для cleanupOldTasks
      moveFile: jest.fn(() => Promise.resolve()),
      existsSync: jest.fn(() => true), // Предполагаем, что файлы существуют для тестов
      mkdirSync: jest.fn(),
      accessSync: jest.fn(),
      statSync: jest.fn(() => ({ size: 0 })), // Возвращаем фиктивный размер файла
      createWriteStream: jest.fn(() => ({ on: jest.fn(), write: jest.fn(), end: jest.fn() }))
    };
  });
});

// Мокируем LoggingUtils
const MockLoggingUtils = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

let manager; // Объявляем manager на уровне модуля
let mockReportsDir; // Объявляем mockReportsDir на уровне модуля

describe('ErrorCoreManager', () => {
  beforeEach(() => {
    mockReportsDir = path.resolve('./reports/errors-test');
    manager = new ErrorCoreManager({
      reportsDir: mockReportsDir,
      logger: MockLoggingUtils,
      maxErrorsPerPattern: 2, // Для тестирования rate limiting
      errorCooldown: 100 // Короткий кулдаун для тестов
    });
    // Сброс моков перед каждым тестом
    jest.clearAllMocks();
  });

  // Тесты для инициализации
  test('should initialize correctly and create reports directory', async () => {
    await manager.initialize();
    expect(fs.mkdir).toHaveBeenCalledWith(mockReportsDir, { recursive: true });
    expect(MockLoggingUtils.info).toHaveBeenCalledWith(expect.stringContaining('[ErrorCoreManager] Initialized.'));
    expect(manager.cleanupTimer).not.toBeNull();
  });

  // Тесты для collectError
  test('should collect an error and write a report file', async () => {
    const error = new Error('Test Error');
    const appId = 'test-app';
    const collected = await manager.collectError({ appId, error });

    expect(fs.writeFile).toHaveBeenCalledTimes(1);
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(path.join(mockReportsDir, '')),
      expect.any(String),
      'utf8'
    );
    expect(MockLoggingUtils.error).toHaveBeenCalledWith(expect.stringContaining('[ErrorCoreManager] Collected error'));
    expect(collected).not.toBeNull();
    expect(Object.keys(manager.errorTasks).length).toBeGreaterThan(0);
  });

  test('should rate limit errors based on maxErrorsPerPattern and errorCooldown', async () => {
    const error = new Error('Rate Limit Test Error');
    const appId = 'test-app-rate-limit';

    // Первый сбор (разрешен)
    await manager.collectError({ appId, error });
    // Второй сбор (разрешен)
    await manager.collectError({ appId, error });
    // Третий сбор (должен быть ограничен)
    const collectedRateLimited = await manager.collectError({ appId, error });

    expect(MockLoggingUtils.warn).toHaveBeenCalledWith(expect.stringContaining('[ErrorCoreManager] Rate limited error'));
    expect(collectedRateLimited).toBeNull();
    expect(fs.writeFile).toHaveBeenCalledTimes(2); // Только 2 записи, третья ограничена
  });

  test('should update existing error task on subsequent collections', async () => {
    const error = new Error('Update Test Error');
    const appId = 'test-app-update';

    await manager.collectError({ appId, error, severity: 'low' });
    const initialTaskId = Object.keys(manager.errorTasks)[0];
    const initialTimestamp = manager.errorTasks[initialTaskId].lastOccurred;

    // Дождемся окончания кулдауна, чтобы прошел rate limit
    await new Promise(resolve => setTimeout(resolve, 150));
    
    await manager.collectError({ appId, error, severity: 'high' });
    
    expect(manager.errorTasks[initialTaskId].count).toBe(2);
    expect(manager.errorTasks[initialTaskId].severity).toBe('high');
    expect(manager.errorTasks[initialTaskId].lastOccurred).not.toBe(initialTimestamp);
  });

  // Тесты для getErrorStats
  test('should return correct error statistics', async () => {
    await manager.collectError({ appId: 'app1', error: new Error('Err1'), severity: 'low' });
    await manager.collectError({ appId: 'app1', error: new Error('Err2'), severity: 'medium' });
    await manager.collectError({ appId: 'app2', error: new Error('Err3'), severity: 'high' });

    const stats = manager.getErrorStats();

    expect(stats.totalErrors).toBe(3);
    expect(stats.bySeverity).toEqual({ low: 1, medium: 1, high: 1 });
    expect(stats.byAppId).toEqual({ app1: 2, app2: 1 });
    expect(stats.byCode).toEqual({ UNKNOWN_ERROR: 3 });
  });

  // Тесты для getOpenTasks
  test('should return only open error tasks', async () => {
    await manager.collectError({ appId: 'app1', error: new Error('Err1') });
    const taskId = Object.keys(manager.errorTasks)[0];
    manager.errorTasks[taskId].status = 'closed';
    await manager.collectError({ appId: 'app2', error: new Error('Err2') });

    const openTasks = manager.getOpenTasks();
    expect(openTasks.length).toBe(1);
    expect(openTasks[0].appId).toBe('app2');
  });

  // Тесты для cleanupOldTasks
  test('should clean up old error tasks and delete report files', async () => {
    jest.useFakeTimers();

    await manager.collectError({ appId: 'app1', error: new Error('Old Err') });
    const taskId = Object.keys(manager.errorTasks)[0];
    manager.errorTasks[taskId].lastOccurred = new Date(Date.now() - manager.options.maxTaskAge - 1000).toISOString();

    await manager.collectError({ appId: 'app2', error: new Error('New Err') });

    const initialTaskCount = Object.keys(manager.errorTasks).length;
    expect(initialTaskCount).toBe(2);
    
    await manager.cleanupOldTasks();

    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining(taskId));
    expect(Object.keys(manager.errorTasks).length).toBe(1);
    expect(manager.errorTasks).not.toHaveProperty(taskId);

    jest.useRealTimers();
  });

  // Тесты для resetErrorCounts
  test('should reset error counts and tasks', async () => {
    await manager.collectError({ appId: 'app1', error: new Error('Err1') });
    expect(Object.keys(manager.errorTasks).length).toBe(1);

    manager.resetErrorCounts();
    expect(Object.keys(manager.errorTasks).length).toBe(0);
    expect(Object.keys(manager.errorCounts).length).toBe(0);
    expect(MockLoggingUtils.info).toHaveBeenCalledWith(expect.stringContaining('[ErrorCoreManager] Error counts and tasks reset.'));
  });

  // Тесты для analyzeError
  test('should analyze error and return a recipe based on pattern', () => {
    const error = new Error('Рабочая папка проекта не установлена');
    const analysis = manager.analyzeError(error);
    expect(analysis.pattern).toBe('workspace_not_set');
    expect(analysis.recipe).not.toBeNull();
    expect(analysis.recipe.priority).toBe(1);
  });

  test('should return unknown recipe for unhandled errors', () => {
    const error = new Error('Some random error message');
    const analysis = manager.analyzeError(error);
    expect(analysis.pattern).toBe('unknown');
    expect(analysis.recipe.priority).toBe(10);
  });

  // Тесты для getRecipe
  test('should return a specific recipe by name', () => {
    const recipe = manager.getRecipe('security_block');
    expect(recipe).not.toBeNull();
    expect(recipe.description).toBe('Команда заблокирована системой безопасности');
  });

  // Тесты для getAllRecipes
  test('should return all recipes sorted by priority', () => {
    const allRecipes = manager.getAllRecipes();
    expect(allRecipes.length).toBeGreaterThan(0);
    expect(allRecipes[0].priority).toBe(1); // workspace_not_set
    expect(allRecipes[allRecipes.length - 1].priority).toBe(10); // unknown
  });

  // Тесты для addRecipe
  test('should add a new recipe', () => {
    const newRecipe = { priority: 9, description: 'New test recipe', solutions: [] };
    manager.addRecipe('new_test_recipe', newRecipe);
    expect(manager.getRecipe('new_test_recipe')).toEqual(newRecipe);
  });

  // Тесты для addPattern
  test('should add a new error pattern', () => {
    const newPattern = /New test pattern/;
    manager.addPattern('new_test_pattern', newPattern);
    expect(manager.errorPatterns.new_test_pattern).toEqual(newPattern);
  });

  // Тесты для generateErrorReport
  test('should generate a comprehensive error report', () => {
    const error = new Error('Type: Timeout: Operation timed out'); // Уточняем сообщение для паттерна
    const report = manager.generateErrorReport(error);

    expect(report.timestamp).toBeDefined();
    expect(report.error).toBe(error.message);
    expect(report.pattern).toBe('timeout');
    expect(report.recipe).toBeDefined();
    expect(report.suggestions).toContain('increase_timeout');
  });

  // Тесты для handleError (интеграция)
  test('should handle an error, collect it, and analyze it', async () => {
    const error = new Error('Type: Permission denied'); // Уточняем сообщение для паттерна
    const appId = 'integrated-app';

    // Вызываем handleError, который должен использовать collectError и analyzeError
    const result = await manager.handleError(error, { appId });

    expect(result).toBeDefined();
    expect(result.collectedError).not.toBeNull();
    expect(result.analyzedError).toBeDefined();
    expect(result.analyzedError.pattern).toBe('permission_denied');
    expect(MockLoggingUtils.error).toHaveBeenCalledWith(expect.stringContaining('[ErrorCoreManager] Handled error'));
  });
});

afterEach(() => {
  if (manager.cleanupTimer) {
    clearInterval(manager.cleanupTimer);
  }
});
