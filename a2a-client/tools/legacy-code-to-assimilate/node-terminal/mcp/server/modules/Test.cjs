/**
 * Модуль тестирования
 * Обеспечивает запуск тестов и валидацию функциональности
 */

const {fileSystemUtils} = require('@libs/system/file-operations/index.js');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {ModuleBase} = require('../core/ModuleBase.cjs');
const {exec} = require('child_process');
const {promisify} = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class TestModule extends ModuleBase {
    constructor(server) {
        super(server, {
            name: 'Test',
            version: '1.0.0',
            description: 'Тестирование и валидация функциональности'
        });

        this.testResults = new Map();
        this.testHistory = [];
    }

    async processRequest(id, args) {
        const {action, type, pattern, ...params} = args;

        switch (action) {
            case 'run':
                return await this.handleRun(id, type, params);
            case 'list':
                return await this.handleList(id);
            case 'status':
                return await this.handleStatus(id);
            case 'coverage':
                return await this.handleCoverage(id);
            case 'validate':
                return await this.handleValidate(id, params);
            case 'cleanup':
                return await this.handleCleanup(id);
            default:
                throw errorUtils.createError(`Unknown test action: ${action}`);
        }
    }

    /**
     * Запуск тестов
     */
    async handleRun(id, type, {pattern, timeout = 300000, parallel = false} = {}) {
        const startTime = Date.now();
        let command = '';
        let testType = '';

        errorUtils.safeExecute(async () => {

            switch (type) {
                case 'unit':
                    command = 'npm test';
                    testType = 'Unit Tests';
                    break;
                case 'integration':
                    command = 'npm run test:integration';
                    testType = 'Integration Tests';
                    break;
                case 'all':
                    command = 'npm run test:all';
                    testType = 'All Tests';
                    break;
                case 'specific':
                    if (!pattern) throw errorUtils.createError('Pattern required for specific test type');
                    command = `npm test -- --testNamePattern="${pattern}"`;
                    testType = 'Specific Tests';
                    break;
                default:
                    throw errorUtils.createError(`Unknown test type: ${type}`);
            }

            this.logger.info(`Running ${testType}`, {command, timeout, parallel});

            const {stdout, stderr} = await execAsync(command, {
                cwd: process.cwd(),
                timeout,
                maxBuffer: 1024 * 1024 * 10 // 10MB буфер для тестов
            });

            const duration = Date.now() - startTime;
            const result = this.parseTestOutput(stdout, stderr, type, duration);

            // Сохраняем результат
            this.testResults.set(type, result);
            this.addToHistory(type, result, true);

            return {
                success: true,
                type,
                command,
                result,
                duration: `${duration}ms`
            };


        }, 'error')
        ms`
      };

      // Сохраняем результат ошибки
      this.testResults.set(type, result);
      this.addToHistory(type, result, false);

      throw error;
    }
  }

  /**
   * Список доступных тестов
   */
  async handleList(id) {
    errorUtils.safeExecute(async () => {

      // Проверяем package.json для доступных тестовых скриптов
      const packagePath = fileSystemUtils.join(process.cwd(), 'package.json');
      const packageContent = await fileSystemUtils.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      const testScripts = Object.entries(packageJson.scripts || {})
        .filter(([key, value]) => key.includes('test'))
        .map(([key, value]) => ({
          name: key,
          command: value,
          description: this.getTestDescription(key)
        }));

      // Проверяем наличие тестовых файлов
      const testFiles = await this.findTestFiles();

      return {
        success: true,
        testScripts,
        testFiles,
        count: testScripts.length
      };

    
}, 'error')`
    )

    }
}

/**
 * Статус тестов
 */
async
handleStatus(id)
{
    const status = {
        lastRun: {},
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverage: 0
    };

    // Агрегируем результаты всех типов тестов
    for (const [type, result] of this.testResults) {
        status.lastRun[type] = {
            success: result.success,
            timestamp: result.timestamp || new Date().toISOString(),
            duration: result.duration
        };

        if (result.success && result.stats) {
            status.totalTests += result.stats.total || 0;
            status.passedTests += result.stats.passed || 0;
            status.failedTests += result.stats.failed || 0;
        }
    }

    // Рассчитываем общее покрытие
    if (status.totalTests > 0) {
        status.coverage = Math.round((status.passedTests / status.totalTests) * 100);
    }

    return {
        success: true,
        status
    };
}

/**
 * Покрытие тестами
 */
async
handleCoverage(id)
{
    errorUtils.safeExecute(async () => {

        // Проверяем наличие coverage отчета
        const coveragePath = fileSystemUtils.join(process.cwd(), 'coverage');
        const coverageExists = await fs.access(coveragePath).then(() => true).catch(() => false);

        if (!coverageExists) {
            // Запускаем тесты с покрытием
            const {stdout} = await execAsync('npm run test:coverage || npm test -- --coverage', {
                cwd: process.cwd(),
                timeout: 600000 // 10 минут для coverage
            });

            return {
                success: true,
                message: 'Coverage report generated',
                output: stdout.substring(0, 1000) // Первые 1000 символов
            };
        }

        // Читаем существующий отчет
        const lcovPath = fileSystemUtils.join(coveragePath, 'lcov.info');
        if (await fs.access(lcovPath).then(() => true).catch(() => false)) {
            const lcovContent = await fileSystemUtils.readFile(lcovPath, 'utf8');
            const coverage = this.parseLcovCoverage(lcovContent);

            return {
                success: true,
                coverage,
                reportPath: coveragePath
            };
        }

        return {
            success: true,
            message: 'Coverage directory exists but no detailed report found',
            reportPath: coveragePath
        };


    }, 'error')`);
    }
  }

  /**
   * Валидация функциональности
   */
  async handleValidate(id, { modules = [] } = {}) {
    const validationResults = [];

    errorUtils.safeExecute(async () => {

      // Валидация основных модулей
      const coreModules = modules.length > 0 ? modules : ['terminal', 'file', 'search', 'archive', 'atomic'];

      for (const moduleName of coreModules) {
        errorUtils.safeExecute(async () => {

          const module = this.server.getModule(moduleName);
          if (module) {
            const capabilities = module.getCapabilities();
            const status = module.getStatus();

            validationResults.push({
              module: moduleName,
              valid: true,
              capabilities,
              status
            });
          } else {
            validationResults.push({
              module: moduleName,
              valid: false,
              error: 'Module not found'
            });
          }
        
}, 'error'));
        }
      }

      // Проверка общей работоспособности сервера
      const serverStats = this.server.getStats();
      const overallHealth = this.calculateHealthScore(validationResults);

      return {
        success: true,
        validationResults,
        serverStats,
        overallHealth,
        timestamp: new Date().toISOString()
      };

    
}, 'error')`
)

}
}

/**
 * Очистка тестовых данных
 */
async
handleCleanup(id)
{
    errorUtils.safeExecute(async () => {

        const cleanupTasks = [
            'coverage',
            'node_modules/.cache',
            'tmp/test-*',
            'logs/test-*'
        ];

        const results = [];

        for (const task of cleanupTasks) {
            errorUtils.safeExecute(async () => {

                const taskPath = fileSystemUtils.join(process.cwd(), task);
                await fileSystemUtils.rm(taskPath, {recursive: true, force: true});
                results.push({task, success: true});

            }, 'error')
        )

        }
    }

    return {
        success: true,
        cleanupTasks: results,
        message: 'Test cleanup completed'
    };


}
,
'error'
)
`);
    }
  }

  /**
   * Парсинг вывода тестов
   */
  parseTestOutput(stdout, stderr, type, duration) {
    const result = {
      success: true,
      type,
      timestamp: new Date().toISOString(),
      duration: `
$
{
    duration
}
ms`,
      output: stdout,
      errors: stderr || '',
      stats: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };

    // Простой парсинг Jest/Vitest вывода
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+)\s+total,\s+(\d+)\s+passed,\s+(\d+)\s+failed/);
        if (match) {
          result.stats.total = parseInt(match[1]);
          result.stats.passed = parseInt(match[2]);
          result.stats.failed = parseInt(match[3]);
        }
      }
      
      if (line.includes('FAIL')) {
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Поиск тестовых файлов
   */
  async findTestFiles() {
    const testFiles = [];
    const testDirs = ['tests', 'test', '__tests__'];

    for (const testDir of testDirs) {
      errorUtils.safeExecute(async () => {

        const testDirPath = fileSystemUtils.join(process.cwd(), testDir);
        if (await fs.access(testDirPath).then(() => true).catch(() => false)) {
          await this.scanTestDirectory(testDirPath, testFiles);
        }
      
}, 'error')
    }

    return testFiles;
  }

  /**
   * Сканирование тестовой директории
   */
  async scanTestDirectory(dirPath, testFiles) {
    errorUtils.safeExecute(async () => {

      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = fileSystemUtils.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          await this.scanTestDirectory(fullPath, testFiles);
        } else if (item.isFile() && this.isTestFile(item.name)) {
          testFiles.push({
            path: fullPath,
            name: item.name,
            type: this.getTestFileType(item.name)
          });
        }
      }
    
}, 'error')
  }

  /**
   * Проверка, является ли файл тестовым
   */
  isTestFile(filename) {
    return filename.includes('.test.') || 
           filename.includes('.spec.') || 
           filename.endsWith('.test.js') || 
           filename.endsWith('.spec.js') ||
           filename.endsWith('.test.ts') || 
           filename.endsWith('.spec.ts');
  }

  /**
   * Определение типа тестового файла
   */
  getTestFileType(filename) {
    if (filename.includes('unit')) return 'unit';
    if (filename.includes('integration')) return 'integration';
    if (filename.includes('e2e')) return 'e2e';
    return 'unknown';
  }

  /**
   * Получение описания тестового скрипта
   */
  getTestDescription(scriptName) {
    const descriptions = {
      'test': 'Unit tests using default test runner',
      'test:unit': 'Unit tests only',
      'test:integration': 'Integration tests',
      'test:e2e': 'End-to-end tests',
      'test:coverage': 'Tests with coverage report',
      'test:watch': 'Tests in watch mode',
      'test:debug': 'Tests in debug mode'
    };

    return descriptions[scriptName] || 'Test script';
  }

  /**
   * Парсинг LCOV coverage отчета
   */
  parseLcovCoverage(lcovContent) {
    const lines = lcovContent.split('\n');
    const coverage = {
      files: 0,
      lines: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 }
    };

    for (const line of lines) {
      if (line.startsWith('SF:')) coverage.files++;
      if (line.startsWith('LF:')) coverage.lines.total = parseInt(line.split(':')[1]);
      if (line.startsWith('LH:')) coverage.lines.covered = parseInt(line.split(':')[1]);
      if (line.startsWith('FNF:')) coverage.functions.total = parseInt(line.split(':')[1]);
      if (line.startsWith('FNH:')) coverage.functions.covered = parseInt(line.split(':')[1]);
      if (line.startsWith('BRF:')) coverage.branches.total = parseInt(line.split(':')[1]);
      if (line.startsWith('BRH:')) coverage.branches.covered = parseInt(line.split(':')[1]);
    }

    // Рассчитываем проценты
    if (coverage.lines.total > 0) {
      coverage.lines.percentage = Math.round((coverage.lines.covered / coverage.lines.total) * 100);
    }
    if (coverage.functions.total > 0) {
      coverage.functions.percentage = Math.round((coverage.functions.covered / coverage.functions.total) * 100);
    }
    if (coverage.branches.total > 0) {
      coverage.branches.percentage = Math.round((coverage.branches.covered / coverage.branches.total) * 100);
    }

    return coverage;
  }

  /**
   * Расчет общего показателя здоровья
   */
  calculateHealthScore(validationResults) {
    if (validationResults.length === 0) return 0;

    const validModules = validationResults.filter(r => r.valid).length;
    const totalModules = validationResults.length;
    
    return Math.round((validModules / totalModules) * 100);
  }

  /**
   * Добавление в историю тестов
   */
  addToHistory(type, result, success) {
    const entry = {
      type,
      result,
      success,
      timestamp: new Date().toISOString()
    };

    this.testHistory.push(entry);

    // Ограничиваем размер истории
    if (this.testHistory.length > 100) {
      this.testHistory = this.testHistory.slice(-50);
    }
  }

  getTools() {
    return [{
      name: 'test',
      description: 'Тестирование: run | list | status | coverage | validate | cleanup',
      inputSchema: {
        type: 'object',
        properties: {
          action: { 
            type: 'string', 
            enum: ['run', 'list', 'status', 'coverage', 'validate', 'cleanup'] 
          },
          type: { 
            type: 'string', 
            enum: ['unit', 'integration', 'all', 'specific'], 
            description: 'Тип тестов для запуска' 
          },
          pattern: { type: 'string', description: 'Паттерн для специфичных тестов' },
          timeout: { type: 'number', default: 300000, description: 'Таймаут в миллисекундах' },
          parallel: { type: 'boolean', default: false, description: 'Параллельное выполнение' },
          modules: { 
            type: 'array', 
            items: { type: 'string' }, 
            description: 'Модули для валидации' 
          }
        },
        required: ['action']
      }
    }];
  }
}

module.exports = { TestModule };


