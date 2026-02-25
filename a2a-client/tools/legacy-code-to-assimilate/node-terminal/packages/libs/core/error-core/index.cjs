/**
 * Unified Error Core Manager Library
 * Унифицированная библиотека для централизованного управления ошибками.
 * Объединяет функциональность сбора, агрегации, анализа ошибок и предоставления рецептов решений.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { LoggingUtils } = require('../../logging-monitoring/logging/index.cjs');
const errorClasses = require('./error-classes.cjs');

const DEFAULT_OPTIONS = {
  reportsDir: './reports/errors',
  maxErrorsPerPattern: 10,
  errorCooldown: 60000, // 1 minute
  cleanupInterval: 3600000, // 1 hour
  maxTaskAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  // Опции для ErrorHandler
  errorHandlerPatterns: { // Паттерны ошибок для анализа
    workspace_not_set: /Рабочая папка проекта не установлена/,
    security_block: /For security reasons/,
    timeout: /Type: Timeout/,
    command_not_found: /Type: Command not found/,
    permission_denied: /Type: Permission denied/,
    readonly_mode: /Readonly mode/,
    daemon_error: /daemon.*error/i,
    session_error: /session.*error/i
  },
  errorHandlerRecipes: { // Рецепты решений ошибок
    workspace_not_set: {
      priority: 1,
      description: 'Рабочая папка проекта не установлена',
      solutions: [
        { method: 'set_project_workspace', description: 'Установить рабочую папку через MCP инструмент', automatic: true },
        { method: 'diagnostics', description: 'Запустить диагностику системы', automatic: false },
      ],
      context: 'Эта ошибка возникает когда MCP сервер не знает рабочую папку проекта. Необходимо установить её перед выполнением команд.'
    },
    security_block: {
      priority: 2,
      description: 'Команда заблокирована системой безопасности',
      solutions: [
        { method: 'analyze_command', description: 'Проанализировать команду и предложить альтернативы', automatic: true },
        { method: 'whitelist_command', description: 'Добавить команду в белый список (если безопасно)', automatic: false },
      ],
      context: 'Система безопасности заблокировала потенциально опасную команду. Рассмотрите безопасные альтернативы.'
    },
    timeout: {
      priority: 3,
      description: 'Превышен таймаут выполнения команды (2 минуты)',
      solutions: [
        { method: 'increase_timeout', description: 'Увеличить таймаут для команды', automatic: true },
        { method: 'background_execution', description: 'Запустить команду в фоновом режиме (таймаут 10 минут)', automatic: true },
      ],
      context: 'Команда выполняется дольше установленного таймаута (2 минуты). Для длительных операций используйте timeout или is_background:true (10 минут).'
    },
    command_not_found: {
      priority: 4,
      description: 'Команда не найдена в системе',
      solutions: [
        { method: 'check_path', description: 'Проверить переменную PATH и установку команды', automatic: false },
        { method: 'install_command', description: 'Установить недостающую команду', automatic: false },
      ],
      context: 'Команда не установлена в системе или не находится в PATH. Проверьте установку и настройку.'
    },
    permission_denied: {
      priority: 5,
      description: 'Отказано в доступе к файлу или директории',
      solutions: [
        { method: 'check_permissions', description: 'Проверить права доступа к файлу/директории', automatic: false },
        { method: 'fix_permissions', description: 'Исправить права доступа', automatic: false },
      ],
      context: 'Недостаточно прав для выполнения операции. Проверьте права доступа и запустите с соответствующими привилегиями.'
    },
    readonly_mode: {
      priority: 6,
      description: 'Система в режиме только для чтения',
      solutions: [
        { method: 'check_mode', description: 'Проверить текущий режим работы', automatic: false },
        { method: 'switch_mode', description: 'Переключить в режим записи', automatic: false },
      ],
      context: 'Система работает в режиме только для чтения. Переключите в режим записи для выполнения операций.'
    },
    daemon_error: {
      priority: 7,
      description: 'Ошибка демона или фонового процесса',
      solutions: [
        { method: 'restart_daemon', description: 'Перезапустить демон', automatic: false },
        { method: 'check_logs', description: 'Проверить логи демона', automatic: false },
      ],
      context: 'Демон или фоновый процесс работает некорректно. Перезапустите и проверьте логи.'
    },
    session_error: {
      priority: 8,
      description: 'Ошибка сессии или состояния',
      solutions: [
        { method: 'reset_session', description: 'Сбросить состояние сессии', automatic: true },
        { method: 'create_new_session', description: 'Создать новую сессию', automatic: false },
      ],
      context: 'Сессия находится в некорректном состоянии. Сбросьте состояние или создайте новую сессию.'
    },
    unknown: { // Общий рецепт для неизвестных ошибок
      priority: 10,
      description: 'Неизвестная ошибка',
      solutions: [
        { method: 'general_diagnostics', description: 'Запустить общую диагностику', automatic: false },
        { method: 'check_documentation', description: 'Проверить документацию', automatic: false },
      ],
      context: 'Неизвестная ошибка. Проведите диагностику и проверьте документацию.'
    }
  }
};

class ErrorCoreManager {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.reportsDir = path.resolve(this.options.reportsDir);
    this.logger = options.logger || new LoggingUtils();

    // Для ErrorCollector
    this.errorCounts = {}; // { md5Hash: { count: N, lastTimestamp: Date } }
    this.errorTasks = {}; // { taskId: { errorData, timestamp, status, count } }
    this.cleanupTimer = null;

    // Для ErrorHandler
    this.errorPatterns = this.options.errorHandlerPatterns;
    this.errorRecipes = this.options.errorHandlerRecipes;
  }

  async initialize() {
    await fs.mkdir(this.reportsDir, { recursive: true });
    this.logger.info(`[ErrorCoreManager] Initialized. Error reports will be saved to: ${this.reportsDir}`);
    this._startCleanupTimer();
  }

  _startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => this.cleanupOldTasks(), this.options.cleanupInterval);
  }

  _generateMd5Hash(data) {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  }

  _getErrorReportPath(md5Hash) {
    return path.join(this.reportsDir, `${md5Hash}.json`);
  }

  // Методы ErrorCollector (будут перенесены)
  async collectError({ appId, error, context = {}, source = 'unknown', severity = 'medium', customCode = null }) {
    const errorData = {
      code: customCode || error.code || 'UNKNOWN_ERROR',
      title: error.message || 'Unknown Error',
      description: error.stack || error.message,
      appId,
      source,
      severity,
      timestamp: new Date().toISOString(),
      context: { ...context, hostname: process.env.HOSTNAME || 'unknown' }
    };

    const md5Hash = this._generateMd5Hash(errorData.description); // Hash based on description for grouping
    const errorReportPath = this._getErrorReportPath(md5Hash);

    // Rate limiting
    if (!this.errorCounts[md5Hash]) {
      this.errorCounts[md5Hash] = { count: 0, lastTimestamp: 0 };
    }

    const now = Date.now();
    if (this.errorCounts[md5Hash].count >= this.options.maxErrorsPerPattern &&
        (now - this.errorCounts[md5Hash].lastTimestamp < this.options.errorCooldown)) {
      this.logger.warn(`[ErrorCoreManager] Rate limited error (MD5: ${md5Hash}). Not collecting.`);
      return null; // Don't collect if rate limited
    }

    this.errorCounts[md5Hash].count++;
    this.errorCounts[md5Hash].lastTimestamp = now;

    try {
      // Check if this error report already exists (e.g., from a previous run or if not rate limited)
      let existingReport = {};
      try {
        const content = await fs.readFile(errorReportPath, 'utf8');
        existingReport = JSON.parse(content);
      } catch (readError) {
        // File might not exist, which is fine for the first report
      }

      const newReport = { ...existingReport, ...errorData };
      await fs.writeFile(errorReportPath, JSON.stringify(newReport, null, 2), 'utf8');
      this.logger.error(`[ErrorCoreManager] Collected error ${errorData.code} (${md5Hash}) for app ${appId}`);

      // Create/update error task
      const taskId = md5Hash; // Use MD5 hash as task ID for grouping similar errors
      if (!this.errorTasks[taskId]) {
        this.errorTasks[taskId] = {
          id: taskId,
          code: errorData.code,
          title: errorData.title,
          description: errorData.description,
          firstOccurred: errorData.timestamp,
          lastOccurred: errorData.timestamp,
          count: 1,
          status: 'open',
          severity: errorData.severity,
          appId: errorData.appId,
          source: errorData.source,
          context: errorData.context
        };
      } else {
        this.errorTasks[taskId].lastOccurred = errorData.timestamp;
        this.errorTasks[taskId].count++;
        this.errorTasks[taskId].severity = this._getHigherSeverity(this.errorTasks[taskId].severity, errorData.severity);
      }
      return newReport;
    } catch (fileError) {
      this.logger.error(`[ErrorCoreManager] Failed to write error report to file ${errorReportPath}: ${fileError.message}`);
      return null;
    }
  }

  _getHigherSeverity(severity1, severity2) {
    const severities = ['low', 'medium', 'high', 'critical'];
    return severities[Math.max(severities.indexOf(severity1), severities.indexOf(severity2))];
  }

  getErrorStats() {
    const stats = {
      totalErrors: Object.keys(this.errorTasks).length,
      bySeverity: {},
      byAppId: {},
      byCode: {}
    };

    for (const taskId in this.errorTasks) {
      const task = this.errorTasks[taskId];
      stats.bySeverity[task.severity] = (stats.bySeverity[task.severity] || 0) + 1;
      stats.byAppId[task.appId] = (stats.byAppId[task.appId] || 0) + 1;
      stats.byCode[task.code] = (stats.byCode[task.code] || 0) + 1;
    }
    return stats;
  }

  getOpenTasks() {
    return Object.values(this.errorTasks).filter(task => task.status === 'open');
  }

  async cleanupOldTasks() {
    const now = Date.now();
    const removedTasks = [];
    const tasksToRemove = [];

    for (const taskId in this.errorTasks) {
      const task = this.errorTasks[taskId];
      const lastOccurredTimestamp = new Date(task.lastOccurred).getTime();

      if (now - lastOccurredTimestamp > this.options.maxTaskAge) {
        tasksToRemove.push(taskId);
        removedTasks.push(task);
      }
    }

    for (const taskId of tasksToRemove) {
      delete this.errorTasks[taskId];
      const errorReportPath = this._getErrorReportPath(taskId);
      try {
        await fs.unlink(errorReportPath);
        this.logger.debug(`[ErrorCoreManager] Removed old error report file: ${errorReportPath}`);
      } catch (e) {
        if (e.code !== 'ENOENT') { // Ignore if file already doesn't exist
          this.logger.error(`[ErrorCoreManager] Failed to delete old error report file ${errorReportPath}: ${e.message}`);
        }
      }
    }
    this.logger.info(`[ErrorCoreManager] Cleaned up ${removedTasks.length} old error tasks.`);
    return { removedTasks: removedTasks.length, remainingTasks: Object.keys(this.errorTasks).length };
  }

  resetErrorCounts() {
    this.errorCounts = {};
    this.errorTasks = {};
    this.logger.info('[ErrorCoreManager] Error counts and tasks reset.');
  }

  addErrorPattern(code, pattern, options = {}) {
    // This method is for more advanced pattern matching, currently not implemented fully here.
    // GlobalErrorHandler might use this to define patterns for its errorCollector instance.
    this.logger.warn(`[ErrorCoreManager] addErrorPattern is not fully implemented in this version. Pattern: ${pattern}`);
  }

  // Методы ErrorHandler (будут перенесены)
  /**
   * Анализ ошибки и поиск рецепта решения
   */
  analyzeError(error) {
    const errorMessage = error.message || error.toString();
    const errorType = error.type || 'unknown';

    // Поиск по паттернам
    for (const [patternName, pattern] of Object.entries(this.errorPatterns)) {
      if (pattern.test(errorMessage)) {
        return {
          pattern: patternName,
          recipe: this.errorRecipes[patternName],
          error: errorMessage,
          type: errorType
        };
      }
    }

    // Поиск по типу ошибки
    for (const [recipeName, recipe] of Object.entries(this.errorRecipes)) {
      if (recipeName.includes(errorType.toLowerCase()) || 
          errorType.toLowerCase().includes(recipeName)) {
        return {
          pattern: recipeName,
          recipe: recipe,
          error: errorMessage,
          type: errorType
        };
      }
    }

    // Общий рецепт для неизвестных ошибок
    return {
      pattern: 'unknown',
      recipe: {
        priority: 10,
        description: 'Неизвестная ошибка',
        solutions: [
          { method: 'general_diagnostics', description: 'Запустить общую диагностику', automatic: false },
          { method: 'check_documentation', description: 'Проверить документацию', automatic: false },
        ],
        context: 'Неизвестная ошибка. Проведите диагностику и проверьте документацию.'
      },
      error: errorMessage,
      type: errorType
    };
  }

  /**
   * Получение рецепта решения по имени паттерна
   */
  getRecipe(patternName) {
    return this.errorRecipes[patternName] || null;
  }

  /**
   * Получение всех рецептов, отсортированных по приоритету
   */
  getAllRecipes() {
    return Object.entries(this.errorRecipes)
      .map(([name, recipe]) => ({ name, ...recipe }))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Добавление нового рецепта
   */
  addRecipe(patternName, recipe) {
    this.errorRecipes[patternName] = recipe;
  }

  /**
   * Добавление нового паттерна
   */
  addPattern(patternName, pattern) {
    this.errorPatterns[patternName] = pattern;
  }

  /**
   * Генерация отчета об ошибке с рецептами
   */
  generateErrorReport(error) {
    const analysis = this.analyzeError(error);
    
    return {
      timestamp: new Date().toISOString(),
      error: analysis.error,
      type: analysis.type,
      pattern: analysis.pattern,
      recipe: analysis.recipe,
      suggestions: analysis.recipe.solutions
        .filter(solution => solution.automatic)
        .map(solution => solution.method)
    };
  }

  /**
   * Единый метод для обработки и сбора ошибки
   * Этот метод будет объединять логику collectError и analyzeError
   */
  async handleError(error, context = {}, source = 'unknown', severity = 'medium', customCode = null) {
    // Логика сбора ошибки (как в collectError)
    const collectedError = await this.collectError({ appId: context.appId || 'unknown', error, context, source, severity, customCode });

    // Логика анализа ошибки (как в analyzeError)
    const analyzedError = this.analyzeError(error);

    // Здесь можно объединить результаты или предпринять дополнительные действия
    this.logger.error(`[ErrorCoreManager] Handled error: ${error.message}. Pattern: ${analyzedError.pattern}`);
    return { collectedError, analyzedError };
  }
}

// Экспорт ErrorCoreManager и всех классов ошибок
module.exports = {
  ErrorCoreManager,
  ...errorClasses
};
