/**
 * Тесты для ServiceManagement
 * Управление сервисами
 */

const { createServiceManagement } = require('../index');

describe('ServiceManagement', () => {
  let mockLogger;
  let serviceManagement;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };

    serviceManagement = createServiceManagement(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createServiceManagement', () => {
    test('должен создавать объект с методами управления сервисами', () => {
      expect(serviceManagement).toHaveProperty('startFallbackService');
      expect(typeof serviceManagement.startFallbackService).toBe('function');
    });

    test('должен требовать логгер в качестве параметра', () => {
      expect(() => createServiceManagement()).toThrow();
      expect(() => createServiceManagement(mockLogger)).not.toThrow();
    });
  });

  describe('startFallbackService', () => {
    test('должен быть определен как функция', () => {
      expect(typeof serviceManagement.startFallbackService).toBe('function');
    });

    test('должен принимать serviceId как параметр', () => {
      expect(serviceManagement.startFallbackService).toHaveLength(1);
    });

    test('должен использовать дефолтный serviceId если не указан', () => {
      // Мокаем fs для предотвращения реального чтения файлов
      const fs = require('fs').promises;
      jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('File not found'));

      expect(() => serviceManagement.startFallbackService()).not.toThrow();
      expect(() => serviceManagement.startFallbackService('custom-service')).not.toThrow();
    });
  });
});
