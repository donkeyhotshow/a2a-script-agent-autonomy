/**
 * Модуль терминальных операций
 * Обрабатывает команды терминала, историю и управление рабочими директориями
 */

const {fileSystemUtils} = require('@libs/system/file-operations/index.js');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {ModuleBase} = require('../core/ModuleBase.cjs');
const {exec} = require('child_process');
const {promisify} = require('util');
const path = require('path');
const fs = require('fs'); // Добавляем fs для проверки существования директории

const execAsync = promisify(exec);

class TerminalModule extends ModuleBase {
    constructor(server) {
        super(server, {
            name: 'Terminal',
            version: '1.0.0',
            description: 'Терминальные команды, история и управление рабочими директориями'
        });

        // Импортируем зависимости из основного сервера
        this.getCurrentDir = server.getCurrentDir || (() => process.cwd());
        this.setCurrentDir = server.setCurrentDir || ((dir) => process.chdir(dir));
        this.getProjectRoot = server.getProjectRoot || (() => process.cwd());
        this.resetInitialization = server.resetInitialization || (() => {
        });
        this.expandPath = server.expandPath || ((p) => fileSystemUtils.resolve(p));

        // История и сессии
        this.listSessions = server.listSessions || (() => []);
        this.loadSessionRecords = server.loadSessionRecords || (() => []);
        this.getCurrentSessionId = server.getCurrentSessionId || (() => null);
        this.setCurrentSessionId = server.setCurrentSessionId || (() => {
        });
        this.createAndSwitchSession = server.createAndSwitchSession || (() => {
        });
        this.persistHistoryRecord = server.persistHistoryRecord || (() => {
        });

        // Режимы выполнения
        this.listModes = server.listModes || (() => []);
        this.getMode = server.getMode || (() => 'default');
        this.setMode = server.setMode || (() => {
        });
        this.setFlags = server.setFlags || (() => {
        });
        this.isReadonly = server.isReadonly || (() => false);
        this.isReadonlyAllowed = server.isReadonlyAllowed || (() => true);
    }

    /**
     * Обработка запросов к терминальному модулю
     */
    async processRequest(id, args) {
        const {action, subAction, command, timeout, is_background, cwd, limit, sessionId} = args;

        switch (action) {
            case 'exec':
                return await this.handleExec(id, {command, timeout, is_background, cwd});
            case 'history':
                return await this.handleHistory(id, {subAction, limit, sessionId});
            case 'mode':
                return await this.handleMode(id, {subAction, command});
            case 'workspace':
                return await this.handleWorkspace(id, {subAction, command});
            default:
                throw errorUtils.createError(`Unknown terminal action: ${action}`);
        }
    }

    /**
     * Выполнение команды
     */
    async handleExec(id, params) {
        const {command, timeout, is_background, cwd} = params;

        if (!command) {
            throw errorUtils.createError('Command is required for exec action');
        }

        // Проверяем режим readonly
        if (this.isReadonly() && !this.isReadonlyAllowed()) {
            throw errorUtils.createError('Command execution is not allowed in readonly mode');
        }

        try {
            this.logger.info(`Executing command: ${command}`);

            const {stdout, stderr} = await execAsync(command, {
                cwd: cwd || this.getCurrentDir(), // Использовать cwd из параметров или текущую директорию
                timeout: timeout || 30000, // Таймаут из параметров или дефолтный
                maxBuffer: 1024 * 1024 // 1MB буфер
            });

            const result = {
                success: true,
                command,
                stdout: stdout || '',
                stderr: stderr || '',
                cwd: this.getCurrentDir(),
                timestamp: new Date().toISOString()
            };

            // Сохраняем в историю
            if (this.persistHistoryRecord) {
                this.persistHistoryRecord({
                    command,
                    result: 'success',
                    timestamp: result.timestamp,
                    cwd: result.cwd
                });
            }

            return result;
        } catch (error) {
            const errorResult = {
                success: false,
                command,
                error: error.message,
                cwd: this.getCurrentDir(),
                timestamp: new Date().toISOString()
            };
            // Сохраняем ошибку в историю
            if (this.persistHistoryRecord) {
                this.persistHistoryRecord({
                    command,
                    result: 'error',
                    error: error.message,
                    timestamp: errorResult.timestamp,
                    cwd: errorResult.cwd
                });
            }
            throw errorUtils.createError(`Command execution failed: ${error.message}`, 1, error);
        }
    }

    /**
     * Обработка истории команд
     */
    async handleHistory(id, params) {
        const {subAction, limit, sessionId} = params;

        try {
            switch (subAction) {
                case 'list':
                    const sessions = this.listSessions();
                    return {
                        success: true,
                        sessions,
                        timestamp: new Date().toISOString()
                    };

                case 'show':
                    const records = this.loadSessionRecords();
                    const filteredRecords = limit ? records.slice(-limit) : records;
                    return {
                        success: true,
                        records: filteredRecords,
                        count: filteredRecords.length,
                        timestamp: new Date().toISOString()
                    };

                case 'current':
                    const currentSessionId = this.getCurrentSessionId();
                    return {
                        success: true,
                        currentSession: currentSessionId,
                        timestamp: new Date().toISOString()
                    };

                default:
                    throw errorUtils.createError(`Unknown history subAction: ${subAction}`);
            }
        } catch (error) {
            throw errorUtils.createError(`Failed to retrieve history: ${error.message}`, 1, error);
        }
    }

    /**
     * Обработка режимов выполнения
     */
    async handleMode(id, params) {
        const {subAction, command} = params;

        switch (subAction) {
            case 'get':
                const currentMode = this.getMode();
                const availableModes = this.listModes();

                return {
                    success: true,
                    currentMode,
                    availableModes,
                    timestamp: new Date().toISOString()
                };

            case 'set':
                if (!command) {
                    throw errorUtils.createError('Mode name is required for set action');
                }

                try {
                    this.setMode(command);

                    return {
                        success: true,
                        mode: command,
                        message: 'Mode set to: ' + command,
                        timestamp: new Date().toISOString()
                    };
                } catch (error) {
                    throw errorUtils.createError(`Failed to set mode: ${error.message}`, 1, error);
                }

            case 'list':
                const modes = this.listModes();
                return {
                    success: true,
                    modes,
                    timestamp: new Date().toISOString()
                };

            default:
                throw errorUtils.createError(`Unknown mode subAction: ${subAction}`);
        }
    }

    /**
     * Обработка рабочих директорий
     */
    async handleWorkspace(id, params) {
        const {subAction, command} = params;

        switch (subAction) {
            case 'get':
                const currentDir = this.getCurrentDir();
                const projectRoot = this.getProjectRoot();

                return {
                    success: true,
                    currentDir,
                    projectRoot,
                    timestamp: new Date().toISOString()
                };

            case 'set':
                if (!command) {
                    throw errorUtils.createError('Path is required for workspace set action');
                }

                try {
                    const newPath = this.expandPath(command);

                    // Проверяем существование директории
                    if (!fs.existsSync(newPath)) {
                        throw errorUtils.createError(`Directory does not exist: ${newPath}`);
                    }

                    this.setCurrentDir(newPath);

                    return {
                        success: true,
                        message: `Working directory changed to: ${newPath}`,
                        newPath,
                        timestamp: new Date().toISOString()
                    };
                } catch (error) {
                    throw errorUtils.createError(`Failed to set workspace: ${error.message}`, 1, error);
                }

            default:
                throw errorUtils.createError(`Unknown workspace subAction: ${subAction}`);
        }
    }

    /**
     * Выполняет команду с улучшенной обработкой для PowerShell
     * Низкоуровневый метод для непосредственного выполнения команд
     */
    async executeCommand(id, command, options = {}) {
        try {
            const {timeout = 30000, cwd, background = false} = options;

            // Простая обработка JSON команд (только для извлечения команды)
            let finalCommand = command;
            let finalCwd = cwd;

            if (command && typeof command === 'string' && command.trim().startsWith('{')) {
                try {
                    const jsonCommand = JSON.parse(command);

                    // Если это JSON команда exec, извлекаем реальную команду
                    if (jsonCommand.action === 'exec' && jsonCommand.command) {
                        finalCommand = jsonCommand.command;
                        if (jsonCommand.cwd) {
                            finalCwd = jsonCommand.cwd;
                        }
                    } else {
                        // Для других JSON команд возвращаем ошибку - они должны обрабатываться через processRequest
                        throw errorUtils.createError('JSON commands should be processed via processRequest method');
                    }
                } catch (jsonError) {
                    if (jsonError.message.includes('JSON commands should be processed')) {
                        throw jsonError;
                    }
                    // Если это не JSON, продолжаем с обычной командой
                    this.logger.debug(`Command is not JSON, treating as regular command: ${command}`);
                }
            }

            // Выполняем команду через child_process
            const result = await new Promise((resolve, reject) => {
                const child = this.server.commandExecutor.runCommand(finalCommand, timeout, background, finalCwd || this.getCurrentDir());

                let stdout = '';
                let stderr = '';
                let exitCode = 0;

                child.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });

                child.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });

                child.on('close', (code) => {
                    exitCode = code;
                    resolve({
                        success: code === 0,
                        output: stdout,
                        error: stderr,
                        exitCode: code
                    });
                });

                child.on('error', (error) => {
                    reject(error);
                });
            });

            return result;
        } catch (error) {
            this.logger.error(`Command execution failed: ${error.message}`, error);
            throw errorUtils.createError(`Command execution failed: ${error.message}`, 1, error);
        }
    }

    /**
     * Возвращает список доступных инструментов
     */
    getTools() {
        return [
            {
                name: 'terminal',
                description: 'Терминал и команды: exec | history | mode | workspace',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['exec', 'history', 'mode', 'workspace'],
                            description: 'Тип действия для выполнения'
                        },
                        subAction: {
                            type: 'string',
                            description: 'Поддействие для структурированных команд (зависит от action)',
                            examples: [
                                'set/get для workspace',
                                'show/list/current для history',
                                'set/get/list для mode',
                                'не требуется для exec'
                            ]
                        },
                        command: {
                            type: 'string',
                            description: 'Команда для выполнения (для exec) или параметр (для workspace set, mode set)'
                        },
                        cwd: {
                            type: 'string',
                            description: 'Рабочая директория для выполнения команды (для exec)'
                        },
                        timeout: {
                            type: 'number',
                            description: 'Таймаут выполнения в секундах (для exec)'
                        },
                        is_background: {
                            type: 'boolean',
                            description: 'Запустить команду в фоновом режиме (для exec)'
                        },
                        limit: {
                            type: 'number',
                            description: 'Лимит записей для команд истории'
                        },
                        sessionId: {
                            type: 'string',
                            description: 'ID сессии для команд истории'
                        }
                    },
                    required: ['action'],
                    allOf: [
                        {
                            if: {properties: {action: {const: 'exec'}}},
                            then: {required: ['command']}
                        },
                        {
                            if: {properties: {action: {const: 'workspace'}}},
                            then: {required: ['subAction']}
                        },
                        {
                            if: {properties: {action: {const: 'mode'}}},
                            then: {required: ['subAction']}
                        },
                        {
                            if: {properties: {action: {const: 'history'}}},
                            then: {required: ['subAction']}
                        }
                    ]
                }
            }
        ];
    }

    /**
     * Получение статистики модуля
     */
    getStats() {
        return {
            ...this.getStatus(),
            currentDir: this.getCurrentDir(),
            currentMode: this.getMode(),
            currentSession: this.getCurrentSessionId()
        };
    }
}

module.exports = {TerminalModule};