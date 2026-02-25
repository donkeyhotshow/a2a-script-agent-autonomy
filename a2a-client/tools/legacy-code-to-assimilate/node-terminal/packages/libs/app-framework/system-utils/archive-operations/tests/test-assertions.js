/**
 * @fileoverview Утилиты для ассертов в тестах archive-operations
 * @author MCP Team
 * @version 1.1.0
 */

/**
 * Класс для управления ассертами в тестах
 */
class TestAssertions {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async assert(condition, message) {
    if (condition) {
      this.testResults.passed++;
      console.log(`✅ ${message}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${message}`);
    }
  }

  async assertThrows(fn, message) {
    try {
      await fn();
      this.testResults.failed++;
      console.log(`❌ ${message} - ожидалась ошибка, но её не было`);
    } catch (error) {
      this.testResults.passed++;
      console.log(`✅ ${message} - ошибка поймана: ${error.message}`);
    }
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

  getResults() {
    return this.testResults;
  }
}

export { TestAssertions };
