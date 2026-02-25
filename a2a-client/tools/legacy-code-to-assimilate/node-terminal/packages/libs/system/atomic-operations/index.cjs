/**
 * Атомарные операции с файлами и каталогами
 * Поддерживает готовые наборы операций и атомарные действия
 */
const fs = require('fs').promises;
const path = require('path');
const { getCurrentDir } = require('C:/apps/libs/system/workdir/index.cjs');
const { defaultLogger } = require('../../logging-monitoring/logging');
const { unifiedConfigManager } = require('@libs/config-unified');
const { FileOperations } = require('../file-operations/index.cjs');

class AtomicOperations {
  constructor() {
    this.logger = defaultLogger;
    this.operationSets = new Map();
    this.setupOperationSets();
    this.unifiedConfigManager = unifiedConfigManager;
    this.fileOperations = new FileOperations({}, this.logger); // Pass logger to FileOperations
  }

  /**
   * Настройка готовых наборов операций
   */
  setupOperationSets() {
    // Набор для создания нового проекта
    this.operationSets.set('create_project', {
      description: 'Создает структуру нового проекта',
      operations: [
        { type: 'mkdir', path: 'src' },
        { type: 'mkdir', path: 'tests' },
        { type: 'mkdir', path: 'docs' },
        { type: 'mkdir', path: 'config' },
        { type: 'touch', path: 'README.md', content: '# Новый проект\n\nОписание проекта.' },
        { type: 'touch', path: 'package.json', content: '{\n  "name": "new-project",\n  "version": "1.0.0",\n  "description": "",\n  "main": "index.js",\n  "scripts": {\n    "test": "echo \\"Error: no test specified\\" && exit 1"\n  },\n  "keywords": [],\n  "author": "",\n  "license": "ISC"\n}' },
        { type: 'touch', path: '.gitignore', content: 'node_modules/\n.env\n.DS_Store\n*.log' }
      ]
    });

    // Набор для создания компонента Vue
    this.operationSets.set('create_vue_component', {
      description: 'Создает Vue компонент с базовой структурой',
      operations: [
        { type: 'mkdir', path: 'components' },
        { type: 'touch', path: 'components/ComponentName.vue', content: '<template>\n  <div class="component-name">\n    <!-- Содержимое компонента -->\n  </div>\n</template>\n\n<script>\nexport default {\n  name: \'ComponentName\',\n  data() {\n    return {\n      // данные компонента\n    }\n  },\n  methods: {\n    // методы компонента\n  }\n}\n</script>\n\n<style scoped>\n.component-name {\n  /* стили компонента */\n}\n</style>' }
      ]
    });

    // Набор для создания API структуры
    this.operationSets.set('create_api_structure', {
      description: 'Создает структуру для API',
      operations: [
        { type: 'mkdir', path: 'api' },
        { type: 'mkdir', path: 'api/controllers' },
        { type: 'mkdir', path: 'api/middleware' },
        { type: 'mkdir', path: 'api/routes' },
        { type: 'mkdir', path: 'api/models' },
        { type: 'touch', path: 'api/index.js', content: 'const express = require(\'express\');\nconst app = express();\n\napp.use(express.json());\n\n// Подключение маршрутов\n// app.use(\'/api\', require(\'./routes\'));\n\nmodule.exports = app;' },
        { type: 'touch', path: 'api/routes/index.js', content: 'const express = require(\'express\');\nconst router = express.Router();\n\n// Определение маршрутов\nrouter.get(\'/\', (req, res) => {\n  res.json({ message: \'API работает\' });\n});\n\nmodule.exports = router;' }
      ]
    });

    // Набор для очистки временных файлов
    this.operationSets.set('cleanup_temp', {
      description: 'Очищает временные файлы и папки',
      operations: [
        { type: 'remove_pattern', pattern: '*.tmp' },
        { type: 'remove_pattern', pattern: '*.log' },
        { type: 'remove_pattern', pattern: '.DS_Store' },
        { type: 'remove_dir_if_empty', path: 'tmp' },
        { type: 'remove_dir_if_empty', path: 'temp' }
      ]
    });

    // Набор для создания тестовой структуры
    this.operationSets.set('create_test_structure', {
      description: 'Создает структуру для тестирования',
      operations: [
        { type: 'mkdir', path: '__tests__' },
        { type: 'mkdir', path: '__tests__/unit' },
        { type: 'mkdir', path: '__tests__/integration' },
        { type: 'mkdir', path: '__tests__/e2e' },
        { type: 'touch', path: '__tests__/setup.js', content: '// Настройка тестового окружения\n\nbeforeAll(() => {\n  // Инициализация перед всеми тестами\n});\n\nafterAll(() => {\n  // Очистка после всех тестов\n});' },
        { type: 'touch', path: 'jest.config.js', content: 'module.exports = {\n  testEnvironment: \'node\',\n  setupFilesAfterEnv: [\'<rootDir>/__tests__/setup.js\'],\n  testMatch: [\n    \'<rootDir>/__tests__/**/*.test.js\'\n  ],\n  collectCoverageFrom: [\n    \'src/**/*.js\',\n    \'!src/**/*.test.js\'\n  ]\n};' }
      ]
    });
  }

  /**
   * Выполняет атомарную операцию
   */
  async executeAtomicOperation(operation, basePath = null) {
    const currentPath = basePath || getCurrentDir();
    
    try {
      const config = this.unifiedConfigManager.getFeatureConfig('settings').getConfig();
      const useUnifiedFileOps = config.featureFlags && config.featureFlags.USE_SYSTEM_FILE_OPS;

      // Basic path traversal validation before any file operations
      if (operation.path && this._isPathTraversal(operation.path, currentPath)) {
        throw new Error('Path traversal detected for operation.path');
      }
      if (operation.from && this._isPathTraversal(operation.from, currentPath)) {
        throw new Error('Path traversal detected for operation.from');
      }
      if (operation.to && this._isPathTraversal(operation.to, currentPath)) {
        throw new Error('Path traversal detected for operation.to');
      }

      let result;

      if (useUnifiedFileOps) {
        this.logger.debug(`[AtomicOperations] Using unified file operations for type: ${operation.type}`);
        const fullPath = path.join(currentPath, operation.path || '');
        const fromPath = path.join(currentPath, operation.from || '');
        const toPath = path.join(currentPath, operation.to || '');

        switch (operation.type) {
          case 'mkdir':
            result = await this.fileOperations.ensureDir(fullPath);
            break;
          case 'touch':
            result = await this.fileOperations.writeFile(fullPath, operation.content || '');
            break;
          case 'copy':
            result = await this.fileOperations.copyPath(fromPath, toPath);
            break;
          case 'move':
            result = await this.fileOperations.movePath(fromPath, toPath);
            break;
          case 'remove': // delete file
            result = await this.fileOperations.deletePath(fullPath);
            break;
          case 'remove_dir': // delete directory
            result = await this.fileOperations.deletePath(fullPath);
            break;
          case 'remove_pattern':
            result = await this.fileOperations.removeByPattern(currentPath, operation.pattern);
            break;
          case 'remove_dir_if_empty':
            result = await this.fileOperations.removeDirectoryIfEmpty(fullPath);
            break;
          case 'chmod':
            result = await this.fileOperations.changePermissions(fullPath, operation.mode);
            break;
          case 'symlink':
            result = await this.fileOperations.createSymlink(path.join(currentPath, operation.target || ''), path.join(currentPath, operation.link || '')); // target, link
            break;
          case 'write': // Direct write (equivalent to touch with content)
            result = await this.fileOperations.writeFile(fullPath, operation.content || '', { mode: 'append' });
            break;
          case 'append': // Append file (need to check if file-operations has this)
            // For now, assume writeFile can handle append if option is passed, or implement directly if not.
            // If FileOperations doesn't have a direct append, we need to add it or simulate.
            // As per previous plan, FileOperationsWrapper.cjs already has `options.mode === 'append'` in writeFile
            result = await this.fileOperations.writeFile(fullPath, operation.content || '', { mode: 'append' });
            break;
          default:
            throw new Error(`Неизвестный тип операции: ${operation.type}`);
        }

        if (result.success) {
          this.logger.info(`[AtomicOperations] Unified operation ${operation.type} performed successfully for path: ${operation.path || `${operation.from} -> ${operation.to}`}`);
          return { success: true, operation: operation.type, path: operation.path || `${operation.from} -> ${operation.to}`, message: `Операция ${operation.type} выполнена успешно (Unified)` };
        } else {
          this.logger.error(`[AtomicOperations] Unified operation ${operation.type} failed for path: ${operation.path || `${operation.from} -> ${operation.to}`}. Error: ${result.error}`);
          return { success: false, operation: operation.type, path: operation.path || `${operation.from} -> ${operation.to}`, error: result.error };
        }

      } else {
        this.logger.debug(`[AtomicOperations] Using legacy atomic operations for type: ${operation.type}`);
        switch (operation.type) {
          case 'mkdir':
            await this.createDirectory(path.join(currentPath, operation.path));
            break;

          case 'touch':
            await this.createFile(path.join(currentPath, operation.path), operation.content || '');
            break;

          case 'copy':
            await this.copyFile(
              path.join(currentPath, operation.from),
              path.join(currentPath, operation.to)
            );
            break;

          case 'move':
            await this.moveFile(
              path.join(currentPath, operation.from),
              path.join(currentPath, operation.to)
            );
            break;

          case 'remove':
            await this.removeFile(path.join(currentPath, operation.path));
            break;

          case 'remove_dir':
            await this.removeDirectory(path.join(currentPath, operation.path));
            break;

          case 'remove_pattern':
            await this.removeByPattern(currentPath, operation.pattern);
            break;

          case 'remove_dir_if_empty':
            await this.removeDirectoryIfEmpty(path.join(currentPath, operation.path));
            break;

          case 'chmod':
            await this.changePermissions(path.join(currentPath, operation.path), operation.mode);
            break;

          case 'symlink':
            await this.createSymlink(
              path.join(currentPath, operation.target),
              path.join(currentPath, operation.link)
            );
            break;

          default:
            throw new Error(`Неизвестный тип операции: ${operation.type}`);
        }

        this.logger.info(`[AtomicOperations] Legacy operation ${operation.type} performed successfully for path: ${operation.path || `${operation.from} -> ${operation.to}`}`);
        return {
          success: true,
          operation: operation,
          path: operation.path || `${operation.from} -> ${operation.to}`,
          message: `Операция ${operation.type} выполнена успешно`
        };
      }
    } catch (error) {
      let errorMessage = error.message;
      if (errorMessage.includes('Path traversal detected')) {
        errorMessage = 'Path traversal detected';
      }
      if (errorMessage.includes('Неизвестный тип операции')) {
        errorMessage = 'Неизвестный тип операции: ' + operation.type;
      }
      if (errorMessage.includes('Missing required field')) {
        errorMessage = 'Missing required field'; // Generic message for now
      }
      return {
        success: false,
        operation: operation,
        path: operation.path || `${operation.from} -> ${operation.to}`,
        error: errorMessage
      };
    }
  }

  /**
   * Выполняет набор операций атомарно
   */
  async executeOperationSet(setName, basePath = null) {
    const operationSet = this.operationSets.get(setName);
    if (!operationSet) {
      throw new Error(`Набор операций '${setName}' не найден`);
    }

    const results = [];
    const currentPath = basePath || getCurrentDir();

    for (const operation of operationSet.operations) {
      const result = await this.executeAtomicOperation(operation, currentPath);
      results.push(result);
      
      // Если операция не удалась, останавливаем выполнение
      if (!result.success) {
        break;
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return {
      setName,
      description: operationSet.description,
      total: totalCount,
      successful: successCount,
      failed: totalCount - successCount,
      results: results,
      operations: results, // Добавление свойства operations, указывающего на results
      allSuccessful: successCount === totalCount,
      success: successCount === totalCount // Добавление свойства success верхнего уровня
    };
  }

  /**
   * Выполняет пользовательский набор операций
   */
  async executeCustomOperations(operations, basePath = null, options = {}) {
    const results = [];
    const currentPath = basePath || getCurrentDir();

    for (const operation of operations) {
      const result = await this.executeAtomicOperation(operation, currentPath);
      results.push(result);

      if (options.stopOnError && !result.success) {
        this.logger.warn(`[AtomicOperations] Stopping execution due to stopOnError flag after failed operation: ${operation.type}`);
        break;
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return {
      total: totalCount,
      successful: successCount,
      failed: totalCount - successCount,
      results: results,
      operations: results, // Добавление свойства operations, указывающего на results
      allSuccessful: successCount === totalCount,
      success: successCount === totalCount // Добавление свойства success верхнего уровня
    };
  }

  /**
   * Получает список доступных наборов операций
   */
  getAvailableSets() {
    const sets = [];
    for (const [name, set] of this.operationSets) {
      sets.push({
        name,
        description: set.description,
        operationsCount: set.operations.length
      });
    }
    return sets;
  }

  /**
   * Получает детали набора операций
   */
  getSetDetails(setName) {
    const set = this.operationSets.get(setName);
    if (!set) {
      return null;
    }
    
    return {
      name: setName,
      description: set.description,
      operations: set.operations.map(op => ({
        type: op.type,
        path: op.path || `${op.from} -> ${op.to}`,
        description: this.getOperationDescription(op.type)
      }))
    };
  }

  /**
   * Получает описание типа операции
   */
  getOperationDescription(type) {
    const descriptions = {
      'mkdir': 'Создать директорию',
      'touch': 'Создать файл',
      'copy': 'Копировать файл',
      'move': 'Переместить файл',
      'remove': 'Удалить файл',
      'remove_dir': 'Удалить директорию',
      'remove_pattern': 'Удалить по шаблону',
      'remove_dir_if_empty': 'Удалить пустую директорию',
      'chmod': 'Изменить права доступа',
      'symlink': 'Создать символическую ссылку'
    };
    
    return descriptions[type] || 'Неизвестная операция';
  }

  // Приватные методы для выполнения операций

  /**
   * Проверяет путь на наличие обхода директории.
   * @param {string} inputPath - Проверяемый путь.
   * @param {string} basePath - Базовый путь, относительно которого проверяется inputPath.
   * @returns {boolean} true, если обход директории обнаружен, иначе false.
   */
  _isPathTraversal(inputPath, basePath) {
    const resolvedPath = path.resolve(basePath, inputPath);
    return !resolvedPath.startsWith(basePath);
  }

  async createDirectory(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async createFile(filePath, content) {
    await fs.writeFile(filePath, content, 'utf8');
  }

  async copyFile(from, to) {
    await fs.copyFile(from, to);
  }

  async moveFile(from, to) {
    await fs.rename(from, to);
  }

  async removeFile(filePath) {
    await fs.unlink(filePath);
  }

  async removeDirectory(dirPath) {
    await fs.rm(dirPath, { recursive: true });
  }

  async removeByPattern(basePath, pattern) {
    const files = await fs.readdir(basePath);
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const file of files) {
      if (regex.test(file)) {
        const filePath = path.join(basePath, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          await this.removeDirectory(filePath);
        } else {
          await this.removeFile(filePath);
        }
      }
    }
  }

  async removeDirectoryIfEmpty(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      if (files.length === 0) {
        await fs.rm(dirPath);
      }
    } catch (error) {
      // Игнорируем ошибки при удалении пустых директорий
    }
  }

  async changePermissions(filePath, mode) {
    await fs.chmod(filePath, mode);
  }

  async createSymlink(target, link) {
    await fs.symlink(target, link);
  }
}

// Создаем глобальный экземпляр
const atomicOperations = new AtomicOperations();

module.exports = {
  AtomicOperations,
  atomicOperations
};

