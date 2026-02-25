/**
 * Фабричная функция для создания утилит тестирования с логгером
 * @param {object} logger - Экземпляр логгера
 * @returns {object} Объект с функциями тестирования
 */
function createTestingUtils(logger) {
  const { ErrorHandlingUtils } = require('../../utils/error-handling'); // Обновлен импорт
  const errorHandlingUtils = new ErrorHandlingUtils({ logger }); // Создаем экземпляр

  const {
    generateParametersHash,
    checkExistingError,
    createErrorReport,
    ErrorBatchProcessor // Теперь это класс
  } = errorHandlingUtils; // Деструктурируем из экземпляра

  /**
   * Обработка ошибок тестов
   * @param {Function} operation - Асинхронная операция теста.
   * @param {object} [parameters={}] - Параметры, связанные с тестом.
   * @returns {Promise<any>} Результат выполнения операции.
   */
  async function testOperation(operation, parameters = {}) {
    const md5Hash = generateParametersHash(parameters);
  
    try {
      const result = await operation(parameters);
      return result;
    } catch (error) {
      // Определяем тип ошибки тестов
      let errorType = 'TEST_ERROR';
      let errorDetails = error.message;
      let priority = 'medium';
      
      if (error.message.includes('Test failed')) {
        errorType = 'TEST_FAILED';
        errorDetails = 'Тест не прошел проверку.';
      } else if (error.message.includes('Test timeout')) {
        errorType = 'TEST_TIMEOUT';
        errorDetails = 'Тест превысил время выполнения.';
        priority = 'high';
      } else if (error.message.includes('Test setup failed')) {
        errorType = 'TEST_SETUP_FAILED';
        errorDetails = 'Ошибка настройки теста.';
        priority = 'high';
      } else if (error.message.includes('Test teardown failed')) {
        errorType = 'TEST_TEARDOWN_FAILED';
        errorDetails = 'Ошибка завершения теста.';
        priority = 'medium';
      } else if (error.message.includes('Test runner failed')) {
        errorType = 'TEST_RUNNER_FAILED';
        errorDetails = 'Ошибка запуска тестового движка.';
        priority = 'high';
      } else if (error.message.includes('Test file not found')) {
        errorType = 'TEST_FILE_NOT_FOUND';
        errorDetails = 'Тестовый файл не найден.';
        priority = 'medium';
      } else if (error.message.includes('Test syntax error')) {
        errorType = 'TEST_SYNTAX_ERROR';
        errorDetails = 'Синтаксическая ошибка в тесте.';
        priority = 'high';
      } else if (error.message.includes('Test dependency missing')) {
        errorType = 'TEST_DEPENDENCY_MISSING';
        errorDetails = 'Отсутствует зависимость для теста.';
        priority = 'medium';
      }
      
      // Проверяем существующую ошибку
      const existingError = await checkExistingError(md5Hash);
      if (!existingError.exists) {
        await createErrorReport({
          code: errorType,
          title: `Ошибка теста: ${errorType}`,
          description: errorDetails,
          parameters: { 
            ...parameters, 
            testFile: parameters.testFile || 'unknown',
            testName: parameters.testName || 'unknown',
            errorCode: error.code,
            errorStack: error.stack
          },
          priority: priority,
          scriptName: 'testOperation'
        });
      }
      
      throw error;
    }
  }

  /**
   * Обработка результатов выполнения тестов
   * @param {object} testResults - Объект с результатами тестов.
   * @param {object} [parameters={}] - Дополнительные параметры.
   * @returns {Promise<object>} Входные результаты тестов.
   */
  async function processTestResults(testResults, parameters = {}) {
    const { failedTests = [], summary = {} } = testResults;
    
    // Если есть неудачные тесты, создаем отчет
    if (failedTests.length > 0) {
      const batchProcessor = errorHandlingUtils.createErrorBatchProcessor('TEST_BATCH_FAILURES'); // Используем метод экземпляра
      
      for (const failedTest of failedTests) {
        const testParams = {
          ...parameters,
          testFile: failedTest.file,
          testName: failedTest.test,
          errorMessage: failedTest.error,
          timestamp: failedTest.timestamp
        };
        
        batchProcessor.addError(new Error(failedTest.error), testParams);
      }
      
      await batchProcessor.processBatch();
    }
    
    // Если критическое количество тестов не прошло, создаем отдельный отчет
    const failureRate = summary.failedTests / summary.totalTests;
    if (failureRate > 0.5) { // Более 50% тестов не прошло
      await createErrorReport({
        code: 'CRITICAL_TEST_FAILURES',
        title: 'Критический уровень неудачных тестов',
        description: `Не прошло ${summary.failedTests} из ${summary.totalTests} тестов (${Math.round(failureRate * 100)}%)`,
        parameters: {
          ...parameters,
          totalTests: summary.totalTests,
          failedTests: summary.failedTests,
          failureRate: failureRate,
          duration: summary.duration
        },
        priority: 'high',
        scriptName: 'processTestResults'
      });
    }
    
    return testResults;
  }

  return {
    testOperation,
    processTestResults,
  };
}

export { createTestingUtils, };
