/**
 * @fileoverview Тесты для AtomicOperations
 * @author MCP Team
 * @version 1.1.0
 */

import fs from 'fs-extra';
import path from 'path';
import { AtomicOperations } from '../index.js';
import { TestUtils, TEST_DIR } from './test-utils.js';
import { TestAssertions } from './test-assertions.js';

/**
 * Тесты для AtomicOperations
 */
class AtomicOperationsTests extends TestAssertions {
  constructor() {
    super();
    this.atomicOps = new AtomicOperations();
  }

  async testAtomicOperations() {
    console.log('\n📋 Тест атомарных операций...');
    
    const atomicTestDir = path.join(TEST_DIR, 'atomic-test');
    
    // Тест получения доступных наборов
    const availableSets = this.atomicOps.getAvailableSets();
    await this.assert(
      availableSets.includes('create_project'),
      'Набор create_project доступен'
    );
    
    // Тест выполнения набора операций
    const result = await this.atomicOps.executeSet('create_project', atomicTestDir);
    await this.assert(
      result.success === true,
      'Набор create_project выполнен успешно'
    );
    
    // Проверяем созданную структуру
    await this.assert(
      await fs.pathExists(path.join(atomicTestDir, 'src')),
      'Директория src создана'
    );
    
    await this.assert(
      await fs.pathExists(path.join(atomicTestDir, 'tests')),
      'Директория tests создана'
    );
    
    await this.assert(
      await fs.pathExists(path.join(atomicTestDir, 'README.md')),
      'Файл README.md создан'
    );
    
    // Тест пользовательских операций
    const customResult = await this.atomicOps.executeCustomOperations([
      { type: 'mkdir', path: 'custom-dir' },
      { type: 'touch', path: 'custom-file.txt', content: 'Custom content' }
    ], atomicTestDir);
    
    await this.assert(
      customResult.success === true,
      'Пользовательские операции выполнены успешно'
    );
    
    await this.assert(
      await fs.pathExists(path.join(atomicTestDir, 'custom-dir')),
      'Пользовательская директория создана'
    );
    
    await this.assert(
      await fs.pathExists(path.join(atomicTestDir, 'custom-file.txt')),
      'Пользовательский файл создан'
    );
    
    // Тест статистики
    const stats = this.atomicOps.getStatistics();
    await this.assert(
      stats.totalOperations > 0,
      'Статистика обновлена'
    );
    
    // Очищаем тестовую директорию
    await fs.remove(atomicTestDir);
  }
}

export { AtomicOperationsTests };
