describe('System Index', () => {
  test('should export all system modules', () => {
    const systemModules = require('../index');
    // Проверяем, что экспортируемые модули не пусты
    expect(Object.keys(systemModules).length).toBeGreaterThan(0);
    // Можем добавить более специфичные проверки, если знаем конкретные экспорты
    // например, expect(systemModules.ProcessSpawner).toBeDefined();
  });
});
