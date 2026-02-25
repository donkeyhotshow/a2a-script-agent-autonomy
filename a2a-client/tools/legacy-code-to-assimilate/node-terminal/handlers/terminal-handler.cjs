// Настройка module-alias для корректной работы с путями
require('../setup-module-alias.cjs');

const path = require('path');
const {
    resolvePathCore,
    analyzeDirectoryChangeCore,
    shouldPersistHistoryCore,
    checkHistoryLimitCore
} = require('./terminal-handler-core.cjs');
const {consoleUtils} = require('@libs/logging-monitoring/logging/console-utils.js');
const {getCurrentDirSync, getCurrentDir} = require('@libs/app-framework/system-utils/workdir-utils/index.cjs');
const {
    listSessions,
    loadSessionRecords,
    getCurrentSessionId,
    setCurrentSessionId,
    createAndSwitchSession,
    persistHistoryRecord
} = require('../lib/history-adapter.cjs');
const {historyImporter} = require('@libs/system/history-importer/index.cjs');
const {syntaxFixer} = require('@libs/system/syntax-fixer/index.cjs');
const {
    listModes,
    getMode,
    setMode,
    setFlags,
    isReadonly,
    isReadonlyAllowed
} = require('@libs/system/runtime-mode/index.cjs');
const {sessionVars} = require('@libs/system/session-vars/index.cjs');
// Import CommandConverter from local module (always use local - @libs version doesn't have isEmulatedCommand)
let CommandConverter, commandConverter;
try {
  // Always use local module - it has isEmulatedCommand method
  const localConverter = require('../mcp/CommandConverter.cjs');
  CommandConverter = localConverter.CommandConverter;
  commandConverter = localConverter.commandConverter;
  
  // Verify isEmulatedCommand exists
  if (typeof CommandConverter.isEmulatedCommand !== 'function') {
    throw new Error('CommandConverter.isEmulatedCommand is not a function');
  }
} catch (localError) {
  // If local module fails, try @libs but warn about missing method
  try {
    const converterModule = require('@libs/system/command-converter/index.cjs');
    CommandConverter = converterModule.CommandConverter;
    commandConverter = converterModule.commandConverter || new CommandConverter();
    
    // Add isEmulatedCommand stub if missing
    if (typeof CommandConverter.isEmulatedCommand !== 'function') {
      CommandConverter.isEmulatedCommand = () => false;
    }
    console.error('[TERMINAL-HANDLER-WARN] Using @libs CommandConverter without isEmulatedCommand, using stub');
  } catch (libError) {
    // Final fallback - create minimal stub
    CommandConverter = class {
      static isEmulatedCommand() { return false; }
      static listEmulatedCommands() { return []; }
    };
    commandConverter = { isEmulatedCommand: () => false, convertToMCPTool: () => null };
    console.error('[TERMINAL-HANDLER-ERROR] CommandConverter not found, using minimal stub');
  }
}
const {analyzeCommand} = require('@libs/system/security-mask/index.cjs');

// Import analytics with fallback
let recordCommandMetric, recordSecurityMetric;
try {
  const analyticsModule = require('@libs/system/analytics-engine/index.cjs');
  recordCommandMetric = analyticsModule.recordCommandMetric || (() => {});
  recordSecurityMetric = analyticsModule.recordSecurityMetric || (() => {});
} catch (analyticsError) {
  // Fallback - no-op functions
  recordCommandMetric = () => {};
  recordSecurityMetric = () => {};
}

const {validateExecRunParams} = require('@libs/system/command-validation/index.cjs');
// validateAndResolveCwd будет доступен через this.server.validateAndResolveCwd
const {handleJestProxy} = require('@libs/system/jest-proxy/index.cjs');
// Import validationUtils with fallback
let validationUtils;
try {
  const validationModule = require('@libs/validation/validation/validation-utils.cjs');
  validationUtils = validationModule.validationUtils || validationModule;
  if (!validationUtils || typeof validationUtils !== 'object') {
    throw new Error('validation-utils.cjs did not export validationUtils object');
  }
} catch (validationError) {
  // Fallback - basic validation functions
  console.error('[TERMINAL-HANDLER-WARN] validation-utils.cjs not found or invalid:', validationError.message);
  validationUtils = {
    validate: () => ({ isValid: true, errors: [] }),
    isString: (val) => typeof val === 'string',
    isNumber: (val) => typeof val === 'number',
    isArray: (val) => Array.isArray(val),
    isFunction: (val) => typeof val === 'function'
  };
}

// Подключаем PathUtils для унифицированной работы с путями
const {default: PathUtils} = require('@libs/system/path-utils/index.js');
const pathUtils = new PathUtils(consoleUtils);

class TerminalHandler {
    constructor(server) {
        this.server = server;
        // Ключи для хранения сессионных переменных директории
        this.SESSION_CWD_KEY = 'terminal_session_cwd';
        this.SESSION_DIR_STACK_KEY = 'terminal_dir_stack';
        this.INITIAL_CWD_KEY = 'terminal_initial_cwd';
        this.HISTORY_COUNT_KEY = 'terminal_history_count';
        this.CWD_CHANGE_TRACKER_KEY = 'terminal_cwd_change_tracker';
    }

    // Вспомогательная функция для формирования ответа
    _textResponse(id, s) {
        return {jsonrpc: '2.0', id, result: {content: [{type: 'text', text: s}]}};
    }

    /**
     * Получение текущей рабочей директории сессии
     */
    _getSessionCwd() {
        const sessionCwd = sessionVars.get(this.SESSION_CWD_KEY);
        return sessionCwd.exists ? sessionCwd.value : null;
    }

    /**
     * Установка рабочей директории сессии
     */
    _setSessionCwd(cwd) {
        return sessionVars.set(this.SESSION_CWD_KEY, cwd);
    }

    /**
     * Получение стека директорий для pushd/popd
     */
    _getDirStack() {
        const stack = sessionVars.get(this.SESSION_DIR_STACK_KEY);
        return stack.exists ? stack.value : [];
    }

    /**
     * Установка стека директорий
     */
    _setDirStack(stack) {
        return sessionVars.set(this.SESSION_DIR_STACK_KEY, stack);
    }

    /**
     * Получение изначальной директории
     */
    _getInitialCwd() {
        const initialCwd = sessionVars.get(this.INITIAL_CWD_KEY);
        return initialCwd.exists ? initialCwd.value : null;
    }

    /**
     * Установка изначальной директории
     */
    _setInitialCwd(cwd) {
        return sessionVars.set(this.INITIAL_CWD_KEY, cwd);
    }

    /**
     * Получение трекера изменений CWD
     */
    _getCwdChangeTracker() {
        const tracker = sessionVars.get(this.CWD_CHANGE_TRACKER_KEY);
        return tracker.exists ? tracker.value : {lastCwd: null, commandCount: 0, notificationShown: false};
    }

    /**
     * Установка трекера изменений CWD
     */
    _setCwdChangeTracker(tracker) {
        return sessionVars.set(this.CWD_CHANGE_TRACKER_KEY, tracker);
    }

    /**
     * Проверка необходимости уведомления об изменении CWD
     */
    _shouldNotifyCwdChange() {
        try {
            const terminalConfig = this.server && this.server.mcpConfig && this.server.mcpConfig.terminal;
            const cwdConfig = terminalConfig && terminalConfig.cwd;
            return cwdConfig ? cwdConfig.trackCwdChanges !== false : false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Получение порога для уведомления об изменении CWD
     */
    _getNotifyAfterCount() {
        try {
            const terminalConfig = this.server && this.server.mcpConfig && this.server.mcpConfig.terminal;
            const cwdConfig = terminalConfig && terminalConfig.cwd;
            return cwdConfig && cwdConfig.notifyCwdChangeAfter ? cwdConfig.notifyCwdChangeAfter : 3;
        } catch (error) {
            return 3;
        }
    }

    /**
     * Обновление трекера изменений CWD и уведомление если нужно
     */
    _updateCwdChangeTracker(currentCwd) {
        if (!this._shouldNotifyCwdChange()) {
            return null; // Уведомления отключены
        }

        const tracker = this._getCwdChangeTracker();
        const notifyAfter = this._getNotifyAfterCount();

        // Если CWD изменился, сбрасываем счетчик
        if (tracker.lastCwd !== currentCwd) {
            tracker.lastCwd = currentCwd;
            tracker.commandCount = 1;
            tracker.notificationShown = false;
            this._setCwdChangeTracker(tracker);
            return null; // Не показываем уведомление при первом изменении
        }

        // Инкрементируем счетчик команд в текущей директории
        tracker.commandCount++;

        // Проверяем нужно ли показать уведомление
        if (tracker.commandCount >= notifyAfter && !tracker.notificationShown) {
            tracker.notificationShown = true;
            this._setCwdChangeTracker(tracker);
            return `💡 Подсказка: Вы работаете в директории ${currentCwd} уже ${tracker.commandCount} команд подряд. Используйте 'cd' для смены директории.`;
        }

        this._setCwdChangeTracker(tracker);
        return null;
    }

    /**
     * Проверка, нужно ли сохранять историю для текущей директории
     */
    _shouldPersistHistory(currentCwd) {
        try {
            const terminalConfig = this.server && this.server.mcpConfig && this.server.mcpConfig.terminal;
            const initialCwd = this._getInitialCwd();
            return shouldPersistHistoryCore(terminalConfig, initialCwd, currentCwd);
        } catch (error) {
            this._logFatal('[TERMINAL] Error checking history persistence', error);
            return true; // В случае ошибки сохраняем историю
        }
    }

    /**
     * Проверка лимита истории
     */
    _checkHistoryLimit() {
        try {
            const terminalConfig = this.server && this.server.mcpConfig && this.server.mcpConfig.terminal;
            const historyCount = sessionVars.get(this.HISTORY_COUNT_KEY);
            const currentCount = historyCount.exists ? historyCount.value : 0;
            return checkHistoryLimitCore(terminalConfig, currentCount);
        } catch (error) {
            this._logFatal('[TERMINAL] Error checking history limit', error);
            return true; // В случае ошибки разрешаем сохранение
        }
    }

    /**
     * Инкремент счетчика истории
     */
    _incrementHistoryCount() {
        try {
            const historyCount = sessionVars.get(this.HISTORY_COUNT_KEY);
            const currentCount = historyCount.exists ? historyCount.value : 0;
            sessionVars.set(this.HISTORY_COUNT_KEY, currentCount + 1);
        } catch (error) {
            this._logFatal('[TERMINAL] Error incrementing history count', error);
        }
    }

    /**
     * Анализ команды на предмет смены директории
     * Возвращает новый путь или null если команда не меняет директорию
     */
    _analyzeDirectoryChange(command, currentCwd) {
        return analyzeDirectoryChangeCore(
            command,
            currentCwd,
            (targetPath, cwd) => this._resolvePath(targetPath, cwd),
            () => this._getDirStack(),
            (stack) => this._setDirStack(stack),
            () => getCurrentDirSync()
        );
    }

    /**
     * Разрешение относительного пути относительно текущей директории
     */
    _resolvePath(targetPath, currentCwd) {
        return resolvePathCore(targetPath, currentCwd, () => getCurrentDirSync());
    }

    /**
     * Перехват команд, которые меняют директорию
     * Возвращает true если команда была перехвачена и обработана
     */
    async _interceptDirectoryCommand(command, id, timeout, isBackground, resolvedCwd) {
        // Всегда используем актуальную сессионную директорию
        const currentSessionCwd = this._getSessionCwd();

        // Инициализируем изначальную директорию при первой команде
        if (!this._getInitialCwd()) {
            const initialCwd = currentSessionCwd || resolvedCwd || getCurrentDirSync();
            this._setInitialCwd(initialCwd);
        }

        // Обработка команды pwd
        if (command.trim().toLowerCase() === 'pwd') {
            try {
                // Приоритет: resolvedCwd (рабочая директория клиента) > WORKSPACE_ROOT (env) > сессионная директория > рабочая директория проекта > системная директория
                const sessionCwd = currentSessionCwd;
                const systemCwd = getCurrentDirSync();
                const projectWorkspace = sessionVars.hasProjectWorkspace() ? sessionVars.getProjectWorkspace() : null;
                
                // resolvedCwd - это рабочая директория клиента (workspace root), переданная через args.cwd
                // Также проверяем переменную окружения WORKSPACE_ROOT
                const clientWorkspace = resolvedCwd || process.env.WORKSPACE_ROOT || null;
                
                // Логируем для диагностики
                if (this.server && this.server.logger) {
                    this.server.logger.debug(`[TERMINAL] pwd - resolvedCwd: ${resolvedCwd}, WORKSPACE_ROOT: ${process.env.WORKSPACE_ROOT}, sessionCwd: ${sessionCwd}, systemCwd: ${systemCwd}`);
                }

                // Если есть рабочая директория клиента, используем её как основную
                const currentDir = clientWorkspace || sessionCwd || projectWorkspace || systemCwd;

                // Создаем подробный ответ
                let response = `📁 Текущая директория: ${currentDir}`;

                // Добавляем дополнительную информацию
                if (clientWorkspace && clientWorkspace !== currentDir) {
                    response += `\n🎯 Рабочая директория клиента: ${clientWorkspace}`;
                }
                
                if (sessionCwd && sessionCwd !== currentDir) {
                    response += `\n🔄 Сессионная директория: ${sessionCwd}`;
                }

                if (projectWorkspace && projectWorkspace !== currentDir && projectWorkspace !== clientWorkspace) {
                    response += `\n🏠 Рабочая директория проекта: ${projectWorkspace}`;
                }

                if (systemCwd !== currentDir && systemCwd !== clientWorkspace) {
                    response += `\n💻 Системная директория: ${systemCwd}`;
                }

                return this._textResponse(id, response);
            } catch (error) {
                this._logFatal('[TERMINAL] Error getting current directory', error);
                return this._textResponse(id, `❌ Ошибка получения текущей директории: ${error.message}`);
            }
        }

        // Разбираем команду по точке с запятой и анализируем только первую часть
        const firstCommand = command.split(';')[0].trim();
        const newPath = this._analyzeDirectoryChange(firstCommand, currentSessionCwd);

        if (newPath !== null) {
            try {
                // Проверяем существование директории
                const fs = require('fs');
                if (!fs.existsSync(newPath)) {
                    return this._textResponse(id, `Error: Directory '${newPath}' does not exist`);
                }

                // Обновляем сессионную директорию
                this._setSessionCwd(newPath);

                this.server.logger.info(`Directory changed to: ${newPath}`, {
                    sessionId: getCurrentSessionId(),
                    previousDir: currentSessionCwd
                });

                // Сохраняем в историю
                await persistHistoryRecord({
                    timestamp: new Date().toISOString(),
                    command: command,
                    success: true,
                    stdout: `Directory changed to: ${newPath}`,
                    stderr: '',
                    return_code: 0,
                    duration: '0',
                    cwd: currentSessionCwd,
                    platform: process.platform,
                    session_id: getCurrentSessionId()
                });

                // Уведомляем об изменении директории
                let response = `Directory changed to: ${newPath}`;
                const cwdNotification = this._updateCwdChangeTracker(newPath);
                if (cwdNotification) {
                    response += `\n\n${cwdNotification}`;
                }

                return this._textResponse(id, response);

            } catch (error) {
                this._logFatal('[TERMINAL] Directory change error', error, {command, newPath});
                return this._textResponse(id, `Error changing directory: ${error.message}`);
            }
        }

        return null; // Команда не была перехвачена
    }

    // Унифицированный логгер ошибок внутри handler'а
    _logFatal(context, error, extra = {}) {
        try {
            if (this.server && this.server.logger) {
                this.server.logger.error(`${context}: ${error.message}`, Object.assign({
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                }, extra));
            } else {
                console.error(`${context}: ${error.message}`);
                console.error(error.stack);
            }
        } catch (e) {
            console.error('Error while logging fatal error', e);
        }
    }

    /**
     * Вспомогательный метод для выполнения команды и сохранения истории
     */
    async _executeTerminalCommand(id, command, timeout, isBackground, resolvedCwd) {
        const startTime = Date.now();

        // Если команда содержит точку с запятой, выполняем её целиком без перехвата
        // Это позволяет использовать синтаксис PowerShell: cd /path; ls
        if (!command.includes(';')) {
            // Для команд без точки с запятой проверяем перехват
            const interceptedResult = await this._interceptDirectoryCommand(command, id, timeout, isBackground, resolvedCwd);
            if (interceptedResult !== null) {
                return interceptedResult; // Команда была перехвачена и обработана
            }
        }

        // Определяем рабочую директорию для выполнения команды
        // Приоритет: resolvedCwd (рабочая директория клиента) > WORKSPACE_ROOT (env) > сессионная директория > системная директория
        const sessionCwd = this._getSessionCwd();
        const clientWorkspace = resolvedCwd || process.env.WORKSPACE_ROOT || null;
        const effectiveCwd = clientWorkspace || sessionCwd || getCurrentDirSync();

        this.server.logger.info(`Executing command: ${command}`, {
            timeout,
            isBackground,
            cwd: effectiveCwd,
            sessionCwd: sessionCwd,
            sessionId: getCurrentSessionId()
        });

        try {
            // runCommand возвращает child process, нужно обрабатывать события
            const result = await new Promise((resolve, reject) => {
                const child = this.server.commandExecutor.runCommand(command, timeout, isBackground, effectiveCwd);
                
                // Детальное логирование для диагностики
                this.server.logger.debug(`[TERMINAL] runCommand returned:`, {
                    type: typeof child,
                    isNull: child === null,
                    isUndefined: child === undefined,
                    hasThen: child && typeof child.then === 'function',
                    hasStdout: child && child.stdout !== undefined,
                    hasStderr: child && child.stderr !== undefined,
                    keys: child && typeof child === 'object' ? Object.keys(child) : []
                });
                
                if (!child) {
                    this.server.logger.error(`[TERMINAL] runCommand returned null/undefined for command: ${command}`);
                    reject(new Error('CommandExecutor.runCommand returned null or undefined'));
                    return;
                }

                // Проверяем, если это уже Promise (некоторые реализации могут возвращать Promise)
                if (child && typeof child.then === 'function') {
                    this.server.logger.debug(`[TERMINAL] runCommand returned Promise, awaiting...`);
                    child.then((resolved) => {
                        // Promise резолвится с объектом { success, stdout, stderr, return_code, ... }
                        this.server.logger.debug(`[TERMINAL] Promise resolved:`, {
                            hasStdout: resolved && resolved.stdout !== undefined,
                            hasStderr: resolved && resolved.stderr !== undefined,
                            stdoutLength: resolved && resolved.stdout ? resolved.stdout.length : 0,
                            stderrLength: resolved && resolved.stderr ? resolved.stderr.length : 0
                        });
                        resolve({
                            stdout: resolved?.stdout || '',
                            stderr: resolved?.stderr || '',
                            return_code: resolved?.return_code !== undefined ? resolved.return_code : (resolved?.exitCode !== undefined ? resolved.exitCode : 0),
                            exitCode: resolved?.return_code !== undefined ? resolved.return_code : (resolved?.exitCode !== undefined ? resolved.exitCode : 0),
                            output: resolved?.stdout || '', // Для совместимости
                            error: resolved?.stderr || ''   // Для совместимости
                        });
                    }).catch(reject);
                    return;
                }

                // Если это объект с stdout/stderr (уже обработанный результат)
                if (child.stdout === undefined && child.stderr === undefined && child.stdout !== null) {
                    // Это может быть уже готовый результат
                    if (typeof child === 'object' && ('stdout' in child || 'stderr' in child || 'output' in child)) {
                        this.server.logger.debug(`[TERMINAL] runCommand returned pre-processed result`);
                        resolve(child);
                        return;
                    }
                }

                // Обрабатываем child process
                let stdout = '';
                let stderr = '';
                let exitCode = 0;
                let stdoutReceived = false;
                let stderrReceived = false;

                if (child.stdout) {
                    child.stdout.on('data', (data) => {
                        const chunk = data.toString();
                        stdout += chunk;
                        stdoutReceived = true;
                        this.server.logger.debug(`[TERMINAL] stdout chunk (${chunk.length} bytes): ${chunk.substring(0, 100).replace(/\n/g, '\\n')}`);
                    });
                } else {
                    this.server.logger.warn(`[TERMINAL] child.stdout is null/undefined`);
                }

                if (child.stderr) {
                    child.stderr.on('data', (data) => {
                        const chunk = data.toString();
                        stderr += chunk;
                        stderrReceived = true;
                        this.server.logger.debug(`[TERMINAL] stderr chunk (${chunk.length} bytes): ${chunk.substring(0, 100).replace(/\n/g, '\\n')}`);
                    });
                } else {
                    this.server.logger.warn(`[TERMINAL] child.stderr is null/undefined`);
                }

                child.on('close', (code, signal) => {
                    exitCode = code !== null && code !== undefined ? code : 0;
                    this.server.logger.debug(`[TERMINAL] Command closed: code=${exitCode}, signal=${signal}, stdout=${stdout.length} chars (received=${stdoutReceived}), stderr=${stderr.length} chars (received=${stderrReceived})`);
                    if (stdout.length === 0 && stderr.length === 0) {
                        this.server.logger.warn(`[TERMINAL] WARNING: No stdout/stderr collected for command: ${command}`);
                    }
                    resolve({
                        stdout: stdout,
                        stderr: stderr,
                        return_code: exitCode,
                        exitCode: exitCode,
                        output: stdout, // Для совместимости
                        error: stderr   // Для совместимости
                    });
                });

                child.on('error', (error) => {
                    this.server.logger.error(`[TERMINAL] Command error: ${error.message}`, error);
                    reject(error);
                });
            });

            const duration = Date.now() - startTime;

            // Детальное логирование для отладки
            this.server.logger.debug(`[TERMINAL] Command result:`, {
                hasResult: !!result,
                resultType: typeof result,
                resultKeys: result ? Object.keys(result) : [],
                stdout: result?.stdout ? `[${result.stdout.length} chars]` : 'empty',
                stderr: result?.stderr ? `[${result.stderr.length} chars]` : 'empty',
                return_code: result?.return_code,
                exitCode: result?.exitCode,
                output: result?.output ? `[${result.output.length} chars]` : 'empty'
            });

            // Нормализуем результат - проверяем разные возможные форматы
            let stdout = '';
            let stderr = '';
            let exitCode = 0;

            if (result) {
                // Формат 1: { stdout, stderr, return_code/exitCode }
                if (result.stdout !== undefined) {
                    stdout = String(result.stdout || '');
                }
                if (result.stderr !== undefined) {
                    stderr = String(result.stderr || '');
                }
                exitCode = result.return_code !== undefined ? result.return_code : (result.exitCode !== undefined ? result.exitCode : 0);

                // Формат 2: { output, error, exitCode } (альтернативный формат)
                if (!stdout && result.output !== undefined) {
                    stdout = String(result.output || '');
                }
                if (!stderr && result.error !== undefined) {
                    stderr = String(result.error || '');
                }

                // Если результат - это строка (редкий случай)
                if (typeof result === 'string') {
                    stdout = result;
                }
            }

            // Логируем нормализованные значения
            this.server.logger.debug(`[TERMINAL] Normalized result:`, {
                stdoutLength: stdout.length,
                stderrLength: stderr.length,
                exitCode,
                stdoutPreview: stdout.substring(0, 100),
                stderrPreview: stderr.substring(0, 100)
            });

            // Persist history safely (с учетом настроек)
            try {
                const shouldPersist = this._shouldPersistHistory(effectiveCwd || getCurrentDirSync());
                const withinLimit = this._checkHistoryLimit();

                if (shouldPersist && withinLimit) {
                    await this.server.errorUtils.safeExecute(async () => {
                        persistHistoryRecord({
                            timestamp: new Date().toISOString(),
                            command: command,
                            success: exitCode === 0,
                            stdout: stdout,
                            stderr: stderr,
                            return_code: exitCode,
                            duration: duration.toString(),
                            cwd: effectiveCwd || getCurrentDirSync(),
                            platform: process.platform,
                            session_id: getCurrentSessionId()
                        });
                    }, 'terminal.persist_history');
                    this._incrementHistoryCount();
                } else if (!shouldPersist) {
                    this.server.logger.debug(`[TERMINAL] History persistence skipped for CWD: ${effectiveCwd || getCurrentDirSync()}`);
                } else if (!withinLimit) {
                    this.server.logger.debug(`[TERMINAL] History limit reached, skipping persistence`);
                }
            } catch (histErr) {
                this._logFatal('[TERMINAL] Failed to persist history after run', histErr, {command});
            }

            // Metrics and logging
            recordCommandMetric(true, duration, false);
            recordSecurityMetric('allow', {command, duration});

            // Получаем текущую сессионную директорию для уведомлений
            const currentSessionCwd = this._getSessionCwd() || resolvedCwd;
            const cwdNotification = this._updateCwdChangeTracker(currentSessionCwd);

            // Формируем ответ с нормализованными данными
            let response = `OK (dur=${duration}, code=${exitCode})`;
            if (stdout) {
                response += `\n${stdout}`;
            }
            if (stderr) {
                response += `${stdout ? '\n' : '\n'}${stderr}`;
            }

            // Добавляем уведомление об изменении CWD если нужно
            if (cwdNotification) {
                response += `\n\n${cwdNotification}`;
            }

            return this._textResponse(id, response);
        } catch (runErr) {
            const duration = Date.now() - startTime;
            this._logFatal('[TERMINAL] Command failed', runErr, {command, duration, cwd: effectiveCwd});

            // Persist failure to history if possible (с учетом настроек)
            try {
                const shouldPersist = this._shouldPersistHistory(effectiveCwd || getCurrentDirSync());
                const withinLimit = this._checkHistoryLimit();

                // Проверяем настройку persistFailedCommands
                const terminalConfig = this.server && this.server.mcpConfig && this.server.mcpConfig.terminal;
                const historyConfig = terminalConfig && terminalConfig.history;
                const persistFailed = historyConfig ? historyConfig.persistFailedCommands !== false : true;

                if (shouldPersist && withinLimit && persistFailed) {
                    await this.server.errorUtils.safeExecute(async () => {
                        persistHistoryRecord({
                            timestamp: new Date().toISOString(),
                            command: command,
                            success: false,
                            stdout: '',
                            stderr: runErr.message,
                            return_code: runErr.exitCode || 1,
                            duration: duration.toString(),
                            cwd: effectiveCwd || getCurrentDirSync(),
                            platform: process.platform,
                            session_id: getCurrentSessionId()
                        });
                    }, 'terminal.persist_failure');
                    this._incrementHistoryCount();
                } else if (!persistFailed) {
                    this.server.logger.debug(`[TERMINAL] Failed command persistence disabled in config`);
                } else if (!shouldPersist) {
                    this.server.logger.debug(`[TERMINAL] History persistence skipped for CWD: ${effectiveCwd || getCurrentDirSync()}`);
                } else if (!withinLimit) {
                    this.server.logger.debug(`[TERMINAL] History limit reached, skipping persistence`);
                }
            } catch (histErr) {
                this._logFatal('[TERMINAL] Failed to persist failure to history', histErr, {command});
            }

            recordCommandMetric(false, duration, true);
            recordSecurityMetric('error', {command, error: runErr.message});

            return this._textResponse(id, `ERROR (dur=${duration}, code=${runErr.exitCode || 1}): ${runErr.message}`);
        }
    }

    /**
     * Универсальный обработчик терминальных команд с полной функциональностью
     */
    async handleTerminalTool(id, args) {
        this.server.logger.debug('handleTerminalTool received raw args:', JSON.stringify(args));

        // Основной try/catch для всей логики
        try {
            // Проверки входных данных
            // args уже содержит аргументы команды напрямую

            const command = String(args.command || '').trim();

            // Инициализируем изначальную директорию при первой команде
            if (!this._getInitialCwd()) {
                const sessionCwd = this._getSessionCwd();
                const initialCwd = sessionCwd || getCurrentDirSync();
                this._setInitialCwd(initialCwd);
                this.server.logger.debug(`[TERMINAL] Initial CWD set to: ${initialCwd}`);
            }

            const timeout = Number(args.timeout || 120);
            const isBackground = !!args.is_background;

            this.server.logger.debug(`Parsed args - command: ${command}`);

            // Базовые валидации
            if (!command) {
                return this._textResponse(id, 'Error: Command is required');
            }

            if (Number.isNaN(timeout) || timeout < 1 || timeout > 1200) {
                return this._textResponse(id, 'Error: Timeout must be between 1 and 1200 seconds');
            }

            // Валидация параметров исполнения
            if (validateExecRunParams) {
                try {
                    const validation = validateExecRunParams(args);
                    if (validation && validation.errors && validation.errors.length > 0) {
                        return this._textResponse(id, 'Parameter validation failed:\n' + validation.errors.join('\n'));
                    }
                } catch (vErr) {
                    this._logFatal('[TERMINAL] Parameter validation failed', vErr, {args});
                    return this._textResponse(id, `Parameter validation error: ${vErr.message}`);
                }
            }

            // Получаем рабочую директорию
            // Приоритет: args.cwd (рабочая директория клиента) > WORKSPACE_ROOT (env) > getCurrentDir() (сессионная) > getCurrentDirSync() (системная)
            let resolvedCwd = null;
            if (args.cwd) {
                // Если клиент передал рабочую директорию, используем её (это workspace root клиента)
                resolvedCwd = args.cwd;
                this.server.logger.debug(`[TERMINAL] Using client workspace root from args.cwd: ${resolvedCwd}`);
            } else if (process.env.WORKSPACE_ROOT) {
                // Если есть переменная окружения WORKSPACE_ROOT, используем её (workspace root клиента)
                resolvedCwd = process.env.WORKSPACE_ROOT;
                this.server.logger.debug(`[TERMINAL] Using client workspace root from WORKSPACE_ROOT env: ${resolvedCwd}`);
            } else {
                // Иначе используем сессионную директорию
                try {
                    resolvedCwd = await getCurrentDir();
                } catch (gErr) {
                    this._logFatal('[TERMINAL] Get current directory error', gErr);
                    return this._textResponse(id, `Get current directory error: ${gErr.message}`);
                }
            }

            // Автоматическая установка workspace, если не установлен и есть resolvedCwd
            if (!sessionVars.hasProjectWorkspace() && resolvedCwd) {
                try {
                    sessionVars.setProjectWorkspace(resolvedCwd);
                    this.server.logger.debug(`[TERMINAL] Auto-set workspace from resolvedCwd: ${resolvedCwd}`);
                } catch (wsErr) {
                    this.server.logger.warn(`[TERMINAL] Failed to auto-set workspace: ${wsErr.message}`);
                }
            }

            this.server.logger.debug(`Checking if command is emulated: ${command}`);
            // Эмулированные команды (перенаправляем на соответствующие инструменты)
            if (CommandConverter.isEmulatedCommand(command)) {
                this.server.logger.debug('Command is emulated. Converting and dispatching.');
                try {
                    const conversion = commandConverter.convertToMCPTool(command);
                    if (conversion) {
                        const toolArgs = Object.assign({
                            action: conversion.action,
                            subAction: conversion.subAction
                        }, conversion.params);
                        this.server.logger.debug('Converted toolArgs:', toolArgs);
                        switch (conversion.tool) {
                            case 'terminal':
                                return await this.handleDirectTerminalCommand(id, toolArgs);
                            case 'file':
                                return await this.server.handleFileTool(id, toolArgs);
                            case 'search':
                                return await this.server.handleSearchTool(id, toolArgs);
                            case 'test':
                                return await this.server.handleTestTool(id, toolArgs);
                            case 'feedback':
                                return await this.server.handleFeedbackTool(id, toolArgs);
                            default:
                                return this._textResponse(id, 'Conversion error: unknown tool ' + conversion.tool);
                        }
                    }
                } catch (convErr) {
                    this._logFatal('[TERMINAL] Emulated command conversion error', convErr, {command});
                    this.server.logger.debug('Error in emulated command conversion catch block:', convErr.message);
                    return this._textResponse(id, `Conversion error: ${convErr.message}`);
                }
            }

            // Security analysis
            const securityAnalysis = analyzeCommand(command);
            if (securityAnalysis && securityAnalysis.blocked) {
                recordSecurityMetric('block', {command, reason: securityAnalysis.reason});
                return this._textResponse(id, `Security block: ${securityAnalysis.reason}`);
            }

            // Ensure workspace rules
            if (!command || typeof command !== 'string') {
                return this._textResponse(id, '❌ Error: Invalid command parameter. Command must be a non-empty string.');
            }

            // Проверка workspace смягчена: разрешаем выполнение команд, используя resolvedCwd как fallback
            // Команды workspace и эмулированные команды всегда разрешены
            const lc = command.trim().toLowerCase();
            const isWorkspaceCommand = (lc.includes('workspace') && lc.includes('set'));
            const hasWorkspace = sessionVars.hasProjectWorkspace();
            
            // Если workspace не установлен, но есть resolvedCwd, используем его как fallback
            // Это позволяет выполнять команды без явной установки workspace
            if (!hasWorkspace && !isWorkspaceCommand && !CommandConverter.isEmulatedCommand(command)) {
                // Если есть resolvedCwd, разрешаем выполнение (workspace будет установлен автоматически выше)
                if (resolvedCwd) {
                    this.server.logger.debug(`[TERMINAL] No workspace set, but using resolvedCwd as fallback: ${resolvedCwd}`);
                    // Продолжаем выполнение команды
                } else {
                    // Только если нет resolvedCwd, блокируем команду
                    recordSecurityMetric('block', {command, reason: 'no_project_workspace'});

                    const currentCwd = this._getSessionCwd() || getCurrentDirSync();
                    const baseMessage = `Рабочая директория не установлена. Выполните одну из команд для настройки:\n\n• Установить директорию: {"action": "workspace", "subAction": "set", "path": "C:/apps/project"}\n• Проверить текущую директорию: pwd\n• Сменить директорию: cd "путь/к/проекту" && pwd\n• Использовать текущую: {"action": "workspace", "subAction": "set", "path": "${currentCwd}"}\n\nРекомендуется: {"action": "workspace", "subAction": "set", "path": "${currentCwd}"}`;

                    const helpfulMessage = this.server && this.server._createCwdAwareMessage ?
                        this.server._createCwdAwareMessage(baseMessage) : baseMessage;

                    try {
                        await this.server.errorUtils.safeExecute(async () => {
                            persistHistoryRecord({
                                timestamp: new Date().toISOString(),
                                command,
                                success: false,
                                stdout: '',
                                stderr: helpfulMessage,
                                return_code: 403,
                                duration: '0',
                                cwd: currentCwd,
                                platform: process.platform,
                                session_id: getCurrentSessionId()
                            });
                        }, 'terminal.security_block');
                    } catch (persistErr) {
                        this._logFatal('[TERMINAL] Failed to persist history for security block', persistErr, {command});
                    }

                    return this._textResponse(id, helpfulMessage);
                }
            }

            // Execute command via commandExecutor
            return await this._executeTerminalCommand(id, command, timeout, isBackground, resolvedCwd);

        } catch (fatalError) {
            // Унифицированная фатальная обработка
            this._logFatal('[TERMINAL] Fatal error in handleTerminalTool', fatalError, {args});

            try {
                if (this.server && this.server.logger) {
                    this.server.logger.error('[TERMINAL] Fatal handler captured an error', {error: fatalError.stack});
                }
            } catch (e) {
                console.error('Failed to write fatal log', e);
            }

            return this._textResponse(id, `Terminal tool fatal error: ${fatalError.message}`);
        }
    }

    async handleDirectTerminalCommand(id, args) {
        // Если это структурированное действие, делегируем в handleStructuredTerminalAction
        if (args.action) {
            return await this.handleStructuredTerminalAction(id, args);
        }

        const {command, timeout = 120, isBackground = false, cwd} = args;
        
        // cwd - это рабочая директория клиента (workspace root), переданная от клиента
        // Также проверяем переменную окружения WORKSPACE_ROOT
        // Используем её как приоритет для всех команд, включая pwd
        const clientWorkspace = cwd || process.env.WORKSPACE_ROOT || null;
        
        // Логируем для диагностики
        if (this.server && this.server.logger) {
            this.server.logger.debug(`[TERMINAL] handleDirectTerminalCommand - cwd: ${cwd}, WORKSPACE_ROOT: ${process.env.WORKSPACE_ROOT}, clientWorkspace: ${clientWorkspace}`);
        }

        // Улучшенная обработка JSON команд для PowerShell
        let processedCommand = command;

        // Если команда выглядит как JSON, пытаемся её обработать
        if (command && typeof command === 'string' && command.trim().startsWith('{')) {
            try {
                const jsonCommand = JSON.parse(command);

                // Если это структурированное действие (workspace, batch, mode и т.д.), обрабатываем через handleStructuredTerminalAction
                if (jsonCommand.action && jsonCommand.action !== 'exec') {
                    this.server.logger.debug(`[TERMINAL] Detected structured JSON command: ${jsonCommand.action}`);
                    return await this.handleStructuredTerminalAction(id, jsonCommand);
                }

                // Обработка JSON команд в новой модульной архитектуре
                if (jsonCommand.action === 'exec' && jsonCommand.command) {
                    processedCommand = jsonCommand.command;
                    if (jsonCommand.workspace) {
                        // Добавляем смену директории перед командой
                        processedCommand = `cd "${jsonCommand.workspace}" && ${jsonCommand.command}`;
                    }
                }
            } catch (jsonError) {
                // Если JSON парсинг не удался, используем команду как есть
                this.server.logger.warn(`JSON parsing failed for command: ${jsonError.message}`);
            }
        }

        // Остальная логика остается без изменений
        // Приоритет: cwd (args) > WORKSPACE_ROOT (env) > системная директория
        const resolvedCwd = clientWorkspace || getCurrentDirSync();

        // Автоматическая установка workspace, если не установлен и есть resolvedCwd
        if (!sessionVars.hasProjectWorkspace() && resolvedCwd) {
            try {
                sessionVars.setProjectWorkspace(resolvedCwd);
                this.server.logger.debug(`[TERMINAL] Auto-set workspace from resolvedCwd: ${resolvedCwd}`);
            } catch (wsErr) {
                this.server.logger.warn(`[TERMINAL] Failed to auto-set workspace: ${wsErr.message}`);
            }
        }

        // Security analysis
        const securityAnalysis = analyzeCommand(processedCommand);
        if (securityAnalysis && securityAnalysis.blocked) {
            recordSecurityMetric('block', {command: processedCommand, reason: securityAnalysis.reason});
            return this._textResponse(id, `Security block: ${securityAnalysis.reason}`);
        }

        // Ensure workspace rules
        if (!processedCommand || typeof processedCommand !== 'string') {
            return this._textResponse(id, '❌ Error: Invalid command parameter. Command must be a non-empty string.');
        }

        // Проверка workspace смягчена: разрешаем выполнение команд, используя resolvedCwd как fallback
        const lc = processedCommand.trim().toLowerCase();
        const isWorkspaceCommand = (lc.includes('workspace') && lc.includes('set'));
        const hasWorkspace = sessionVars.hasProjectWorkspace();
        
        // Если workspace не установлен, но есть resolvedCwd, используем его как fallback
        if (!hasWorkspace && !isWorkspaceCommand && !CommandConverter.isEmulatedCommand(processedCommand)) {
            if (resolvedCwd) {
                this.server.logger.debug(`[TERMINAL] No workspace set, but using resolvedCwd as fallback: ${resolvedCwd}`);
                // Продолжаем выполнение команды
            } else {
                // Только если нет resolvedCwd, блокируем команду
                recordSecurityMetric('block', {command: processedCommand, reason: 'no_project_workspace'});

                const currentCwd = this._getSessionCwd() || getCurrentDirSync();
                const baseMessage = `Рабочая директория не установлена. Выполните одну из команд для настройки:\n\n• Установить директорию: {"action": "workspace", "subAction": "set", "path": "C:/apps/project"}\n• Проверить текущую директорию: pwd\n• Сменить директорию: cd "путь/к/проекту" && pwd\n• Использовать текущую: {"action": "workspace", "subAction": "set", "path": "${currentCwd}"}\n\nРекомендуется: {"action": "workspace", "subAction": "set", "path": "${currentCwd}"}`;

                const helpfulMessage = this.server && this.server._createCwdAwareMessage ?
                    this.server._createCwdAwareMessage(baseMessage) : baseMessage;

                try {
                    await this.server.errorUtils.safeExecute(async () => {
                        persistHistoryRecord({
                            timestamp: new Date().toISOString(),
                            command: processedCommand,
                            success: false,
                            stdout: '',
                            stderr: helpfulMessage,
                            return_code: 403,
                            duration: '0',
                            cwd: getCurrentDirSync(),
                            platform: process.platform,
                            session_id: getCurrentSessionId()
                        });
                    }, 'terminal.security_block');
                } catch (persistErr) {
                    this._logFatal('[TERMINAL] Failed to persist history for security block', persistErr, {command: processedCommand});
                }

                return this._textResponse(id, helpfulMessage);
            }
        }

        // Execute command via commandExecutor
        return await this._executeTerminalCommand(id, processedCommand, timeout, isBackground, resolvedCwd);
    }

    async handleStructuredTerminalAction(id, args) {
        try {
            const action = args.action;
            const subAction = args.subAction;

            this.server.logger.debug('handleStructuredTerminalAction args:', args);
            if (!action && !args.command) {
                return this._textResponse(id, 'Error: Action or command is required for structured terminal operations');
            }

            // Обработка различных действий
            switch (action) {
                case 'history':
                    if (subAction === 'list') {
                        const sessions = listSessions();
                        return this._textResponse(id, JSON.stringify(sessions, null, 2));
                    } else if (subAction === 'show') {
                        const sessionId = args.sessionId || getCurrentSessionId();
                        const limit = args.limit ? Number(args.limit) : null;
                        if (!sessionId) {
                            return this._textResponse(id, 'Error: Session ID not specified and no current session found.');
                        }
                        const records = loadSessionRecords(sessionId, limit);
                        return this._textResponse(id, JSON.stringify(records, null, 2));
                    } else if (subAction === 'current') {
                        const currentId = getCurrentSessionId();
                        return this._textResponse(id, currentId ? `Current session ID: ${currentId}` : 'No current session.');
                    } else {
                        this.server.logger.debug('Reached unknown subAction for history:', subAction);
                        return this._textResponse(id, `Error: Unknown subAction for history: ${subAction}. Use 'list', 'show [sessionId] [limit]' or 'current'.`);
                    }

                // atomic tool removed - functionality moved to propose system

                case 'file':
                    // Делегируем в file handler
                    if (this.server && this.server.handleFileTool) {
                        return await this.server.handleFileTool(id, args);
                    } else {
                        return this._textResponse(id, 'Error: File tool handler not available');
                    }

                case 'search':
                    // Делегируем в search handler
                    if (this.server && this.server.handleSearchTool) {
                        return await this.server.handleSearchTool(id, args);
                    } else {
                        return this._textResponse(id, 'Error: Search tool handler not available');
                    }

                case 'test':
                    // Делегируем в test handler
                    if (this.server && this.server.handleTestTool) {
                        return await this.server.handleTestTool(id, args);
                    } else {
                        return this._textResponse(id, 'Error: Test tool handler not available');
                    }

                case 'propose':
                    // Делегируем в propose handler
                    if (this.server && this.server.handleProposeTool) {
                        return await this.server.handleProposeTool(id, args);
                    } else {
                        return this._textResponse(id, 'Error: Propose tool handler not available');
                    }

                case 'workspace':
                    if (subAction === 'set') {
                        const workspacePath = args.path || args.workspace || args.command;
                        if (!workspacePath) {
                            const currentCwd = this._getSessionCwd() || getCurrentDirSync();
                            const helpfulMessage = `❌ Требуется путь к рабочей директории.\n\n💡 Используйте текущую директорию:\n{"action": "workspace", "subAction": "set", "path": "${currentCwd}"}\n\nИли укажите конкретный путь:\n{"action": "workspace", "subAction": "set", "path": "C:/path/to/workspace"}`;

                            // Создаем CWD-aware сообщение через сервер
                            const fullMessage = this.server && this.server._createCwdAwareMessage ?
                                this.server._createCwdAwareMessage(helpfulMessage) : helpfulMessage;

                            return this._textResponse(id, fullMessage);
                        }
                        try {
                            sessionVars.setProjectWorkspace(workspacePath);
                            const successMessage = `✅ Рабочая директория установлена: ${workspacePath}\n\n💡 Теперь вы можете выполнять команды терминала в этой директории.`;

                            // Создаем CWD-aware сообщение через сервер
                            const fullMessage = this.server && this.server._createCwdAwareMessage ?
                                this.server._createCwdAwareMessage(successMessage) : successMessage;

                            return this._textResponse(id, fullMessage);
                        } catch (setErr) {
                            this._logFatal('[TERMINAL] Error setting project workspace', setErr, {workspacePath});
                            return this._textResponse(id, `❌ Ошибка установки рабочей директории: ${setErr.message}`);
                        }
                    } else if (subAction === 'get') {
                        const currentWorkspace = sessionVars.getProjectWorkspace();
                        const response = currentWorkspace ?
                            `🏠 Текущая рабочая директория: ${currentWorkspace}` :
                            '❌ Рабочая директория не установлена.';

                        // Создаем CWD-aware сообщение через сервер
                        const fullMessage = this.server && this.server._createCwdAwareMessage ?
                            this.server._createCwdAwareMessage(response) : response;

                        return this._textResponse(id, fullMessage);
                    } else {
                        return this._textResponse(id, `❌ Неизвестное действие для workspace: ${subAction}.\n\n💡 Используйте:\n• {"action": "workspace", "subAction": "set", "path": "путь"}\n• {"action": "workspace", "subAction": "get"}`);
                    }

                case 'pwd':
                    try {
                        // Получаем информацию о директориях
                        // Приоритет: args.cwd (рабочая директория клиента) > WORKSPACE_ROOT (env) > сессионная директория > рабочая директория проекта > системная директория
                        const clientWorkspace = args.cwd || process.env.WORKSPACE_ROOT || null; // Рабочая директория клиента (workspace root)
                        const sessionCwd = this._getSessionCwd();
                        const systemCwd = getCurrentDirSync();
                        const projectWorkspace = sessionVars.hasProjectWorkspace() ? sessionVars.getProjectWorkspace() : null;
                        
                        // Если есть рабочая директория клиента, используем её как основную
                        const currentDir = clientWorkspace || sessionCwd || projectWorkspace || systemCwd;

                        // Создаем подробный ответ
                        let response = `📁 Текущая директория: ${currentDir}`;

                        // Добавляем дополнительную информацию
                        if (clientWorkspace && clientWorkspace !== currentDir) {
                            response += `\n🎯 Рабочая директория клиента: ${clientWorkspace}`;
                        }
                        
                        if (sessionCwd && sessionCwd !== currentDir) {
                            response += `\n🔄 Сессионная директория: ${sessionCwd}`;
                        }

                        if (projectWorkspace && projectWorkspace !== currentDir && projectWorkspace !== clientWorkspace) {
                            response += `\n🏠 Рабочая директория проекта: ${projectWorkspace}`;
                        }

                        if (systemCwd !== currentDir && systemCwd !== clientWorkspace) {
                            response += `\n💻 Системная директория: ${systemCwd}`;
                        }

                        // Создаем CWD-aware сообщение через сервер для подсказок
                        const fullResponse = this.server && this.server._createCwdAwareMessage ?
                            this.server._createCwdAwareMessage(response) : response;

                        return this._textResponse(id, fullResponse);
                    } catch (error) {
                        this._logFatal('[TERMINAL] Error getting current directory', error);
                        return this._textResponse(id, `❌ Ошибка получения текущей директории: ${error.message}`);
                    }

                case 'session':
                    if (subAction === 'cwd') {
                        const sessionCwd = this._getSessionCwd();
                        if (sessionCwd) {
                            return this._textResponse(id, `Session CWD: ${sessionCwd}`);
                        } else {
                            return this._textResponse(id, 'Session CWD not set');
                        }
                    } else if (subAction === 'reset') {
                        sessionVars.delete(this.SESSION_CWD_KEY);
                        sessionVars.delete(this.SESSION_DIR_STACK_KEY);
                        return this._textResponse(id, 'Session directory state reset');
                    } else if (subAction === 'info') {
                        const sessionCwd = this._getSessionCwd();
                        const dirStack = this._getDirStack();
                        const sessionId = getCurrentSessionId();
                        const info = {
                            sessionId: sessionId,
                            sessionCwd: sessionCwd || 'not set',
                            dirStackLength: dirStack.length,
                            systemCwd: getCurrentDirSync()
                        };
                        return this._textResponse(id, JSON.stringify(info, null, 2));
                    } else {
                        return this._textResponse(id, `Error: Unknown subAction for session: ${subAction}. Use 'cwd', 'reset' or 'info'.`);
                    }

                case 'mode':
                    if (subAction === 'set') {
                        const modeValue = args.mode || args.command;
                        if (!modeValue) {
                            return this._textResponse(id, 'Error: Mode is required for setting mode.');
                        }
                        try {
                            if (this.server && this.server.runtimeModeUtils && this.server.runtimeModeUtils.setMode) {
                                this.server.runtimeModeUtils.setMode(modeValue);
                                return this._textResponse(id, `Режим установлен: ${modeValue}`);
                            } else {
                                return this._textResponse(id, 'Error: Runtime mode utilities not available');
                            }
                        } catch (setErr) {
                            this._logFatal('[TERMINAL] Error setting mode', setErr, {modeValue});
                            return this._textResponse(id, `Error setting mode: ${setErr.message}`);
                        }
                    } else if (subAction === 'get') {
                        try {
                            if (this.server && this.server.runtimeModeUtils && this.server.runtimeModeUtils.getMode) {
                                const currentMode = this.server.runtimeModeUtils.getMode();
                                const modeString = typeof currentMode === 'object' ? currentMode.mode || currentMode.name || JSON.stringify(currentMode) : currentMode;
                                return this._textResponse(id, `Текущий режим: ${modeString}`);
                            } else {
                                return this._textResponse(id, 'Error: Runtime mode utilities not available');
                            }
                        } catch (getErr) {
                            this._logFatal('[TERMINAL] Error getting mode', getErr);
                            return this._textResponse(id, `Error getting mode: ${getErr.message}`);
                        }
                    } else {
                        return this._textResponse(id, `Error: Unknown subAction for mode: ${subAction}. Use 'set [mode]' or 'get'.`);
                    }

                default:
                    return this._textResponse(id, `Unknown structured action: ${action}`);
            }
        } catch (error) {
            this._logFatal('[TERMINAL] Structured action error', error, {args});
            return this._textResponse(id, `Structured action error: ${error.message}`);
        }
    }

    /**
     * Тестовый метод для проверки работы перехвата команд смены директории
     */
    async testDirectoryCommands(id) {
        const testResults = [];

        try {
            // Тест 1: Проверка начального состояния
            const initialCwd = this._getSessionCwd();
            testResults.push(`Initial session CWD: ${initialCwd || 'not set'}`);

            // Тест 2: Имитация команды cd
            const cdCommand = 'cd C:\\apps';
            const intercepted1 = await this._interceptDirectoryCommand(cdCommand, 'test-1', 30, false, 'C:\\');
            testResults.push(`CD command intercepted: ${intercepted1 ? 'YES' : 'NO'}`);
            if (intercepted1) {
                testResults.push(`CD result: ${intercepted1.result.content[0].text}`);
            }

            // Тест 3: Проверка новой сессионной директории
            const newCwd = this._getSessionCwd();
            testResults.push(`New session CWD: ${newCwd || 'not set'}`);

            // Тест 4: Имитация pushd
            const pushdCommand = 'pushd C:\\temp';
            const intercepted2 = await this._interceptDirectoryCommand(pushdCommand, 'test-2', 30, false, newCwd);
            testResults.push(`PUSHD command intercepted: ${intercepted2 ? 'YES' : 'NO'}`);
            if (intercepted2) {
                testResults.push(`PUSHD result: ${intercepted2.result.content[0].text}`);
            }

            // Тест 5: Проверка стека директорий
            const dirStack = this._getDirStack();
            testResults.push(`Directory stack length: ${dirStack.length}`);

            // Тест 6: Имитация popd
            const popdCommand = 'popd';
            const intercepted3 = await this._interceptDirectoryCommand(popdCommand, 'test-3', 30, false, this._getSessionCwd());
            testResults.push(`POPD command intercepted: ${intercepted3 ? 'YES' : 'NO'}`);
            if (intercepted3) {
                testResults.push(`POPD result: ${intercepted3.result.content[0].text}`);
            }

            // Тест 7: Финальное состояние
            const finalCwd = this._getSessionCwd();
            const finalStack = this._getDirStack();
            testResults.push(`Final session CWD: ${finalCwd || 'not set'}`);
            testResults.push(`Final stack length: ${finalStack.length}`);

            return this._textResponse(id, `Directory Commands Test Results:\n${testResults.join('\n')}`);

        } catch (error) {
            this._logFatal('[TERMINAL] Directory commands test failed', error);
            return this._textResponse(id, `Test failed: ${error.message}`);
        }
    }

    terminalHelp() {
        return 'terminal - универсальный терминал с поддержкой сессионной директории: см. документацию для списка действий';
    }
}

module.exports = {TerminalHandler};







