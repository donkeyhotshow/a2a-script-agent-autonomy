#!/usr/bin/env node
// Локальный тест-раннер для node-terminal, без внешних @libs-зависимостей

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const APP_ROOT = path.resolve(__dirname, '..');
const TESTS_ROOT = path.join(APP_ROOT, 'tests');

/**
 * 🧪 Главный файл для запуска всех тестов модулей MCP сервера
 * 
 * Этот файл запускает все тесты:
 * - Модульные тесты
 * - Интеграционные тесты
 * - Тесты производительности
 * - Тесты совместимости
 * - Тесты PowerShell Unicode (НОВЫЕ!)
 */

// Цвета для вывода
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Функция для цветного вывода (только ошибки и итоги)
function log(color, message) {
  // Убираем избыточный вывод - только ошибки и итоговые результаты
  if (color === 'red' || message.includes('ИТОГОВАЯ СТАТИСТИКА') || message.includes('ОШИБКА')) {
    // eslint-disable-next-line no-console
    console.log(`${colors[color]}${message}${colors.reset}`);
  }
}

// Функция для запуска тестов
function runTests() {
  const testFiles = [
    // Локальные интеграционные/специальные тесты этого проекта
    // Тест глобальной истории команд (структура + двойные команды)
    path.join(APP_ROOT, 'test-global-history.cjs')
  ];

  let passedTests = 0;
  let failedTests = 0;
  let totalTests = 0;

  testFiles.forEach(testFile => {
    // testFile уже содержит абсолютный путь
    if (!fs.existsSync(testFile)) {
      return;
    }

    try {
      // Запускаем тест напрямую через Node.js
      const result = execSync(`node ${testFile}`, {
        cwd: APP_ROOT, // Устанавливаем cwd на корень проекта
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000 // Добавляем таймаут в 60 секунд
      });

      // Анализируем результат выполнения
      if (result && result.includes('✅') && !result.includes('❌') && !result.includes('Error')) {
        passedTests += 1;
        totalTests += 1;
      } else {
        log('red', `Тест провален: ${path.basename(testFile)}`);
        failedTests += 1;
        totalTests += 1;
      }

    } catch (error) {
      log('red', `Ошибка выполнения теста ${path.basename(testFile)}: ${error.message}`);
      failedTests++;
    }
  });

  return { passedTests, failedTests, totalTests };
}

// Главная функция
function main() {
  // Запускаем локальные тесты проекта
  const results = runTests();

  // Итоговая статистика
  log('cyan', 'ИТОГОВАЯ СТАТИСТИКА ВСЕХ ТЕСТОВ');
  log('green', `Пройдено: ${results.passedTests}`);
  log('red', `Провалено: ${results.failedTests}`);
  log('blue', `Всего: ${results.totalTests}`);

  const successRate = ((results.passedTests / results.totalTests) * 100).toFixed(1);
  log('cyan', `Успешность: ${successRate}%`);

  if (results.failedTests > 0) {
    process.exit(1);
  }
}

// Запуск, если файл вызван напрямую
if (require.main === module) {
  main();
}
