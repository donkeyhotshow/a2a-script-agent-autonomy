#!/usr/bin/env node
// Локальный раннер unit-тестов для node-terminal без внешних @libs-зависимостей

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const APP_ROOT = path.resolve(__dirname, '..');
const TESTS_ROOT = path.join(APP_ROOT, 'tests');

/**
 * 🧪 Главный файл для запуска всех UNIT тестов модулей MCP сервера
 *
 * Этот файл запускает все unit тесты:
 * - Тесты handlers (terminal, file, search, atomic, archive, feedback, test, tools-list)
 * - Тесты core модулей (config, ArchiveOperations, AtomicOperations)
 * - Тесты domain модулей (command-executor, security-analyzer)
 * - Тесты существующих модулей (command-validation, path-validation, etc.)
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
  if (color === 'red' || message.includes('ИТОГОВАЯ СТАТИСТИКА') || message.includes('ОШИБКА') ||
      message.includes('ЗАВЕРШЕНО') || message.includes('ПРОЙДЕНО')) {
    // eslint-disable-next-line no-console
    console.log(`${colors[color]}${message}${colors.reset}`);
  }
}

// Функция для проверки существования файлов
function checkTestFiles() {
  // Динамический список unit‑тестов: берём все *.test.cjs из tests/unit
  // Это даёт "честную" картину: запускаем только реально существующие тесты.
  let testFiles = [];
  const unitDir = path.join(TESTS_ROOT, 'unit');

  if (fs.existsSync(unitDir)) {
    testFiles = fs.readdirSync(unitDir)
      .filter((file) => file.endsWith('.test.cjs'))
      .sort();
  }

  log('cyan', '🔍 Проверка существования unit тестов...');

  let allFilesExist = true;
  const existingFiles = [];

  testFiles.forEach(file => {
    const filePath = path.join(TESTS_ROOT, 'unit', file);
    if (fs.existsSync(filePath)) {
      existingFiles.push(file);
      log('green', `✅ ${file}`);
    } else {
      log('yellow', `⚠️  ${file} - НЕ НАЙДЕН`);
    }
  });

  return existingFiles;
}

// Функция для запуска тестов
function runUnitTests(testFiles) {
  log('cyan', '\n🚀 Запуск всех UNIT тестов...\n');

  let passedTests = 0;
  let failedTests = 0;
  let totalTests = 0;

  testFiles.forEach(testFile => {
    const filePath = path.join(TESTS_ROOT, 'unit', testFile);

    log('blue', `\n🧪 Запуск unit теста: ${testFile}`);
    log('cyan', '─'.repeat(50));

    try {
      // Запускаем тест через node, предзагружая локальный setup-module-alias
      const result = execSync(`node -r ./setup-module-alias.cjs ${filePath}`, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 30000 // 30 секунд на тест
      });

      log('green', `✅ ${testFile} - ВСЕ ТЕСТЫ ПРОЙДЕНЫ`);

      // Простая оценка на основе отсутствия ошибок в выводе
      if (!result.includes('❌') && !result.includes('Error') && !result.includes('error')) {
        passedTests++;
      } else {
        failedTests++;
      }

      totalTests++;

    } catch (error) {
      log('red', `❌ ${testFile} - ОШИБКА ВЫПОЛНЕНИЯ`);
      log('red', `   ${error.message}`);
      failedTests++;
      totalTests++;
    }
  });

  return { passedTests, failedTests, totalTests };
}

// Функция для запуска интеграционных тестов через Jest
function runIntegrationTests() {
  log('cyan', '\n🔗 ЗАПУСК ИНТЕГРАЦИОННЫХ ТЕСТОВ...\n');

  try {
    // Запускаем интеграционные тесты через npm скрипт
    const result = execSync('npm run test:integration', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'inherit',
      timeout: 120000 // 2 минуты на интеграционные тесты
    });

    log('green', '✅ Интеграционные тесты завершены');

  } catch (error) {
    log('red', '❌ Ошибка выполнения интеграционных тестов');
    log('red', `   ${error.message}`);
  }
}

// Главная функция
function main() {
  log('bright', '🧪 MCP SERVER - ПОЛНОЕ ТЕСТИРОВАНИЕ UNIT ТЕСТОВ');
  log('cyan', '═'.repeat(60));

  // Проверяем файлы
  const testFiles = checkTestFiles();

  if (testFiles.length === 0) {
    log('yellow', '\n⚠️  В каталоге tests/unit/ пока нет unit-тестов. Пропуск запуска unit-тестов.');
    return;
  }

  log('green', `\n✅ Найдено ${testFiles.length} unit тестов`);

  // Запускаем unit тесты
  const unitResults = runUnitTests(testFiles);

  // Запускаем интеграционные тесты
  runIntegrationTests();

  // Итоговая статистика
  log('cyan', '\n📊 ИТОГОВАЯ СТАТИСТИКА UNIT ТЕСТИРОВАНИЯ');
  log('cyan', '═'.repeat(60));
  log('green', `✅ Пройдено: ${unitResults.passedTests}`);
  log('red', `❌ Провалено: ${unitResults.failedTests}`);
  log('blue', `📋 Всего: ${unitResults.totalTests}`);

  const successRate = unitResults.totalTests > 0 ?
    ((unitResults.passedTests / unitResults.totalTests) * 100).toFixed(1) : 0;

  if (successRate >= 90) {
    log('green', `🏆 Успешность: ${successRate}% - ОТЛИЧНО!`);
  } else if (successRate >= 80) {
    log('yellow', `🎯 Успешность: ${successRate}% - ХОРОШО`);
  } else if (successRate >= 70) {
    log('yellow', `⚠️  Успешность: ${successRate}% - ТРЕБУЕТ ВНИМАНИЯ`);
  } else {
    log('red', `💥 Успешность: ${successRate}% - КРИТИЧЕСКИЙ УРОВЕНЬ`);
  }

  // Детальная информация о покрытии
  log('cyan', '\n📋 ПОКРЫТИЕ UNIT ТЕСТАМИ');
  log('cyan', '─'.repeat(40));

  const coverage = {
    'Handlers': testFiles.filter(f => f.includes('handler')).length,
    'Core modules': testFiles.filter(f => f.includes('core-')).length,
    'Domain modules': testFiles.filter(f => f.includes('domain-')).length,
    'Existing modules': testFiles.filter(f => !f.includes('handler') && !f.includes('core-') && !f.includes('domain-')).length
  };

  Object.entries(coverage).forEach(([category, count]) => {
    log('blue', `${category}: ${count} тестов`);
  });

  log('cyan', '\n🎉 Unit тестирование завершено!');

  if (unitResults.failedTests > 0) {
    log('yellow', `\n💡 Рекомендации:`);
    log('yellow', `   1. Проверьте логи ошибок выше`);
    log('yellow', `   2. Убедитесь что все зависимости установлены`);
    log('yellow', `   3. Проверьте корректность путей в тестах`);
    log('yellow', `   4. Запустите тесты по отдельности для детальной диагностики`);
    process.exit(1);
  }
}

// Запуск, если файл вызван напрямую
if (require.main === module) {
  main();
}
