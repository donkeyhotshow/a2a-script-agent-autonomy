// Общая настройка для тестов
beforeAll(() => {
  // Здесь можно добавить глобальные настройки для всех тестов
  jest.setTimeout(10000); // Увеличиваем timeout для тестов
});

afterAll(() => {
  // Очистка после всех тестов
});

// Отключаем вывод console.log в тестах, если не указан --verbose
if (!process.env.JEST_VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}
