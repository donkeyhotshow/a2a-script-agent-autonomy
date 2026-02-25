/**
 * Настройка тестового окружения для модуля отчетов
 */

// Глобальные настройки для тестов
global.testTimeout = 10000;

// Мок для console.error чтобы не засорять вывод тестов
const originalConsoleError = console.error;
console.error = jest.fn();

// Восстанавливаем console.error после каждого теста
afterEach(() => {
  console.error.mockClear();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Настройка временных директорий
process.env.TEST_TEMP_DIR = require('os').tmpdir();

// Очистка временных файлов после тестов
afterAll(async () => {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const testDirs = [
      path.join(__dirname, 'test-reports'),
      path.join(__dirname, 'test-templates')
    ];
    
    for (const dir of testDirs) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  } catch (error) {
    // Игнорируем ошибки очистки
  }
});
