/**
 * @fileoverview Тесты для библиотеки archive-operations и atomic-operations
 * @author MCP Team
 * @version 1.1.0
 */

import { TestUtils } from './test-utils.js';
import { ArchiveOperationsTests } from './archive-tests.js';
import { AtomicOperationsTests } from './atomic-tests.js';

/**
 * Главный класс для запуска всех тестов
 */
class MainTestRunner {
  constructor() {
    this.archiveTests = new ArchiveOperationsTests();
    this.atomicTests = new AtomicOperationsTests();
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runAllTests() {
    console.log('🚀 Запуск тестов для archive-operations и atomic-operations...\n');

    try {
      await TestUtils.setupTestEnvironment();
      
      // Тесты ArchiveOperations
      console.log('📦 Тестирование ArchiveOperations...');
      await this.archiveTests.testConstructor();
      await this.archiveTests.testCreateArchive();
      await this.archiveTests.testExtractArchive();
      await this.archiveTests.testListArchiveFiles();
      await this.archiveTests.testSearchInArchive();
      await this.archiveTests.testGetArchiveInfo();
      await this.archiveTests.testValidateArchive();
      await this.archiveTests.testGetArchiveStatistics();
      await this.archiveTests.testCleanupOldArchives();
      await this.archiveTests.testCreateAutoNamedArchive();
      await this.archiveTests.testGetArchiveSize();
      await this.archiveTests.testArchiveExists();
      await this.archiveTests.testListAllArchives();
      
      // Тесты AtomicOperations
      console.log('\n⚡ Тестирование AtomicOperations...');
      await this.atomicTests.testAtomicOperations();
      
      await TestUtils.cleanupTestEnvironment();
      
      // Объединяем результаты
      const archiveResults = this.archiveTests.getResults();
      const atomicResults = this.atomicTests.getResults();
      
      this.testResults.passed = archiveResults.passed + atomicResults.passed;
      this.testResults.failed = archiveResults.failed + atomicResults.failed;
      this.testResults.errors = [...archiveResults.errors, ...atomicResults.errors];
      
    } catch (error) {
      this.testResults.errors.push(`Ошибка в тестах: ${error.message}`);
    }

    this.printResults();
  }


  printResults() {
    console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТОВ:');
    console.log(`✅ Пройдено: ${this.testResults.passed}`);
    console.log(`❌ Провалено: ${this.testResults.failed}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n🚨 ОШИБКИ:');
      this.testResults.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? (this.testResults.passed / total * 100).toFixed(1) : 0;
    
    console.log(`\n📈 Успешность: ${successRate}%`);
    
    if (this.testResults.failed === 0 && this.testResults.errors.length === 0) {
      console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    } else {
      console.log('\n⚠️  ЕСТЬ ПРОБЛЕМЫ, ТРЕБУЕТСЯ ДОРАБОТКА');
    }
  }
}

// Запуск тестов
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = new MainTestRunner();
  tests.runAllTests().catch(error => {
    console.error('❌ Критическая ошибка в тестах:', error);
    process.exit(1);
  });
}

export { MainTestRunner, ArchiveOperationsTests, AtomicOperationsTests, TestUtils };
