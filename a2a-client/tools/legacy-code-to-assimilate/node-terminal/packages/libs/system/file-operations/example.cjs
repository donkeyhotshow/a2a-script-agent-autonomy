/**
 * Пример использования библиотеки file-operations
 */

const fileOps = require('./index.cjs');

async function demonstrateFileOperations() {
  console.log('=== Демонстрация file-operations ===\n');

  // 1. Создание тестового файла
  console.log('1. Создание тестового файла:');
  const testFile = './example-test.txt';
  const testContent = 'Строка 1\nСтрока 2\nСтрока 3\nСтрока 4\nСтрока 5';
  
  const writeResult = await fileOps.writeFile(testFile, testContent);
  if (writeResult.success) {
    console.log(`   Файл создан: ${writeResult.path}`);
    console.log(`   Записано байт: ${writeResult.bytesWritten}\n`);
  }

  // 2. Чтение файла
  console.log('2. Чтение файла:');
  const readResult = await fileOps.readFile(testFile);
  if (readResult.success) {
    console.log(`   Содержимое (${readResult.lines} строк):`);
    console.log(`   ${readResult.content.replace(/\n/g, '\n   ')}\n`);
  }

  // 3. Чтение диапазона строк
  console.log('3. Чтение диапазона строк (2-4):');
  const rangeResult = await fileOps.readFile(testFile, {
    startLine: 2,
    endLine: 4
  });
  if (rangeResult.success) {
    console.log(`   Строки ${rangeResult.lines} из ${rangeResult.totalLines}:`);
    console.log(`   ${rangeResult.content.replace(/\n/g, '\n   ')}\n`);
  }

  // 4. Создание резервной копии
  console.log('4. Создание резервной копии:');
  const backupResult = await fileOps.createBackup(testFile);
  if (backupResult.success) {
    console.log(`   Резервная копия создана: ${backupResult.backupPath}\n`);
  }

  // 5. Подготовка изменений
  console.log('5. Подготовка изменений:');
  const newContent = 'Обновленная строка 1\nСтрока 2\nНовая строка 3\nСтрока 4\nСтрока 5';
  const editResult = await fileOps.prepareEdit(testFile, newContent);
  if (editResult.success) {
    console.log(`   Ключ редактирования: ${editResult.editKey}`);
    console.log(`   Размер изменений: ${editResult.originalSize} -> ${editResult.newSize} байт`);
    console.log('   Предварительный просмотр изменений:');
    console.log(`   ${editResult.diffPreview.replace(/\n/g, '\n   ')}\n`);
  }

  // 6. Применение изменений
  console.log('6. Применение изменений:');
  const applyResult = await fileOps.applyEdit(editResult.editKey);
  if (applyResult.success) {
    console.log(`   Изменения применены`);
    console.log(`   Резервная копия: ${applyResult.backupPath}`);
    console.log(`   Записано байт: ${applyResult.bytesWritten}\n`);
  }

  // 7. Проверка результата
  console.log('7. Проверка результата:');
  const finalReadResult = await fileOps.readFile(testFile);
  if (finalReadResult.success) {
    console.log(`   Обновленное содержимое:`);
    console.log(`   ${finalReadResult.content.replace(/\n/g, '\n   ')}\n`);
  }

  // 8. Копирование файла
  console.log('8. Копирование файла:');
  const copyFile = './example-copy.txt';
  const copyResult = await fileOps.copyPath(testFile, copyFile);
  if (copyResult.success) {
    console.log(`   Файл скопирован: ${copyResult.source} -> ${copyResult.destination}\n`);
  }

  // 9. Перемещение файла
  console.log('9. Перемещение файла:');
  const moveFile = './example-moved.txt';
  const moveResult = await fileOps.movePath(copyFile, moveFile);
  if (moveResult.success) {
    console.log(`   Файл перемещен: ${moveResult.source} -> ${moveResult.destination}\n`);
  }

  // 10. Список файлов в директории
  console.log('10. Список файлов в текущей директории:');
  const listResult = await fileOps.listDirectory('.', {
    filter: (entry) => entry.name.startsWith('example-')
  });
  if (listResult.success) {
    console.log(`   Найдено файлов: ${listResult.count}`);
    listResult.entries.forEach(entry => {
      console.log(`   - ${entry.name} (${entry.type}, ${entry.size || 0} байт)`);
    });
    console.log();
  }

  // 11. Статус буфера редактирования
  console.log('11. Статус буфера редактирования:');
  const bufferStatus = fileOps.getBufferStatus();
  console.log(`   Файлов в буфере: ${bufferStatus.totalFiles}`);
  console.log(`   Максимум файлов: ${bufferStatus.maxBufferSize}\n`);

  // 12. Очистка
  console.log('12. Очистка тестовых файлов:');
  const filesToDelete = [testFile, moveFile];
  for (const file of filesToDelete) {
    const deleteResult = await fileOps.deletePath(file);
    if (deleteResult.success) {
      console.log(`   Удален: ${file}`);
    }
  }

  // Очистка резервных копий
  const cleanupResult = await fileOps.cleanupBackups(testFile);
  if (cleanupResult.success) {
    console.log(`   Очищено резервных копий: ${cleanupResult.deleted}\n`);
  }

  console.log('=== Демонстрация завершена ===');
}

// Запускаем демонстрацию
if (require.main === module) {
  demonstrateFileOperations().catch(console.error);
}

module.exports.demonstrateFileOperations = demonstrateFileOperations;
