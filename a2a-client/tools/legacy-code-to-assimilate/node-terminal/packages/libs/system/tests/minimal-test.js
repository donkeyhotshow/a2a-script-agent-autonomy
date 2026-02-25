// Минимальный тест для проверки Jest
describe('Minimal System Test', () => {
  test('should run basic test', () => {
    expect(1 + 1).toBe(2);
    console.log('✅ Basic test passed');
  });

  test('should check file exists', () => {
    const fs = require('fs');
    const path = require('path');

    const indexPath = path.join(__dirname, '../index.js');
    expect(fs.existsSync(indexPath)).toBe(true);
    console.log('✅ File exists test passed');
  });
});
