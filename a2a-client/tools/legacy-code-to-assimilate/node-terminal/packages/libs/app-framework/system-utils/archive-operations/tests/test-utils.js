/**
 * @fileoverview Утилиты для тестов archive-operations
 * @author MCP Team
 * @version 1.1.0
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Тестовая директория
const TEST_DIR = path.join(__dirname, 'test-files');
const TEST_ARCHIVE_DIR = path.join(__dirname, 'test-archives');

/**
 * Утилиты для тестов
 */
class TestUtils {
  static async setupTestEnvironment() {
    // Создаем тестовые директории
    await fs.ensureDir(TEST_DIR);
    await fs.ensureDir(TEST_ARCHIVE_DIR);
    
    // Создаем тестовые файлы
    await fs.writeFile(path.join(TEST_DIR, 'test1.txt'), 'Содержимое файла 1');
    await fs.writeFile(path.join(TEST_DIR, 'test2.txt'), 'Содержимое файла 2');
    await fs.writeFile(path.join(TEST_DIR, 'data.json'), JSON.stringify({ test: 'data' }));
    
    // Создаем тестовую поддиректорию
    await fs.ensureDir(path.join(TEST_DIR, 'subdir'));
    await fs.writeFile(path.join(TEST_DIR, 'subdir', 'test3.txt'), 'Содержимое файла 3');
  }

  static async cleanupTestEnvironment() {
    await fs.remove(TEST_DIR);
    await fs.remove(TEST_ARCHIVE_DIR);
  }

  static async createTestArchive(archiveOps, name = 'test-archive') {
    const testFiles = [
      path.join(TEST_DIR, 'test1.txt'),
      path.join(TEST_DIR, 'test2.txt'),
      path.join(TEST_DIR, 'data.json')
    ];
    
    return await archiveOps.createArchive(testFiles, name);
  }
}

export { TestUtils, TEST_DIR, TEST_ARCHIVE_DIR };
