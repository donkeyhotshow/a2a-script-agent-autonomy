/**
 * Пример использования библиотеки workdir-utils
 */

const workdirUtils = require('./index.js');

async function demonstrateWorkdirUtils() {
  console.log('=== Демонстрация workdir-utils ===\n');

  // 1. Получение текущей директории
  console.log('1. Текущая директория:');
  const currentDir = await workdirUtils.getCurrentDir();
  console.log(`   ${currentDir}\n`);

  // 2. Получение директории запуска
  console.log('2. Директория запуска:');
  const launchDir = workdirUtils.getLaunchDir();
  console.log(`   ${launchDir}\n`);

  // 3. Поиск корня проекта
  console.log('3. Корень проекта:');
  const projectRoot = await workdirUtils.getProjectRoot();
  console.log(`   ${projectRoot}\n`);

  // 4. Расширение путей
  console.log('4. Расширение путей:');
  const homeDir = require('os').homedir();
  console.log(`   ~/test -> ${workdirUtils.expandPath('~/test')}`);
  console.log(`   Домашняя директория: ${homeDir}\n`);

  // 5. Работа с переменными окружения
  console.log('5. Переменные окружения:');
  process.env.TEST_VAR = 'test_value';
  console.log(`   %TEST_VAR%/path -> ${workdirUtils.expandPath('%TEST_VAR%/path')}`);
  console.log(`   $TEST_VAR/path -> ${workdirUtils.expandPath('$TEST_VAR/path')}\n`);

  // 6. Смена директории
  console.log('6. Смена директории:');
  const tempDir = require('path').join(__dirname, 'temp-example');
  const fs = require('fs');
  
  try {
    fs.mkdirSync(tempDir, { recursive: true });
    const result = await workdirUtils.setCurrentDir(tempDir);
    
    if (result.ok) {
      console.log(`   Успешно перешли в: ${result.path}`);
      const newCurrent = await workdirUtils.getCurrentDir();
      console.log(`   Текущая директория: ${newCurrent}`);
      
      // Возвращаемся обратно
      await workdirUtils.setCurrentDir(__dirname);
      console.log(`   Вернулись в: ${await workdirUtils.getCurrentDir()}`);
    } else {
      console.log(`   Ошибка: ${result.error}`);
    }
  } catch (error) {
    console.log(`   Ошибка создания временной директории: ${error.message}`);
  }

  // 7. Сброс инициализации
  console.log('\n7. Сброс инициализации:');
  workdirUtils.resetInitialization();
  console.log('   Состояние сброшено');
  
  const currentAfterReset = await workdirUtils.getCurrentDir();
  console.log(`   Текущая директория после сброса: ${currentAfterReset}`);

  console.log('\n=== Демонстрация завершена ===');
}

// Запускаем демонстрацию
if (require.main === module) {
  demonstrateWorkdirUtils().catch(console.error);
}

export { demonstrateWorkdirUtils };
