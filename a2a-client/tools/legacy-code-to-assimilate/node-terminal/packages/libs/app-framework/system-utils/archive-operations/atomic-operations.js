/**
 * @fileoverview Модуль для атомарных операций с файлами
 * Предоставляет готовые наборы операций и возможность создания пользовательских
 * @author MCP Team
 * @version 1.0.0
 */

import fs from 'fs-extra';
import path from 'path';
import writeFileAtomic from 'write-file-atomic';

/**
 * Класс для атомарных операций с файлами
 */
export class AtomicOperations {
  constructor() {
    this.operationSets = {
      create_project: {
        name: 'Создание базовой структуры проекта',
        description: 'Создает стандартную структуру папок для нового проекта',
        operations: [
          { type: 'mkdir', path: 'src' },
          { type: 'mkdir', path: 'tests' },
          { type: 'mkdir', path: 'docs' },
          { type: 'mkdir', path: 'dist' },
          { type: 'touch', path: 'README.md', content: '# Новый проект\n\nОписание проекта...' },
          { type: 'touch', path: 'package.json', content: '{"name": "new-project","version": "1.0.0"}' }
        ]
      },
      create_test_structure: {
        name: 'Создание структуры для тестирования',
        description: 'Создает папки для различных типов тестов',
        operations: [
          { type: 'mkdir', path: 'tests/unit' },
          { type: 'mkdir', path: 'tests/integration' },
          { type: 'mkdir', path: 'tests/e2e' },
          { type: 'mkdir', path: 'tests/setup' },
          { type: 'touch', path: 'tests/README.md', content: '# Тесты\n\nСтруктура тестов проекта.' }
        ]
      },
      backup_config: {
        name: 'Резервное копирование конфигурации',
        description: 'Создает резервную копию конфигурационных файлов',
        operations: [
          { type: 'mkdir', path: 'backup' },
          { type: 'copy', from: 'package.json', to: 'backup/package.json.backup' },
          { type: 'copy', from: 'tsconfig.json', to: 'backup/tsconfig.json.backup' }
        ]
      },
      create_archive_structure: {
        name: 'Создание структуры для архивирования',
        description: 'Создает папки для работы с архивами',
        operations: [
          { type: 'mkdir', path: 'archives' },
          { type: 'mkdir', path: 'archives/temp' },
          { type: 'mkdir', path: 'archives/backup' },
          { type: 'mkdir', path: 'archives/export' },
          { type: 'touch', path: 'archives/README.md', content: '# Архивы\n\nСтруктура для работы с архивами.' }
        ]
      }
    };
    
    this.statistics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      lastExecution: null
    };
  }

  /**
   * Получить список доступных наборов операций
   * @returns {Array} Массив названий наборов
   */
  getAvailableSets() {
    return Object.keys(this.operationSets);
  }

  /**
   * Получить детали конкретного набора операций
   * @param {string} setName - Название набора
   * @returns {Object|null} Детали набора или null если не найден
   */
  getSetDetails(setName) {
    return this.operationSets[setName] || null;
  }

  /**
   * Выполнить готовый набор операций
   * @param {string} setName - Название набора
   * @param {string} basePath - Базовый путь для выполнения операций
   * @returns {Promise<Object>} Результат выполнения
   */
  async executeSet(setName, basePath = '.') {
    const set = this.operationSets[setName];
    if (!set) {
      throw new Error(`Набор операций "${setName}" не найден`);
    }
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const operation of set.operations) {
      try {
        const result = await this.executeAtomicOperation(operation, basePath);
        results.push({ ...result, operation });
        successCount++;
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          operation 
        });
        errorCount++;
      }
    }
    
    this.statistics.totalOperations += set.operations.length;
    this.statistics.successfulOperations += successCount;
    this.statistics.failedOperations += errorCount;
    this.statistics.lastExecution = new Date();
    
    return {
      success: errorCount === 0,
      setName,
      basePath,
      operations: set.operations,
      results,
      summary: {
        total: set.operations.length,
        successful: successCount,
        failed: errorCount
      },
      message: `Набор "${setName}" выполнен: ${successCount}/${set.operations.length} операций успешно`
    };
  }

  /**
   * Выполнить пользовательский набор операций
   * @param {Array} operations - Массив операций для выполнения
   * @param {string} basePath - Базовый путь для выполнения операций
   * @returns {Promise<Object>} Результат выполнения
   */
  async executeCustomOperations(operations, basePath = '.') {
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const operation of operations) {
      try {
        const result = await this.executeAtomicOperation(operation, basePath);
        results.push({ ...result, operation });
        successCount++;
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          operation 
        });
        errorCount++;
      }
    }
    
    this.statistics.totalOperations += operations.length;
    this.statistics.successfulOperations += successCount;
    this.statistics.failedOperations += errorCount;
    this.statistics.lastExecution = new Date();
    
    return {
      success: errorCount === 0,
      basePath,
      operations,
      results,
      summary: {
        total: operations.length,
        successful: successCount,
        failed: errorCount
      },
      message: `Пользовательский набор выполнен: ${successCount}/${operations.length} операций успешно`
    };
  }

  /**
   * Выполнить одну атомарную операцию
   * @param {Object} operation - Операция для выполнения
   * @param {string} basePath - Базовый путь для выполнения операции
   * @returns {Promise<Object>} Результат выполнения
   */
  async executeAtomicOperation(operation, basePath = '.') {
    const validation = this.validateOperation(operation);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const { type, path: opPath, content, from, to } = operation;
    const fullPath = path.resolve(basePath, opPath);
    
    try {
      switch (type) {
        case 'mkdir':
          await fs.ensureDir(fullPath);
          break;
          
        case 'touch':
          if (content) {
            await writeFileAtomic(fullPath, content, { encoding: 'utf8' });
          } else {
            await fs.ensureFile(fullPath);
          }
          break;
          
        case 'copy':
          const fromPath = path.resolve(basePath, from);
          const toPath = path.resolve(basePath, to);
          await fs.ensureDir(path.dirname(toPath));
          await fs.copy(fromPath, toPath);
          break;
          
        case 'move':
          const moveFromPath = path.resolve(basePath, from);
          const moveToPath = path.resolve(basePath, to);
          await fs.ensureDir(path.dirname(moveToPath));
          await fs.move(moveFromPath, moveToPath);
          break;
          
        case 'remove_file':
          await fs.remove(fullPath);
          break;
          
        case 'remove_dir':
          await fs.remove(fullPath);
          break;
          
        case 'write':
          await writeFileAtomic(fullPath, content, { encoding: 'utf8' });
          break;
          
        case 'append':
          await fs.appendFile(fullPath, content, { encoding: 'utf8' });
          break;
          
        default:
          throw new Error(`Неизвестный тип операции: ${type}`);
      }
      
      return {
        success: true,
        operation,
        basePath,
        fullPath,
        message: `Операция ${type} выполнена успешно`
      };
      
    } catch (error) {
      throw new Error(`Ошибка выполнения операции ${type}: ${error.message}`);
    }
  }

  /**
   * Валидация операции перед выполнением
   * @param {Object} operation - Операция для валидации
   * @returns {Object} Результат валидации
   */
  validateOperation(operation) {
    const { type, path: opPath, content, from, to } = operation;
    
    if (!type) {
      return { valid: false, error: 'Тип операции не указан' };
    }
    
    if (!opPath && !from) {
      return { valid: false, error: 'Путь не указан' };
    }
    
    // Проверка специфичных требований для разных типов операций
    switch (type) {
      case 'copy':
      case 'move':
        if (!from || !to) {
          return { valid: false, error: 'Для операций copy/move требуются параметры from и to' };
        }
        break;
        
      case 'touch':
      case 'write':
        if (content === undefined) {
          return { valid: false, error: 'Для операций touch/write требуется параметр content' };
        }
        break;
    }
    
    return { valid: true };
  }

  /**
   * Получить статистику по выполненным операциям
   * @returns {Object} Статистика
   */
  getStatistics() {
    return { ...this.statistics };
  }

  /**
   * Очистить статистику
   */
  clearStatistics() {
    this.statistics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      lastExecution: null
    };
  }

  /**
   * Добавить новый набор операций
   * @param {string} name - Название набора
   * @param {Object} set - Описание набора
   */
  addOperationSet(name, set) {
    if (!set.name || !set.description || !set.operations) {
      throw new Error('Набор операций должен содержать name, description и operations');
    }
    
    this.operationSets[name] = set;
  }

  /**
   * Удалить набор операций
   * @param {string} name - Название набора
   */
  removeOperationSet(name) {
    if (this.operationSets[name]) {
      delete this.operationSets[name];
    }
  }

  /**
   * Получить список всех доступных типов операций
   * @returns {Array} Список типов операций
   */
  getAvailableOperationTypes() {
    return [
      'mkdir',
      'touch', 
      'copy',
      'move',
      'remove_file',
      'remove_dir',
      'write',
      'append'
    ];
  }
}

// Экспорт экземпляра класса по умолчанию
export default new AtomicOperations();
