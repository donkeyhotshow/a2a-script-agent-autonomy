/**
 * Test Setup for Service Management
 * Настройка тестового окружения согласно принципам когнитивной дисциплины
 */

// Глобальные моки для стабильности тестов
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Заменяем console на мок для предсказуемости
global.console = mockConsole;

// Моки для внешних зависимостей - создаем их как функции, а не импорты
const createMockLoggingUtils = () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
});

const createMockErrorHandlingUtils = () => ({
  logError: jest.fn(),
  maxRetries: 3,
  handleStartupFailure: jest.fn().mockResolvedValue(true)
});

const createMockConfigurationUtils = () => ({
  startWatchingConfig: jest.fn(),
  stopWatchingConfig: jest.fn(),
  loadServicesConfig: jest.fn()
});

const createMockProcessManagementUtils = () => ({
  start: jest.fn(),
  kill: jest.fn(),
  checkProcessRunning: jest.fn(),
  getServicePort: jest.fn(),
  extractCandidatePorts: jest.fn()
});

const createMockMonitoringUtils = () => ({
  detectRunningPids: jest.fn(),
  checkPortListening: jest.fn(),
  checkUrl: jest.fn()
});

const createMockFileSystemUtils = () => ({
  fileExists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  exists: jest.fn(),
  join: jest.fn()
});

const createMockSharedUtils = () => ({
  someMethod: jest.fn()
});

// Экспортируем моки для использования в тестах
global.mockUtils = {
  createMockLoggingUtils,
  createMockErrorHandlingUtils,
  createMockConfigurationUtils,
  createMockProcessManagementUtils,
  createMockMonitoringUtils,
  createMockFileSystemUtils,
  createMockSharedUtils
};

// Глобальные настройки для тестов
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllTimers();
});

// Увеличиваем таймаут для интеграционных тестов
jest.setTimeout(30000);
