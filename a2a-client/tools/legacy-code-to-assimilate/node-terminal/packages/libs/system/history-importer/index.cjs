/**
 * @fileoverview Импорт истории команд из других проектов
 * Перенаправляет всю историю команд в текущий MCP Terminal проект
 * @author MCP Terminal Team
 * @version 1.0.0
 */
const { validationUtils } = require('@libs/validation/validation/validation-utils.cjs');
const fileUtilsFactory = require('@libs/system/file-operations/index.cjs');
const fileSystemUtils = fileUtilsFactory(console, require('@libs/system/path-utils/index.js').default);
const { errorUtils } = require('@libs/error-management/error-handler/error-utils.cjs');
const fs = require('fs');
const path = require('path');
const { persistHistoryRecord, createAndSwitchSession } = require('C:/apps/libs/system/history/index.cjs');
const { debugSystem, DEBUG_CATEGORIES } = require('C:/apps/root/mcp/node-terminal/mcp/DebugSystem.cjs');

/**
 * Класс для импорта истории команд
 */
class HistoryImporter {
  constructor() {
    this.importedCount = 0;
    this.errors = [];
  }

  /**
   * Импорт истории из указанной директории
   */
  async importFromDirectory(sourceDir, options = {}) {
    const {
      createNewSession = true,
      sessionName = 'imported_history',
      filterPattern = null,
      maxRecords = null
    } = options;

    try {
      debugSystem.log(DEBUG_CATEGORIES.HISTORY, `Starting history import from: ${sourceDir}`);

      // Создаем новую сессию для импортированной истории
      let sessionId;
      if (createNewSession) {
        sessionId = createAndSwitchSession(sessionName);
        debugSystem.log(DEBUG_CATEGORIES.HISTORY, `Created new session: ${sessionId}`);
      }

      // Ищем файлы истории
      const historyFiles = this.findHistoryFiles(sourceDir);
      debugSystem.log(DEBUG_CATEGORIES.HISTORY, `Found ${historyFiles.length} history files`);

      let totalImported = 0;
      for (const file of historyFiles) {
        const imported = await this.importFromFile(file, {
          sessionId,
          filterPattern,
          maxRecords
        });
        totalImported += imported;
      }

      this.importedCount = totalImported;
      
      debugSystem.log(DEBUG_CATEGORIES.HISTORY, `Import completed. Total records: ${totalImported}`);
      
      return {
        success: true,
        importedCount: totalImported,
        sessionId,
        errors: this.errors
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        importedCount: this.importedCount,
        errors: this.errors
      };
    }
  }

  /**
   * Поиск файлов истории в директории
   */
  findHistoryFiles(dir) {
    const historyFiles = [];
    
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = fileSystemUtils.join(dir, item.name);
        
        if (item.isDirectory()) {
          // Рекурсивно ищем в поддиректориях
          const subFiles = this.findHistoryFiles(fullPath);
          historyFiles.push(...subFiles);
        } else if (this.isHistoryFile(item.name)) {
          historyFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.error('Error finding history files:', error.message);
    }

    return historyFiles;
  }

  /**
   * Проверка, является ли файл файлом истории
   */
  isHistoryFile(filename) {
    const historyPatterns = [
      /session\.log\.jsonl$/,
      /\.jsonl$/,
      /history\.log$/,
      /commands\.log$/,
      /terminal\.log$/
    ];

    return historyPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Импорт истории из файла
   */
  async importFromFile(filePath, options = {}) {
    const { sessionId, filterPattern, maxRecords } = options;
    
    try {
      debugSystem.log(DEBUG_CATEGORIES.HISTORY, `Importing from file: ${filePath}`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      let importedCount = 0;
      let processedCount = 0;
      
      for (const line of lines) {
        if (maxRecords && processedCount >= maxRecords) break;
        
        try {
          const record = JSON.parse(line);
          
          // Фильтрация по паттерну
          if (filterPattern && !this.matchesFilter(record, filterPattern)) {
            continue;
          }
          
          // Нормализация записи
          const normalizedRecord = this.normalizeRecord(record, sessionId);
          
          // Сохранение в историю
          await persistHistoryRecord(normalizedRecord);
          importedCount++;
          processedCount++;
        } catch (parseError) {
          console.error('Error parsing line:', parseError.message);
        }
      }
      
      debugSystem.log(DEBUG_CATEGORIES.HISTORY, `Imported ${importedCount} records from ${filePath}`);
      return importedCount;
    } catch (error) {
      console.error('Error importing from file:', error.message);
      return 0;
    }
  }

  /**
   * Проверка соответствия записи фильтру
   */
  matchesFilter(record, filterPattern) {
    if (validationUtils.isString(filterPattern)) {
      const command = record.command || '';
      return command.toLowerCase().includes(filterPattern.toLowerCase());
    }
    
    if (validationUtils.isFunction(filterPattern)) {
      return filterPattern(record);
    }
    
    if (filterPattern instanceof RegExp) {
      const command = record.command || '';
      return filterPattern.test(command);
    }
    
    return true;
  }

  /**
   * Нормализация записи истории
   */
  normalizeRecord(record, sessionId) {
    const normalized = {
      timestamp: record.timestamp || new Date().toISOString(),
      command: record.command || '',
      success: record.success !== undefined ? record.success : true,
      return_code: record.return_code || 0,
      duration: record.duration || '0',
      stdout: record.stdout || '',
      stderr: record.stderr || '',
      cwd: record.cwd || process.cwd(),
      platform: record.platform || process.platform,
      reason: record.reason || 'imported',
      error_type: record.error_type || 'success',
      imported: true,
      source_file: record.source_file || 'unknown'
    };

    // Если указан sessionId, используем его
    if (sessionId) {
      normalized.session_id = sessionId;
    }

    return normalized;
  }

  /**
   * Импорт истории из конкретного проекта (например, C:\apps)
   */
  async importFromProject(projectPath, options = {}) {
    const defaultOptions = {
      createNewSession: true,
      sessionName: `imported_${path.basename(projectPath)}`,
      filterPattern: null,
      maxRecords: null,
      recursive: true
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    return await this.importFromDirectory(projectPath, finalOptions);
  }

  /**
   * Получение статистики импорта
   */
  getImportStats() {
    return {
      importedCount: this.importedCount,
      errors: this.errors,
      errorCount: this.errors.length
    };
  }

  /**
   * Очистка ошибок
   */
  clearErrors() {
    this.errors = [];
  }
}

// Создание экземпляра
const historyImporter = new HistoryImporter();

module.exports = {
  HistoryImporter,
  historyImporter
};
