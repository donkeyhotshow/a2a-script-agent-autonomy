/**
 * @fileoverview Настройка тестов для core-security-analyzer
 * @author MCP Terminal Team
 * @version 2.0.0
 */

// Глобальные настройки для тестов
beforeAll(() => {
  // Отключаем логи в тестах
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Мок для process.platform
Object.defineProperty(process, 'platform', {
  value: 'win32',
  writable: true
});
