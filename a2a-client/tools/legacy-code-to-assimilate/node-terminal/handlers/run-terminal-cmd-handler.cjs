// Обработчик для run_terminal_cmd инструмента (legacy support)
// Этот файл можно отключить, удалив его или переименовав

const path = require('path');
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
const {sessionVars} = require('@libs/system/session-vars/index.cjs');
const {analyzeCommand} = require('@libs/system/security-mask/index.cjs');
const {recordCommandMetric, recordSecurityMetric} = require('@libs/system/analytics-engine/index.cjs');
const {validateExecRunParams} = require('@libs/system/command-validation/index.cjs');

class RunTerminalCmdHandler {
    constructor(server) {
        this.server = server;
    }

    // Вспомогательная функция для формирования ответа
    _textResponse(id, s) {
        return {jsonrpc: '2.0', id, result: {content: [{type: 'text', text: s}]}};
    }

    // Унифицированный логгер ошибок
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
     * Legacy обработчик run_terminal_cmd с поддержкой cwd и action
     */
    async handleRunTerminalCmd(id, args) {
        try {
            const command = String(args.command || '').trim();

            // Базовые валидации
            if (!command) {
                return this._textResponse(id, 'Error: Command is required');
            }

            const action = args.action;
            const subAction = args.subAction;
            const timeout = Number(args.timeout || 120);
            const isBackground = !!args.is_background;
            const cwd = args.cwd;

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
                    this._logFatal('[RUN_TERMINAL_CMD] Parameter validation failed', vErr, {args});
                    return this._textResponse(id, `Parameter validation error: ${vErr.message}`);
                }
            }

            // Resolve working directory if provided
            let resolvedCwd = null;
            if (cwd) {
                try {
                    if (!this.server || typeof this.server.validateAndResolveCwd !== 'function') {
                        throw new Error('Server validateAndResolveCwd is not available');
                    }
                    const cwdValidation = await this.server.validateAndResolveCwd(cwd, this.server.fileUtils, this.server.pathUtils);
                    if (!cwdValidation || !cwdValidation.valid) {
                        return this._textResponse(id, `Invalid working directory: ${cwdValidation && cwdValidation.error ? cwdValidation.error : 'validation failed'}`);
                    }
                    resolvedCwd = cwdValidation.path;
                } catch (cwdErr) {
                    this._logFatal('[RUN_TERMINAL_CMD] CWD validation error', cwdErr, {cwd});
                    return this._textResponse(id, `Working directory validation error: ${cwdErr.message}`);
                }
            } else {
                // Приоритет: WORKSPACE_ROOT (env) > getCurrentDir() (сессионная) > getCurrentDirSync() (системная)
                if (process.env.WORKSPACE_ROOT) {
                    resolvedCwd = process.env.WORKSPACE_ROOT;
                    this.server.logger.debug(`[RUN_TERMINAL_CMD] Using client workspace root from WORKSPACE_ROOT env: ${resolvedCwd}`);
                } else {
                    try {
                        resolvedCwd = await getCurrentDir();
                    } catch (gErr) {
                        this._logFatal('[RUN_TERMINAL_CMD] Get current directory error', gErr);
                        return this._textResponse(id, `Get current directory error: ${gErr.message}`);
                    }
                }
            }

            // Если это структурированное действие — делегируем в основной обработчик
            if (action) {
                return await this.server.handleTerminalTool(id, args);
            }

            // Security analysis
            const securityAnalysis = analyzeCommand(command);
            if (securityAnalysis && securityAnalysis.blocked) {
                recordSecurityMetric('block', {command, reason: securityAnalysis.reason});
                return this._textResponse(id, `Security block: ${securityAnalysis.reason}`);
            }

            this.server.logger.info(`[RUN_TERMINAL_CMD] Executing command: ${command}`, {
                timeout,
                isBackground,
                cwd: resolvedCwd,
                sessionId: getCurrentSessionId()
            });

            try {
                // runCommand возвращает child process, нужно обрабатывать события
                const result = await new Promise((resolve, reject) => {
                    const child = this.server.commandExecutor.runCommand(command, timeout, isBackground, resolvedCwd);
                    
                    if (!child) {
                        reject(new Error('CommandExecutor.runCommand returned null or undefined'));
                        return;
                    }

                    // Проверяем, если это уже Promise
                    if (child && typeof child.then === 'function') {
                        child.then((resolved) => {
                            // Promise резолвится с объектом { success, stdout, stderr, return_code, ... }
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

                    // Если это уже обработанный результат
                    if (child.stdout === undefined && child.stderr === undefined && child.stdout !== null) {
                        if (typeof child === 'object' && ('stdout' in child || 'stderr' in child || 'output' in child)) {
                            resolve(child);
                            return;
                        }
                    }

                    // Обрабатываем child process
                    let stdout = '';
                    let stderr = '';
                    let exitCode = 0;

                    if (child.stdout) {
                        child.stdout.on('data', (data) => {
                            stdout += data.toString();
                        });
                    }

                    if (child.stderr) {
                        child.stderr.on('data', (data) => {
                            stderr += data.toString();
                        });
                    }

                    child.on('close', (code) => {
                        exitCode = code !== null && code !== undefined ? code : 0;
                        resolve({
                            stdout: stdout,
                            stderr: stderr,
                            return_code: exitCode,
                            exitCode: exitCode,
                            output: stdout,
                            error: stderr
                        });
                    });

                    child.on('error', (error) => {
                        reject(error);
                    });
                });

                // Persist history safely
                try {
                    await this.server.errorUtils.safeExecute(async () => {
                        persistHistoryRecord({
                            timestamp: new Date().toISOString(),
                            command: command,
                            success: (result.return_code || result.exitCode) === 0,
                            stdout: result.stdout || '',
                            stderr: result.stderr || '',
                            return_code: result.return_code || result.exitCode,
                            duration: '0', // Not available in legacy mode
                            cwd: resolvedCwd || getCurrentDirSync(),
                            platform: process.platform,
                            session_id: getCurrentSessionId()
                        });
                    }, 'run_terminal_cmd.persist_history');
                } catch (histErr) {
                    this._logFatal('[RUN_TERMINAL_CMD] Failed to persist history', histErr, {command});
                }

                // Metrics and logging
                recordCommandMetric(true, 0, false);
                recordSecurityMetric('allow', {command});

                // Нормализуем вывод
                const stdout = result.stdout || result.output || '';
                const stderr = result.stderr || result.error || '';
                const exitCode = result.return_code || result.exitCode || 0;

                return this._textResponse(id, `OK (code=${exitCode})\n${stdout}${stderr ? '\n' + stderr : ''}`);
            } catch (runErr) {
                this._logFatal('[RUN_TERMINAL_CMD] Command failed', runErr, {command, cwd: resolvedCwd});

                // Persist failure to history
                try {
                    await this.server.errorUtils.safeExecute(async () => {
                        persistHistoryRecord({
                            timestamp: new Date().toISOString(),
                            command: command,
                            success: false,
                            stdout: '',
                            stderr: runErr.message,
                            return_code: runErr.exitCode || 1,
                            duration: '0',
                            cwd: resolvedCwd || getCurrentDirSync(),
                            platform: process.platform,
                            session_id: getCurrentSessionId()
                        });
                    }, 'run_terminal_cmd.persist_failure');
                } catch (histErr) {
                    this._logFatal('[RUN_TERMINAL_CMD] Failed to persist failure to history', histErr, {command});
                }

                recordCommandMetric(false, 0, true);
                recordSecurityMetric('error', {command, error: runErr.message});

                return this._textResponse(id, `ERROR (code=${runErr.exitCode || 1}): ${runErr.message}`);
            }

        } catch (fatalError) {
            this._logFatal('[RUN_TERMINAL_CMD] Fatal error', fatalError, {args});
            return this._textResponse(id, `Run terminal cmd fatal error: ${fatalError.message}`);
        }
    }

    runTerminalCmdHelp() {
        return 'run_terminal_cmd - legacy терминал с поддержкой cwd и action параметров (можно отключить)';
    }
}

module.exports = {RunTerminalCmdHandler};






