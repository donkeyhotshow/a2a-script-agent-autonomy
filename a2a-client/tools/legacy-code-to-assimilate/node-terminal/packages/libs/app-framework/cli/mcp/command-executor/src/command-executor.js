const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { LoggerCore } = require('../../../logging-reporting/core-logger/index.js'); // Updated path after libs reorganization
const errorHandlerFactory = require('../../../core/error-handler/src/error-handler.js');
const { v4: uuidv4 } = require('uuid'); // Для генерации session_id

const MAX_CAPTURE = 10 * 1024 * 1024; // 10MB bytes of stdout/err to keep in memory

class CommandExecutor {
    constructor(logger, errorHandler, historyManager) { // Добавлен historyManager
        this.logger = logger;
        this.errorHandler = errorHandler;
        this.historyManager = historyManager; // Сохраняем экземпляр HistoryManager
        this.isWindows = process.platform === 'win32';
    }

    ensureLogsDir() {
        const dir = path.join(process.cwd(), 'logs');
        try { 
            fs.mkdirSync(dir, { recursive: true }); 
        } catch (error) {
            this.logger.warn('Failed to create logs directory:', error.message);
        }
        return dir;
    }

    buildShellAndArgs(commandWithRedirect) {
        if (this.isWindows) {
            // Конвертируем команду в подходящий формат
            const conversion = this.convertCommand(commandWithRedirect);
            
            if (conversion.converted) {
                this.logger.debug('Command converted', {
                    original: commandWithRedirect,
                    converted: conversion.command,
                    shell: conversion.shell
                });
                
                const shellPath = conversion.shell === 'powershell' ? 'powershell.exe' : 'cmd.exe';
                return { 
                    file: conversion.command, 
                    args: [], 
                    options: { windowsHide: true, shell: shellPath } 
                };
            }
            
            // Fallback: используем cmd для всех команд
            return { 
                file: commandWithRedirect, 
                args: [], 
                options: { windowsHide: true, shell: 'cmd.exe' } 
            };
        }
        return { 
            file: '/bin/bash', 
            args: ['-lc', commandWithRedirect], 
            options: {} 
        };
    }

    defaultEnv() {
        const env = Object.assign({}, process.env, {
            CI: 'true',
            NO_COLOR: '1',
            FORCE_COLOR: '0',
            GIT_TERMINAL_PROMPT: '0',
            PIP_DISABLE_PIP_VERSION_CHECK: '1',
            PYTHONUNBUFFERED: '1',
            npm_config_yes: 'true',
            YARN_ENABLE_IMMUTABLE_INSTALLS: '1',
            PYTHONIOENCODING: 'utf-8',
            LANG: 'en_US.UTF-8',
            LC_ALL: 'en_US.UTF-8'
        });

        if (this.isWindows) {
            if (!env.SystemRoot) env.SystemRoot = process.env.SystemRoot || 'C:\\Windows';
            if (!env.windir) env.windir = process.env.windir || env.SystemRoot;
            
            try {
                const pathSep = ';';
                if (!env.PATH) env.PATH = '';
                const hasSys32 = /\\Windows\\System32(;|$)/i.test(env.PATH);
                const hasWin = /(^|;)C:\\Windows(;|$)/i.test(env.PATH);
                if (!hasSys32) env.PATH = `C:\\Windows\\System32${pathSep}` + env.PATH;
                if (!hasWin) env.PATH = `C:\\Windows${pathSep}` + env.PATH;
            } catch (error) {
                this.logger.warn('Failed to set PATH:', error.message);
            }
        }

        return env;
    }

    pickWindowsShell() {
        const candidates = [
            'powershell.exe',
            'pwsh.exe',
            'cmd.exe'
        ];

        // Простая проверка доступности shell'ов
        for (const shell of candidates) {
            try {
                // Проверяем, есть ли shell в PATH или системных директориях
                const { execSync } = require('child_process');
                execSync(`where ${shell}`, { stdio: 'ignore' });
                return shell;
            } catch (error) {
                continue;
            }
        }
        
        // Fallback на cmd.exe
        return 'cmd.exe';
    }

    convertCommand(command) {
        // Базовая конвертация команд для Windows
        if (command.includes('&&') || command.includes('||')) {
            return {
                converted: true,
                command: command,
                shell: 'cmd'
            };
        }
        
        if (command.includes('Get-') || command.includes('$')) {
            return {
                converted: true,
                command: command,
                shell: 'powershell'
            };
        }
        
        return { converted: false };
    }

    async runCommand(command, options = {}) {
        const {
            cwd = process.cwd(),
            env = this.defaultEnv(),
            timeout = 30000,
            captureOutput = true,
            background = false,
            sessionId = `manual_session_${uuidv4()}` // Генерация session_id, если не предоставлен
        } = options;

        const startTime = new Date(); // Время начала выполнения команды

        try {
            const { file, args, options: spawnOptions } = this.buildShellAndArgs(command);
            
            const processOptions = {
                cwd,
                env,
                ...spawnOptions,
                stdio: captureOutput ? 'pipe' : 'inherit'
            };

            this.logger.info('Executing command', { command, cwd, sessionId }); // Добавлено логирование sessionId

            const childProcess = spawn(file, args, processOptions);
            
            let stdout = '';
            let stderr = '';
            
            if (captureOutput) {
                childProcess.stdout?.on('data', (data) => {
                    stdout += data.toString();
                    if (stdout.length > MAX_CAPTURE) {
                        stdout = stdout.slice(-MAX_CAPTURE);
                    }
                });
                
                childProcess.stderr?.on('data', (data) => {
                    stderr += data.toString();
                    if (stderr.length > MAX_CAPTURE) {
                        stderr = stderr.slice(-MAX_CAPTURE);
                    }
                });
            }

            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    childProcess.kill('SIGTERM');
                    const commandData = {
                        timestamp: new Date().toISOString(),
                        session_id: sessionId,
                        command,
                        cwd,
                        success: false,
                        return_code: null,
                        duration: new Date().getTime() - startTime.getTime(),
                        stdout: captureOutput ? stdout : '',
                        stderr: captureOutput ? stderr : '',
                        reason: 'timeout',
                        error_type: 'timeout'
                    };
                    this.historyManager.logCommand(commandData); // Логирование таймаута
                    reject(new Error(`Command timeout after ${timeout}ms`));
                }, timeout);

                childProcess.on('close', (code, signal) => {
                    clearTimeout(timeoutId);
                    
                    const duration = new Date().getTime() - startTime.getTime();
                    const success = code === 0;

                    const commandData = {
                        timestamp: new Date().toISOString(),
                        session_id: sessionId,
                        command,
                        cwd,
                        success,
                        return_code: code,
                        duration,
                        stdout: captureOutput ? stdout : '',
                        stderr: captureOutput ? stderr : '',
                        reason: success ? 'completed' : 'failed',
                        error_type: success ? 'success' : 'nonzero_exit'
                    };

                    this.historyManager.logCommand(commandData); // Логирование завершенной команды

                    const result = {
                        command,
                        code,
                        signal,
                        stdout: captureOutput ? stdout : '',
                        stderr: captureOutput ? stderr : '',
                        success: code === 0
                    };

                    if (code === 0) {
                        resolve(result);
                    } else {
                        const error = new Error(`Command failed with code ${code}`);
                        error.result = result;
                        reject(error);
                    }
                });

                childProcess.on('error', (error) => {
                    clearTimeout(timeoutId);
                    const commandData = {
                        timestamp: new Date().toISOString(),
                        session_id: sessionId,
                        command,
                        cwd,
                        success: false,
                        return_code: null,
                        duration: new Date().getTime() - startTime.getTime(),
                        stdout: captureOutput ? stdout : '',
                        stderr: error.message,
                        reason: 'error',
                        error_type: error.name
                    };
                    this.historyManager.logCommand(commandData); // Логирование ошибки процесса
                    reject(error);
                });
            });

        } catch (error) {
            this.errorHandler.handleError(error, 'CommandExecutor.runCommand');
            const commandData = {
                timestamp: new Date().toISOString(),
                session_id: sessionId,
                command,
                cwd,
                success: false,
                return_code: null,
                duration: new Date().getTime() - startTime.getTime(),
                stdout: '', // В этом случае stdout/stderr могут быть недоступны
                stderr: error.message,
                reason: 'exception',
                error_type: error.name
            };
            this.historyManager.logCommand(commandData); // Логирование исключения
            throw error;
        }
    }
}

export default CommandExecutor;
