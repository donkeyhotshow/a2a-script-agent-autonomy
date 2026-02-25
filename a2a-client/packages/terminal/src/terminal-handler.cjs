// Terminal Handler - main handler with pre-processing and post-processing
// Настройка module-alias для корректной работы с путями
require('../setup-module-alias.cjs');

const path = require('path');
const {
    resolvePathCore,
    analyzeDirectoryChangeCore,
    shouldPersistHistoryCore,
    checkHistoryLimitCore
} = require('./terminal-handler-core.cjs');
const { CommandExecutor } = require('../lib/command-executor-wrapper.cjs');
const { commandConverter, CommandConverter } = require('../mcp/command-converter.cjs');
const { 
    persistHistoryRecord, 
    getCurrentSessionId 
} = require('../lib/history-adapter.cjs');

// Fallback функции для зависимостей, которые могут отсутствовать
function getCurrentDirSync() {
    try {
        return process.cwd();
    } catch {
        return 'C:\\';
    }
}

async function getCurrentDir() {
    return getCurrentDirSync();
}

// Простой анализатор команд для безопасности (без внешних зависимостей)
function analyzeCommand(command) {
    if (!command || typeof command !== 'string') {
        return { blocked: false };
    }
    
    const cmd = command.toLowerCase().trim();
    
    // Список потенциально опасных команд
    const dangerousPatterns = [
        'rm -rf /',
        'format',
        'del /f /s /q',
        'rmdir /s /q',
        'shutdown',
        'taskkill',
        'net user',
        'reg delete',
        'attrib -r -s -h'
    ];
    
    for (const pattern of dangerousPatterns) {
        if (cmd.includes(pattern.toLowerCase())) {
            return { 
                blocked: true, 
                reason: `Command contains potentially dangerous pattern: ${pattern}` 
            };
        }
    }
    
    return { blocked: false };
}

// Валидация параметров выполнения
function validateExecRunParams(args) {
    const errors = [];
    
    if (!args) {
        return { isValid: true, errors: [] };
    }
    
    if (args.command && typeof args.command !== 'string') {
        errors.push('command must be a string');
    }
    
    if (args.timeout !== undefined) {
        const timeout = Number(args.timeout);
        if (Number.isNaN(timeout) || timeout < 1 || timeout > 1200) {
            errors.push('timeout must be between 1 and 1200 seconds');
        }
    }
    
    return { isValid: errors.length === 0, errors };
}

// Метрики (заглушки)
function recordCommandMetric() {}
function recordSecurityMetric() {}

class TerminalHandler {
    constructor(server) {
        this.server = server;
        this.commandExecutor = new CommandExecutor(
            server && server.logger ? server.logger : console,
            server && server.errorHandler ? server.errorHandler : null
        );
        
        // Ключи для хранения сессионных переменных директории
        this.SESSION_CWD_KEY = 'terminal_session_cwd';
        this.SESSION_DIR_STACK_KEY = 'terminal_dir_stack';
        this.INITIAL_CWD_KEY = 'terminal_initial_cwd';
        this.HISTORY_COUNT_KEY = 'terminal_history_count';
        this.CWD_CHANGE_TRACKER_KEY = 'terminal_cwd_change_tracker';
        
        // Сессионные данные (в памяти)
        this._sessionData = {};
    }

    // Вспомогательная функция для формирования ответа
    _textResponse(id, s) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: s }] } };
    }

    // Получение текущей рабочей директории сессии
    _getSessionCwd() {
        return this._sessionData[this.SESSION_CWD_KEY] || null;
    }

    // Установка рабочей директории сессии
    _setSessionCwd(cwd) {
        this._sessionData[this.SESSION_CWD_KEY] = cwd;
    }

    // Получение стека директорий для pushd/popd
    _getDirStack() {
        return this._sessionData[this.SESSION_DIR_STACK_KEY] || [];
    }

    // Установка стека директорий
    _setDirStack(stack) {
        this._sessionData[this.SESSION_DIR_STACK_KEY] = stack;
    }

    // Получение изначальной директории
    _getInitialCwd() {
        return this._sessionData[this.INITIAL_CWD_KEY] || null;
    }

    // Установка изначальной директории
    _setInitialCwd(cwd) {
        this._sessionData[this.INITIAL_CWD_KEY] = cwd;
    }

    // Получение счетчика истории
    _getHistoryCount() {
        return this._sessionData[this.HISTORY_COUNT_KEY] || 0;
    }

    // Инкремент счетчика истории
    _incrementHistoryCount() {
        this._sessionData[this.HISTORY_COUNT_KEY] = this._getHistoryCount() + 1;
    }

    // Проверка, нужно ли сохранять историю для текущей директории
    _shouldPersistHistory(currentCwd) {
        try {
            const terminalConfig = this.server && this.server.mcpConfig && this.server.mcpConfig.terminal;
            const initialCwd = this._getInitialCwd();
            return shouldPersistHistoryCore(terminalConfig, initialCwd, currentCwd);
        } catch (error) {
            return true;
        }
    }

    // Проверка лимита истории
    _checkHistoryLimit() {
        try {
            const terminalConfig = this.server && this.server.mcpConfig && this.server.mcpConfig.terminal;
            const currentCount = this._getHistoryCount();
            return checkHistoryLimitCore(terminalConfig, currentCount);
        } catch (error) {
            return true;
        }
    }

    // Анализ команды на предмет смены директории
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

    // Разрешение относительного пути
    _resolvePath(targetPath, currentCwd) {
        return resolvePathCore(targetPath, currentCwd, () => getCurrentDirSync());
    }

    // Унифицированный логгер ошибок
    _logFatal(context, error, extra = {}) {
        try {
            if (this.server && this.server.logger) {
                this.server.logger.error(`${context}: ${error.message}`, {
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    ...extra
                });
            } else {
                console.error(`${context}: ${error.message}`);
                console.error(error.stack);
            }
        } catch (e) {
            console.error('Error while logging fatal error', e);
        }
    }

    // Перехват команд, меняющих директорию
    async _interceptDirectoryCommand(command, id, timeout, isBackground, resolvedCwd) {
        const currentSessionCwd = this._getSessionCwd();

        // Инициализируем изначальную директорию при первой команде
        if (!this._getInitialCwd()) {
            const initialCwd = currentSessionCwd || resolvedCwd || getCurrentDirSync();
            this._setInitialCwd(initialCwd);
        }

        // Обработка команды pwd
        if (command.trim().toLowerCase() === 'pwd') {
            const currentDir = resolvedCwd || currentSessionCwd || getCurrentDirSync();
            return this._textResponse(id, `📁 Текущая директория: ${currentDir}`);
        }

        // Разбираем команду и анализируем только первую часть
        const firstCommand = command.split(';')[0].trim();
        const newPath = this._analyzeDirectoryChange(firstCommand, currentSessionCwd);

        if (newPath !== null) {
            try {
                const fs = require('fs');
                if (!fs.existsSync(newPath)) {
                    return this._textResponse(id, `Error: Directory '${newPath}' does not exist`);
                }

                this._setSessionCwd(newPath);

                if (this.server && this.server.logger) {
                    this.server.logger.info(`Directory changed to: ${newPath}`);
                }

                // Сохраняем в историю
                await this._persistHistory({
                    command: command,
                    success: true,
                    stdout: `Directory changed to: ${newPath}`,
                    stderr: '',
                    return_code: 0,
                    cwd: currentSessionCwd
                });

                return this._textResponse(id, `Directory changed to: ${newPath}`);
            } catch (error) {
                this._logFatal('[TERMINAL] Directory change error', error);
                return this._textResponse(id, `Error changing directory: ${error.message}`);
            }
        }

        return null;
    }

    // Сохранение в историю
    async _persistHistory(record) {
        try {
            const shouldPersist = this._shouldPersistHistory(record.cwd || getCurrentDirSync());
            const withinLimit = this._checkHistoryLimit();

            if (shouldPersist && withinLimit) {
                persistHistoryRecord({
                    timestamp: new Date().toISOString(),
                    command: record.command,
                    success: record.success,
                    stdout: record.stdout || '',
                    stderr: record.stderr || '',
                    return_code: record.return_code || 0,
                    duration: record.duration || '0',
                    cwd: record.cwd || getCurrentDirSync(),
                    platform: process.platform,
                    session_id: getCurrentSessionId()
                });
                this._incrementHistoryCount();
            }
        } catch (histErr) {
            // Игнорируем ошибки истории
        }
    }

    // Выполнение терминальной команды
    async _executeTerminalCommand(id, command, timeout, isBackground, resolvedCwd) {
        const startTime = Date.now();

        // Перехват команд смены директории
        if (!command.includes(';')) {
            const interceptedResult = await this._interceptDirectoryCommand(command, id, timeout, isBackground, resolvedCwd);
            if (interceptedResult !== null) {
                return interceptedResult;
            }
        }

        // Определяем рабочую директорию
        const sessionCwd = this._getSessionCwd();
        const effectiveCwd = resolvedCwd || sessionCwd || getCurrentDirSync();

        if (this.server && this.server.logger) {
            this.server.logger.info(`Executing command: ${command}`, {
                timeout,
                isBackground,
                cwd: effectiveCwd
            });
        }

        try {
            const result = await this.commandExecutor.runCommand(command, timeout, isBackground, effectiveCwd);

            const duration = Date.now() - startTime;
            const exitCode = result.return_code || result.exitCode || 0;
            
            // Сохраняем в историю
            await this._persistHistory({
                command: command,
                success: exitCode === 0,
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                return_code: exitCode,
                duration: duration.toString(),
                cwd: effectiveCwd
            });

            // Метрики
            recordCommandMetric(true, duration, false);
            recordSecurityMetric('allow', { command, duration });

            // Формируем ответ
            let response = `OK (dur=${duration}, code=${exitCode})`;
            if (result.stdout) {
                response += `\n${result.stdout}`;
            }
            if (result.stderr) {
                response += `\n${result.stderr}`;
            }

            return this._textResponse(id, response);
        } catch (runErr) {
            const duration = Date.now() - startTime;
            this._logFatal('[TERMINAL] Command failed', runErr, { command });

            // Сохраняем неудачу в историю
            await this._persistHistory({
                command: command,
                success: false,
                stdout: '',
                stderr: runErr.message,
                return_code: runErr.exitCode || 1,
                duration: duration.toString(),
                cwd: effectiveCwd
            });

            recordCommandMetric(false, duration, true);
            recordSecurityMetric('error', { command, error: runErr.message });

            return this._textResponse(id, `ERROR (dur=${duration}, code=${runErr.exitCode || 1}): ${runErr.message}`);
        }
    }

    /**
     * Основной метод обработки терминальной команды
     */
    async handleTerminalTool(id, args) {
        if (this.server && this.server.logger) {
            this.server.logger.debug('handleTerminalTool received raw args:', JSON.stringify(args));
        }

        try {
            const command = String(args.command || '').trim();
            const timeout = Number(args.timeout || 120);
            const isBackground = !!args.is_background;
            const resolvedCwd = args.cwd || null;

            // Инициализируем изначальную директорию
            if (!this._getInitialCwd()) {
                const sessionCwd = this._getSessionCwd();
                const initialCwd = sessionCwd || getCurrentDirSync();
                this._setInitialCwd(initialCwd);
            }

            // Базовые валидации
            if (!command) {
                return this._textResponse(id, 'Error: Command is required');
            }

            if (Number.isNaN(timeout) || timeout < 1 || timeout > 1200) {
                return this._textResponse(id, 'Error: Timeout must be between 1 and 1200 seconds');
            }

            // Валидация параметров
            if (validateExecRunParams) {
                const validation = validateExecRunParams(args);
                if (!validation.isValid) {
                    return this._textResponse(id, 'Parameter validation failed:\n' + validation.errors.join('\n'));
                }
            }

            // Проверка на эмулированные команды
            if (CommandConverter.isEmulatedCommand(command)) {
                const conversion = commandConverter.convertToMCPTool(command);
                if (conversion) {
                    // Обработка эмулированной команды
                    return this._textResponse(id, `Emulated command: ${conversion.action}/${conversion.subAction}`);
                }
            }

            // Security analysis (предобработка)
            const securityAnalysis = analyzeCommand(command);
            if (securityAnalysis && securityAnalysis.blocked) {
                recordSecurityMetric('block', { command, reason: securityAnalysis.reason });
                return this._textResponse(id, `Security block: ${securityAnalysis.reason}`);
            }

            // Выполнение команды
            return await this._executeTerminalCommand(id, command, timeout, isBackground, resolvedCwd);

        } catch (fatalError) {
            this._logFatal('[TERMINAL] Fatal error in handleTerminalTool', fatalError);
            return this._textResponse(id, `Terminal tool fatal error: ${fatalError.message}`);
        }
    }

    /**
     * Обработка структурированного действия (history, workspace, mode)
     */
    async handleStructuredTerminalAction(id, args) {
        try {
            const action = args.action;
            const subAction = args.subAction;

            switch (action) {
                case 'history':
                    if (subAction === 'list') {
                        return this._textResponse(id, 'History sessions: (not implemented in standalone mode)');
                    } else if (subAction === 'show') {
                        return this._textResponse(id, 'History: (not implemented in standalone mode)');
                    } else if (subAction === 'current') {
                        return this._textResponse(id, `Current session: ${getCurrentSessionId() || 'none'}`);
                    }
                    return this._textResponse(id, `Error: Unknown subAction for history: ${subAction}`);

                case 'workspace':
                    if (subAction === 'set') {
                        const workspacePath = args.path || args.workspace;
                        if (!workspacePath) {
                            return this._textResponse(id, 'Error: Workspace path is required');
                        }
                        this._setSessionCwd(workspacePath);
                        return this._textResponse(id, `✅ Workspace set to: ${workspacePath}`);
                    } else if (subAction === 'get') {
                        const workspace = this._getSessionCwd() || getCurrentDirSync();
                        return this._textResponse(id, `🏠 Current workspace: ${workspace}`);
                    }
                    return this._textResponse(id, `Error: Unknown subAction for workspace: ${subAction}`);

                case 'pwd':
                    const currentDir = this._getSessionCwd() || getCurrentDirSync();
                    return this._textResponse(id, `📁 Current directory: ${currentDir}`);

                case 'mode':
                    return this._textResponse(id, 'Mode operations: (not implemented in standalone mode)');

                case 'session':
                    if (subAction === 'cwd') {
                        const sessionCwd = this._getSessionCwd();
                        return this._textResponse(id, sessionCwd ? `Session CWD: ${sessionCwd}` : 'Session CWD not set');
                    } else if (subAction === 'reset') {
                        this._setSessionCwd(null);
                        this._setDirStack([]);
                        return this._textResponse(id, 'Session directory state reset');
                    } else if (subAction === 'info') {
                        const info = {
                            sessionCwd: this._getSessionCwd() || 'not set',
                            dirStackLength: this._getDirStack().length,
                            systemCwd: getCurrentDirSync()
                        };
                        return this._textResponse(id, JSON.stringify(info, null, 2));
                    }
                    return this._textResponse(id, `Error: Unknown subAction for session: ${subAction}`);

                default:
                    return this._textResponse(id, `Unknown structured action: ${action}`);
            }
        } catch (error) {
            this._logFatal('[TERMINAL] Structured action error', error);
            return this._textResponse(id, `Structured action error: ${error.message}`);
        }
    }

    terminalHelp() {
        return 'terminal - terminal handler with command execution, history, and workspace support';
    }
}

module.exports = { TerminalHandler };
