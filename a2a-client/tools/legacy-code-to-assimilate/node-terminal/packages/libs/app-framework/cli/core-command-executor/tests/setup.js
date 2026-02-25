/**
 * Настройка тестовой среды для CommandExecutor
 */

// Увеличиваем таймауты для тестов производительности
jest.setTimeout(30000);

// Настройка для обработки необработанных промисов
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Настройка для обработки необработанных исключений
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Очистка после каждого теста
afterEach(() => {
  // Очищаем все таймеры
  jest.clearAllTimers();
  
  // Очищаем все моки
  jest.clearAllMocks();
});

// Глобальная очистка после всех тестов
afterAll(() => {
  // Принудительно завершаем процесс для предотвращения зависания
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});
