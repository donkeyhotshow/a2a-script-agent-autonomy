/**
 * @fileoverview Тесты для ArchiveOperations
 * @author MCP Team
 * @version 1.1.0
 */

import fs from 'fs-extra';
import path from 'path';
import { ArchiveOperations } from '../index.js';
import { TestUtils, TEST_DIR, TEST_ARCHIVE_DIR } from './test-utils.js';
import { TestAssertions } from './test-assertions.js';

/**
 * Тесты для ArchiveOperations
 */
class ArchiveOperationsTests extends TestAssertions {
  constructor() {
    super();
    this.archiveOps = new ArchiveOperations({ archivePath: TEST_ARCHIVE_DIR });
  }

  async testConstructor() {
    console.log('\n📋 Тест конструктора...');
    
    const archiveOps = new ArchiveOperations({ 
      archivePath: TEST_ARCHIVE_DIR,
      defaultFormat: 'zip',
      compressionLevel: 9
    });
    
    await this.assert(
      archiveOps.archivePath === TEST_ARCHIVE_DIR,
      'Конструктор правильно устанавливает archivePath'
    );
    
    await this.assert(
      archiveOps.defaultFormat === 'zip',
      'Конструктор правильно устанавливает defaultFormat'
    );
    
    await this.assert(
      archiveOps.compressionLevel === 9,
      'Конструктор правильно устанавливает compressionLevel'
    );
  }

  async testCreateArchive() {
    console.log('\n📋 Тест создания архива...');
    
    const testFiles = [
      path.join(TEST_DIR, 'test1.txt'),
      path.join(TEST_DIR, 'test2.txt')
    ];
    
    const result = await this.archiveOps.createArchive(testFiles, 'test-create');
    
    await this.assert(
      result.success === true,
      'Архив успешно создан'
    );
    
    await this.assert(
      result.archivePath.endsWith('test-create.zip'),
      'Правильное имя архива'
    );
    
    await this.assert(
      await fs.pathExists(result.archivePath),
      'Файл архива существует'
    );
    
    await this.assert(
      result.files.length === 2,
      'Правильное количество файлов в результате'
    );
  }

  async testExtractArchive() {
    console.log('\n📋 Тест извлечения архива...');
    
    // Создаем тестовый архив
    const createResult = await TestUtils.createTestArchive(this.archiveOps, 'test-extract');
    
    if (!createResult.success) {
      this.testResults.failed++;
      console.log('❌ Не удалось создать тестовый архив для извлечения');
      return;
    }
    
    const extractPath = path.join(TEST_ARCHIVE_DIR, 'extracted');
    const result = await this.archiveOps.extractArchive(createResult.archivePath, extractPath);
    
    await this.assert(
      result.success === true,
      'Архив успешно извлечен'
    );
    
    await this.assert(
      await fs.pathExists(extractPath),
      'Директория извлечения создана'
    );
    
    await this.assert(
      result.extractedFiles.length > 0,
      'Файлы извлечены'
    );
  }

  async testListArchiveFiles() {
    console.log('\n📋 Тест списка файлов в архиве...');
    
    const createResult = await TestUtils.createTestArchive(this.archiveOps, 'test-list');
    
    if (!createResult.success) {
      this.testResults.failed++;
      console.log('❌ Не удалось создать тестовый архив для списка файлов');
      return;
    }
    
    const files = await this.archiveOps.listArchiveFiles(createResult.archivePath);
    
    await this.assert(
      Array.isArray(files),
      'Результат является массивом'
    );
    
    await this.assert(
      files.length > 0,
      'В архиве есть файлы'
    );
    
    await this.assert(
      files.some(f => f.name.includes('test1.txt')),
      'Файл test1.txt найден в архиве'
    );
  }

  async testSearchInArchive() {
    console.log('\n📋 Тест поиска в архиве...');
    
    const createResult = await TestUtils.createTestArchive(this.archiveOps, 'test-search');
    
    if (!createResult.success) {
      this.testResults.failed++;
      console.log('❌ Не удалось создать тестовый архив для поиска');
      return;
    }
    
    const result = await this.archiveOps.searchInArchive(createResult.archivePath, 'test1');
    
    await this.assert(
      result.totalFound > 0,
      'Поиск нашел результаты'
    );
    
    await this.assert(
      result.results.some(r => r.file.includes('test1.txt')),
      'Найден файл test1.txt'
    );
    
    await this.assert(
      result.archivePath === createResult.archivePath,
      'Правильный путь к архиву в результате'
    );
  }

  async testGetArchiveInfo() {
    console.log('\n📋 Тест получения информации об архиве...');
    
    const createResult = await TestUtils.createTestArchive(this.archiveOps, 'test-info');
    
    if (!createResult.success) {
      this.testResults.failed++;
      console.log('❌ Не удалось создать тестовый архив для получения информации');
      return;
    }
    
    const info = await this.archiveOps.getArchiveInfo(createResult.archivePath);
    
    await this.assert(
      info.exists === true,
      'Архив существует'
    );
    
    await this.assert(
      info.size > 0,
      'Размер архива больше 0'
    );
    
    await this.assert(
      info.fileCount > 0,
      'Количество файлов больше 0'
    );
    
    await this.assert(
      info.format === '.zip',
      'Правильный формат архива'
    );
  }

  async testValidateArchive() {
    console.log('\n📋 Тест валидации архива...');
    
    const createResult = await TestUtils.createTestArchive(this.archiveOps, 'test-validate');
    
    if (!createResult.success) {
      this.testResults.failed++;
      console.log('❌ Не удалось создать тестовый архив для валидации');
      return;
    }
    
    const validation = await this.archiveOps.validateArchive(createResult.archivePath);
    
    await this.assert(
      validation.isValid === true,
      'Архив валиден'
    );
    
    await this.assert(
      validation.errors.length === 0,
      'Нет ошибок валидации'
    );
    
    await this.assert(
      validation.size > 0,
      'Размер архива больше 0'
    );
  }

  async testGetArchiveStatistics() {
    console.log('\n📋 Тест статистики архивов...');
    
    // Создаем несколько архивов для статистики
    await TestUtils.createTestArchive(this.archiveOps, 'test-stats-1');
    await TestUtils.createTestArchive(this.archiveOps, 'test-stats-2');
    
    const stats = await this.archiveOps.getArchiveStatistics();
    
    await this.assert(
      stats.totalArchives > 0,
      'Общее количество архивов больше 0'
    );
    
    await this.assert(
      stats.totalSize > 0,
      'Общий размер архивов больше 0'
    );
    
    await this.assert(
      typeof stats.formats === 'object',
      'Форматы архивов определены'
    );
  }

  async testCleanupOldArchives() {
    console.log('\n📋 Тест очистки старых архивов...');
    
    const result = await this.archiveOps.cleanupOldArchives({ 
      maxAge: 1, 
      dryRun: true 
    });
    
    await this.assert(
      result.success === true,
      'Очистка выполнена успешно'
    );
    
    await this.assert(
      Array.isArray(result.removedArchives),
      'Список удаленных архивов является массивом'
    );
    
    await this.assert(
      typeof result.freedSpace === 'number',
      'Освобожденное место является числом'
    );
  }

  async testCreateAutoNamedArchive() {
    console.log('\n📋 Тест создания архива с автоименованием...');
    
    const testFiles = [path.join(TEST_DIR, 'test1.txt')];
    const result = await this.archiveOps.createAutoNamedArchive(testFiles);
    
    await this.assert(
      result.success === true,
      'Автоименованный архив создан успешно'
    );
    
    await this.assert(
      result.archivePath.includes('archive_'),
      'Имя архива содержит префикс archive_'
    );
    
    await this.assert(
      await fs.pathExists(result.archivePath),
      'Файл автоименованного архива существует'
    );
  }

  async testGetArchiveSize() {
    console.log('\n📋 Тест получения размера архива...');
    
    const createResult = await TestUtils.createTestArchive(this.archiveOps, 'test-size');
    
    if (!createResult.success) {
      this.testResults.failed++;
      console.log('❌ Не удалось создать тестовый архив для проверки размера');
      return;
    }
    
    const size = await this.archiveOps.getArchiveSize(createResult.archivePath);
    
    await this.assert(
      size > 0,
      'Размер архива больше 0'
    );
    
    await this.assert(
      typeof size === 'number',
      'Размер архива является числом'
    );
  }

  async testArchiveExists() {
    console.log('\n📋 Тест проверки существования архива...');
    
    const createResult = await TestUtils.createTestArchive(this.archiveOps, 'test-exists');
    
    if (!createResult.success) {
      this.testResults.failed++;
      console.log('❌ Не удалось создать тестовый архив для проверки существования');
      return;
    }
    
    const exists = await this.archiveOps.archiveExists(createResult.archivePath);
    
    await this.assert(
      exists === true,
      'Архив существует'
    );
    
    const notExists = await this.archiveOps.archiveExists('non-existent-archive.zip');
    
    await this.assert(
      notExists === false,
      'Несуществующий архив не найден'
    );
  }

  async testListAllArchives() {
    console.log('\n📋 Тест списка всех архивов...');
    
    // Создаем несколько архивов
    await TestUtils.createTestArchive(this.archiveOps, 'test-list-all-1');
    await TestUtils.createTestArchive(this.archiveOps, 'test-list-all-2');
    
    const archives = await this.archiveOps.listAllArchives();
    
    await this.assert(
      Array.isArray(archives),
      'Результат является массивом'
    );
    
    await this.assert(
      archives.length > 0,
      'Найдены архивы'
    );
    
    await this.assert(
      archives.every(a => a.name && a.path && a.size),
      'Все архивы имеют необходимые свойства'
    );
  }
}

export { ArchiveOperationsTests };
