/**
 * @fileoverview Тесты для модуля AtomicOperations
 * @author MCP Team
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { AtomicOperations } from '../atomic-operations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AtomicOperations', () => {
  let atomicOps;
  let testDir;

  beforeEach(async () => {
    atomicOps = new AtomicOperations();
    testDir = path.join(__dirname, 'test-temp');
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Конструктор', () => {
    it('должен создать экземпляр с предустановленными наборами операций', () => {
      assert.ok(atomicOps.operationSets);
      assert.ok(atomicOps.operationSets.create_project);
      assert.ok(atomicOps.operationSets.create_test_structure);
      assert.ok(atomicOps.operationSets.backup_config);
      assert.ok(atomicOps.operationSets.create_archive_structure);
    });

    it('должен инициализировать статистику', () => {
      const stats = atomicOps.getStatistics();
      assert.strictEqual(stats.totalOperations, 0);
      assert.strictEqual(stats.successfulOperations, 0);
      assert.strictEqual(stats.failedOperations, 0);
      assert.strictEqual(stats.lastExecution, null);
    });
  });

  describe('getAvailableSets', () => {
    it('должен вернуть список доступных наборов операций', () => {
      const sets = atomicOps.getAvailableSets();
      assert.ok(Array.isArray(sets));
      assert.ok(sets.includes('create_project'));
      assert.ok(sets.includes('create_test_structure'));
      assert.ok(sets.includes('backup_config'));
      assert.ok(sets.includes('create_archive_structure'));
    });
  });

  describe('getSetDetails', () => {
    it('должен вернуть детали существующего набора', () => {
      const details = atomicOps.getSetDetails('create_project');
      assert.ok(details);
      assert.strictEqual(details.name, 'Создание базовой структуры проекта');
      assert.ok(Array.isArray(details.operations));
    });

    it('должен вернуть null для несуществующего набора', () => {
      const details = atomicOps.getSetDetails('non_existent');
      assert.strictEqual(details, null);
    });
  });

  describe('validateOperation', () => {
    it('должен валидировать корректную операцию mkdir', () => {
      const result = atomicOps.validateOperation({
        type: 'mkdir',
        path: 'test-dir'
      });
      assert.strictEqual(result.valid, true);
    });

    it('должен валидировать корректную операцию copy', () => {
      const result = atomicOps.validateOperation({
        type: 'copy',
        from: 'source.txt',
        to: 'dest.txt'
      });
      assert.strictEqual(result.valid, true);
    });

    it('должен отклонять операцию без типа', () => {
      const result = atomicOps.validateOperation({
        path: 'test.txt'
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('Тип операции не указан'));
    });

    it('должен отклонять операцию copy без параметров from/to', () => {
      const result = atomicOps.validateOperation({
        type: 'copy',
        path: 'test.txt'
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('требуются параметры from и to'));
    });
  });

  describe('executeAtomicOperation', () => {
    it('должен создать директорию', async () => {
      const result = await atomicOps.executeAtomicOperation({
        type: 'mkdir',
        path: 'test-dir'
      }, testDir);

      assert.strictEqual(result.success, true);
      assert.ok(await fs.pathExists(path.join(testDir, 'test-dir')));
    });

    it('должен создать файл с содержимым', async () => {
      const result = await atomicOps.executeAtomicOperation({
        type: 'touch',
        path: 'test.txt',
        content: 'Hello World'
      }, testDir);

      assert.strictEqual(result.success, true);
      const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf8');
      assert.strictEqual(content, 'Hello World');
    });

    it('должен скопировать файл', async () => {
      // Создаем исходный файл
      await fs.writeFile(path.join(testDir, 'source.txt'), 'Source content');

      const result = await atomicOps.executeAtomicOperation({
        type: 'copy',
        from: 'source.txt',
        to: 'dest.txt'
      }, testDir);

      assert.strictEqual(result.success, true);
      const content = await fs.readFile(path.join(testDir, 'dest.txt'), 'utf8');
      assert.strictEqual(content, 'Source content');
    });

    it('должен выбросить ошибку для неизвестного типа операции', async () => {
      await assert.rejects(
        async () => {
          await atomicOps.executeAtomicOperation({
            type: 'unknown',
            path: 'test.txt'
          }, testDir);
        },
        /Неизвестный тип операции/
      );
    });
  });

  describe('executeSet', () => {
    it('должен выполнить набор операций create_project', async () => {
      const result = await atomicOps.executeSet('create_project', testDir);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.setName, 'create_project');
      assert.ok(await fs.pathExists(path.join(testDir, 'src')));
      assert.ok(await fs.pathExists(path.join(testDir, 'tests')));
      assert.ok(await fs.pathExists(path.join(testDir, 'docs')));
      assert.ok(await fs.pathExists(path.join(testDir, 'dist')));
      assert.ok(await fs.pathExists(path.join(testDir, 'README.md')));
      assert.ok(await fs.pathExists(path.join(testDir, 'package.json')));
    });

    it('должен выбросить ошибку для несуществующего набора', async () => {
      await assert.rejects(
        async () => {
          await atomicOps.executeSet('non_existent', testDir);
        },
        /Набор операций "non_existent" не найден/
      );
    });

    it('должен обновить статистику после выполнения', async () => {
      await atomicOps.executeSet('create_project', testDir);
      
      const stats = atomicOps.getStatistics();
      assert.strictEqual(stats.totalOperations, 6); // 6 операций в create_project
      assert.strictEqual(stats.successfulOperations, 6);
      assert.strictEqual(stats.failedOperations, 0);
      assert.ok(stats.lastExecution);
    });
  });

  describe('executeCustomOperations', () => {
    it('должен выполнить пользовательский набор операций', async () => {
      const operations = [
        { type: 'mkdir', path: 'custom-dir' },
        { type: 'touch', path: 'custom-file.txt', content: 'Custom content' }
      ];

      const result = await atomicOps.executeCustomOperations(operations, testDir);

      assert.strictEqual(result.success, true);
      assert.ok(await fs.pathExists(path.join(testDir, 'custom-dir')));
      assert.ok(await fs.pathExists(path.join(testDir, 'custom-file.txt')));
    });

    it('должен обработать ошибки в пользовательском наборе', async () => {
      const operations = [
        { type: 'mkdir', path: 'valid-dir' },
        { type: 'copy', from: 'non-existent.txt', to: 'dest.txt' } // Ошибка
      ];

      const result = await atomicOps.executeCustomOperations(operations, testDir);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.summary.total, 2);
      assert.strictEqual(result.summary.successful, 1);
      assert.strictEqual(result.summary.failed, 1);
    });
  });

  describe('getAvailableOperationTypes', () => {
    it('должен вернуть список всех доступных типов операций', () => {
      const types = atomicOps.getAvailableOperationTypes();
      assert.ok(Array.isArray(types));
      assert.ok(types.includes('mkdir'));
      assert.ok(types.includes('touch'));
      assert.ok(types.includes('copy'));
      assert.ok(types.includes('move'));
      assert.ok(types.includes('remove_file'));
      assert.ok(types.includes('remove_dir'));
      assert.ok(types.includes('write'));
      assert.ok(types.includes('append'));
    });
  });

  describe('Управление наборами операций', () => {
    it('должен добавить новый набор операций', () => {
      const newSet = {
        name: 'Тестовый набор',
        description: 'Описание тестового набора',
        operations: [
          { type: 'mkdir', path: 'test-dir' }
        ]
      };

      atomicOps.addOperationSet('test_set', newSet);
      const sets = atomicOps.getAvailableSets();
      assert.ok(sets.includes('test_set'));

      const details = atomicOps.getSetDetails('test_set');
      assert.strictEqual(details.name, 'Тестовый набор');
    });

    it('должен удалить набор операций', () => {
      atomicOps.removeOperationSet('create_project');
      const sets = atomicOps.getAvailableSets();
      assert.ok(!sets.includes('create_project'));
    });
  });

  describe('clearStatistics', () => {
    it('должен очистить статистику', async () => {
      await atomicOps.executeSet('create_project', testDir);
      
      atomicOps.clearStatistics();
      const stats = atomicOps.getStatistics();
      assert.strictEqual(stats.totalOperations, 0);
      assert.strictEqual(stats.successfulOperations, 0);
      assert.strictEqual(stats.failedOperations, 0);
      assert.strictEqual(stats.lastExecution, null);
    });
  });
});
