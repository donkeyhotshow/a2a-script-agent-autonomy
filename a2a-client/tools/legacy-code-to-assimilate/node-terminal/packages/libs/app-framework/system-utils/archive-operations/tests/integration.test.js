/**
 * @fileoverview Интеграционные тесты для ArchiveOperations и AtomicOperations
 * @author MCP Team
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import ArchiveOperations, { AtomicOperations } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Интеграционные тесты ArchiveOperations + AtomicOperations', () => {
  let archiveOps;
  let atomicOps;
  let testDir;
  let archiveDir;

  beforeEach(async () => {
    archiveOps = new ArchiveOperations({ archivePath: path.join(__dirname, 'archives') });
    atomicOps = new AtomicOperations();
    testDir = path.join(__dirname, 'test-temp');
    archiveDir = path.join(__dirname, 'archives');
    
    await fs.ensureDir(testDir);
    await fs.ensureDir(archiveDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
    await fs.remove(archiveDir);
  });

  describe('Создание структуры проекта и архивирование', () => {
    it('должен создать структуру проекта и заархивировать её', async () => {
      // 1. Создаем структуру проекта с помощью AtomicOperations
      const structureResult = await atomicOps.executeSet('create_project', testDir);
      assert.strictEqual(structureResult.success, true);

      // 2. Проверяем, что структура создана
      assert.ok(await fs.pathExists(path.join(testDir, 'src')));
      assert.ok(await fs.pathExists(path.join(testDir, 'tests')));
      assert.ok(await fs.pathExists(path.join(testDir, 'docs')));
      assert.ok(await fs.pathExists(path.join(testDir, 'dist')));
      assert.ok(await fs.pathExists(path.join(testDir, 'README.md')));
      assert.ok(await fs.pathExists(path.join(testDir, 'package.json')));

      // 3. Создаем архив структуры проекта
      const archiveResult = await archiveOps.createArchive(testDir, 'project-structure');
      assert.strictEqual(archiveResult.success, true);
      assert.ok(await fs.pathExists(archiveResult.archivePath));

      // 4. Проверяем информацию об архиве
      const archiveInfo = await archiveOps.getArchiveInfo(archiveResult.archivePath);
      assert.strictEqual(archiveInfo.exists, true);
      assert.ok(archiveInfo.fileCount > 0);

      // 5. Извлекаем архив в новую директорию
      const extractDir = path.join(testDir, 'extracted');
      const extractResult = await archiveOps.extractArchive(archiveResult.archivePath, extractDir);
      assert.strictEqual(extractResult.success, true);

      // 6. Проверяем, что структура извлечена корректно
      assert.ok(await fs.pathExists(path.join(extractDir, 'src')));
      assert.ok(await fs.pathExists(path.join(extractDir, 'tests')));
      assert.ok(await fs.pathExists(path.join(extractDir, 'docs')));
      assert.ok(await fs.pathExists(path.join(extractDir, 'dist')));
      assert.ok(await fs.pathExists(path.join(extractDir, 'README.md')));
      assert.ok(await fs.pathExists(path.join(extractDir, 'package.json')));
    });
  });

  describe('Создание структуры для архивирования', () => {
    it('должен создать структуру для архивирования и использовать её', async () => {
      // 1. Создаем структуру для архивирования
      const structureResult = await atomicOps.executeSet('create_archive_structure', testDir);
      assert.strictEqual(structureResult.success, true);

      // 2. Проверяем созданную структуру
      assert.ok(await fs.pathExists(path.join(testDir, 'archives')));
      assert.ok(await fs.pathExists(path.join(testDir, 'archives/temp')));
      assert.ok(await fs.pathExists(path.join(testDir, 'archives/backup')));
      assert.ok(await fs.pathExists(path.join(testDir, 'archives/export')));
      assert.ok(await fs.pathExists(path.join(testDir, 'archives/README.md')));

      // 3. Создаем тестовые файлы в структуре
      await atomicOps.executeCustomOperations([
        { type: 'touch', path: 'archives/temp/test1.txt', content: 'Test file 1' },
        { type: 'touch', path: 'archives/backup/config.json', content: '{"test": true}' },
        { type: 'touch', path: 'archives/export/data.csv', content: 'id,name\n1,test' }
      ], testDir);

      // 4. Создаем архив всей структуры
      const archiveResult = await archiveOps.createArchive(
        path.join(testDir, 'archives'), 
        'archive-structure'
      );
      assert.strictEqual(archiveResult.success, true);

      // 5. Проверяем содержимое архива
      const files = await archiveOps.listArchiveFiles(archiveResult.archivePath);
      assert.ok(files.length > 0);
      
      const tempFile = files.find(f => f.name.includes('test1.txt'));
      const backupFile = files.find(f => f.name.includes('config.json'));
      const exportFile = files.find(f => f.name.includes('data.csv'));
      
      assert.ok(tempFile);
      assert.ok(backupFile);
      assert.ok(exportFile);
    });
  });

  describe('Резервное копирование с архивированием', () => {
    it('должен создать резервную копию и заархивировать её', async () => {
      // 1. Создаем тестовые конфигурационные файлы
      await atomicOps.executeCustomOperations([
        { type: 'touch', path: 'package.json', content: '{"name": "test-project"}' },
        { type: 'touch', path: 'tsconfig.json', content: '{"compilerOptions": {}}' }
      ], testDir);

      // 2. Создаем резервную копию
      const backupResult = await atomicOps.executeSet('backup_config', testDir);
      assert.strictEqual(backupResult.success, true);

      // 3. Проверяем резервные файлы
      assert.ok(await fs.pathExists(path.join(testDir, 'backup/package.json.backup')));
      assert.ok(await fs.pathExists(path.join(testDir, 'backup/tsconfig.json.backup')));

      // 4. Создаем архив резервной копии
      const archiveResult = await archiveOps.createArchive(
        path.join(testDir, 'backup'), 
        'config-backup'
      );
      assert.strictEqual(archiveResult.success, true);

      // 5. Проверяем архив
      const archiveInfo = await archiveOps.getArchiveInfo(archiveResult.archivePath);
      assert.strictEqual(archiveInfo.fileCount, 2);

      // 6. Поиск в архиве
      const searchResult = await archiveOps.searchInArchive(
        archiveResult.archivePath, 
        'package.json'
      );
      assert.ok(searchResult.results.length > 0);
    });
  });

  describe('Автоматическое архивирование с атомарными операциями', () => {
    it('должен создать структуру тестов и автоматически заархивировать', async () => {
      // 1. Создаем структуру для тестирования
      const testStructureResult = await atomicOps.executeSet('create_test_structure', testDir);
      assert.strictEqual(testStructureResult.success, true);

      // 2. Добавляем тестовые файлы
      await atomicOps.executeCustomOperations([
        { type: 'touch', path: 'tests/unit/example.test.js', content: 'describe("test", () => {});' },
        { type: 'touch', path: 'tests/integration/api.test.js', content: 'describe("api", () => {});' },
        { type: 'touch', path: 'tests/e2e/ui.test.js', content: 'describe("ui", () => {});' }
      ], testDir);

      // 3. Создаем автоматически именованный архив
      const autoArchiveResult = await archiveOps.createAutoNamedArchive(
        path.join(testDir, 'tests')
      );
      assert.strictEqual(autoArchiveResult.success, true);

      // 4. Проверяем, что архив создан с временной меткой
      const archiveName = path.basename(autoArchiveResult.archivePath);
      assert.ok(archiveName.includes('archive_'));
      assert.ok(archiveName.includes('.zip'));

      // 5. Проверяем содержимое архива
      const files = await archiveOps.listArchiveFiles(autoArchiveResult.archivePath);
      const testFiles = files.filter(f => f.name.includes('.test.js'));
      assert.strictEqual(testFiles.length, 3);
    });
  });

  describe('Валидация и очистка архивов', () => {
    it('должен создать архив, проверить его целостность и получить статистику', async () => {
      // 1. Создаем тестовую структуру
      await atomicOps.executeSet('create_project', testDir);

      // 2. Создаем архив
      const archiveResult = await archiveOps.createArchive(testDir, 'validation-test');
      assert.strictEqual(archiveResult.success, true);

      // 3. Проверяем целостность архива
      const validationResult = await archiveOps.validateArchive(archiveResult.archivePath);
      assert.strictEqual(validationResult.isValid, true);

      // 4. Получаем статистику по архивам
      const stats = await archiveOps.getArchiveStatistics();
      assert.ok(stats.totalArchives > 0);
      assert.ok(stats.totalSize > 0);

      // 5. Проверяем, что архив в списке
      const allArchives = await archiveOps.listAllArchives();
      const testArchive = allArchives.find(a => a.name.includes('validation-test'));
      assert.ok(testArchive);
    });
  });

  describe('Обработка ошибок', () => {
    it('должен корректно обрабатывать ошибки в атомарных операциях', async () => {
      // 1. Пытаемся выполнить некорректную операцию
      const invalidOperations = [
        { type: 'copy', from: 'non-existent.txt', to: 'dest.txt' }
      ];

      const result = await atomicOps.executeCustomOperations(invalidOperations, testDir);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.summary.failed, 1);

      // 2. Проверяем статистику
      const stats = atomicOps.getStatistics();
      assert.strictEqual(stats.failedOperations, 1);
    });

    it('должен корректно обрабатывать ошибки в архивировании', async () => {
      // 1. Пытаемся создать архив из несуществующих файлов
      const archiveResult = await archiveOps.createArchive(['non-existent-file.txt'], 'error-test');
      assert.strictEqual(archiveResult.success, false);
      assert.ok(archiveResult.error.includes('Нет валидных файлов'));
    });
  });
});
