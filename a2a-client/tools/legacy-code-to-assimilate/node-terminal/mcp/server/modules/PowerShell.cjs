/**
 * Модуль PowerShell
 * Обеспечивает выполнение PowerShell команд с автоматическим исправлением ошибок
 */

const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {ModuleBase} = require('../core/ModuleBase.cjs');
const {exec} = require('child_process');
const {promisify} = require('util');

const execAsync = promisify(exec);

class PowerShellModule extends ModuleBase {
    constructor(server) {
        super(server, {
            name: 'PowerShell',
            version: '1.0.0',
            description: 'PowerShell команды с автоматическим исправлением ошибок'
        });

        this.errorHandler = this.createPowerShellErrorHandler();
    }

    /**
     * Создание обработчика ошибок PowerShell
     */
    createPowerShellErrorHandler() {
        return {
            handle: (error, context) => {
                this.logger.error(`PowerShell error in ${context}: ${error.message}`);

                // Попытка автоматического исправления
                const suggestion = this.suggestFix(error.message);

                return {
                    success: false,
                    error: error.message,
                    suggestion,
                    context
                };
            }
        };
    }

    async processRequest(id, args) {
        const {action, command, ...params} = args;

        switch (action) {
            case 'exec':
                return await this.handleExec(id, command, params);
            case 'fix':
                return await this.handleFix(id, command, params);
            case 'suggest':
                return await this.handleSuggest(id, command);
            default:
                throw errorUtils.createError(`Unknown PowerShell action: ${action}`);
        }
    }

    /**
     * Выполнение PowerShell команды
     */
    async handleExec(id, command, {autoFix = true, timeout = 30000} = {}) {
        if (!command) {
            throw errorUtils.createError('PowerShell command is required');
        }

        errorUtils.safeExecute(async () => {

            this.logger.info(`Executing PowerShell command: ${command}`);

            // Выполняем команду
            const {stdout, stderr} = await execAsync(command, {
                shell: 'powershell.exe',
                timeout,
                maxBuffer: 1024 * 1024 // 1MB буфер
            });

            const result = {
                success: true,
                command,
                stdout: stdout || '',
                stderr: stderr || '',
                timestamp: new Date().toISOString()
            };

            // Если есть stderr, но команда выполнилась, логируем предупреждение
            if (stderr && !stderr.includes('Error')) {
                this.logger.warn(`PowerShell command completed with warnings`, {command, stderr});
            }

            return result;


        }, 'error')
    )


        if (autoFix) {
            return await this.attemptAutoFix(command, error);
        } else {
            throw error;
        }
    }
}

/**
 * Попытка автоматического исправления команды
 */
async
attemptAutoFix(originalCommand, error)
{
    errorUtils.safeExecute(async () => {

        this.logger.info(`Attempting to auto-fix PowerShell command`, {originalCommand, error: error.message});

        const fixedCommand = this.fixPowerShellCommand(originalCommand, error.message);

        if (fixedCommand === originalCommand) {
            throw errorUtils.createError(`No fix available for: ${error.message}`);
        }

        this.logger.info(`Retrying with fixed command: ${fixedCommand}`);

        const {stdout, stderr} = await execAsync(fixedCommand, {
            shell: 'powershell.exe',
            timeout: 30000,
            maxBuffer: 1024 * 1024
        });

        return {
            success: true,
            originalCommand,
            fixedCommand,
            stdout: stdout || '',
            stderr: stderr || '',
            autoFixed: true,
            timestamp: new Date().toISOString()
        };


    }, 'fixError')
)


    throw errorUtils.createError(`Command failed and auto-fix unsuccessful: ${error.message}`);
}
}

/**
 * Исправление PowerShell команды
 */
fixPowerShellCommand(command, errorMessage)
{
    let fixedCommand = command;

    // Исправление проблем с путями
    if (errorMessage.includes('Cannot find path') || errorMessage.includes('does not exist')) {
        fixedCommand = this.fixPathIssues(command);
    }

    // Исправление проблем с синтаксисом
    if (errorMessage.includes('syntax error') || errorMessage.includes('unexpected token')) {
        fixedCommand = this.fixSyntaxIssues(command);
    }

    // Исправление проблем с правами доступа
    if (errorMessage.includes('Access is denied') || errorMessage.includes('UnauthorizedAccessException')) {
        fixedCommand = this.fixPermissionIssues(command);
    }

    // Исправление проблем с кодировкой
    if (errorMessage.includes('encoding') || errorMessage.includes('character')) {
        fixedCommand = this.fixEncodingIssues(command);
    }

    return fixedCommand;
}

/**
 * Исправление проблем с путями
 */
fixPathIssues(command)
{
    let fixed = command;

    // Замена прямых слешей на обратные для Windows
    fixed = fixed.replace(/\//g, '\\');

    // Обрамление путей в кавычки при необходимости
    fixed = fixed.replace(/(\w+:\\.*?)(\s|$)/g, '"$1"$2');

    // Исправление относительных путей
    if (fixed.includes('.\\') || fixed.includes('..\\')) {
        fixed = fixed.replace(/\\.\\/g, '\\');
        fixed = fixed.replace(/\\.\.\\/g, '..\\');
    }

    return fixed;
}

/**
 * Исправление синтаксических проблем
 */
fixSyntaxIssues(command)
{
    let fixed = command;

    // Исправление кавычек
    fixed = fixed.replace(/[""]/g, '"');
    fixed = fixed.replace(/['']/g, "'");

    // Исправление операторов
    fixed = fixed.replace(/&&/g, ';');
    fixed = fixed.replace(/\|\|/g, ';');

    // Исправление перенаправления
    fixed = fixed.replace(/>\s*>/g, '>>');
    fixed = fixed.replace(/<\s*</g, '<<');

    return fixed;
}

/**
 * Исправление проблем с правами доступа
 */
fixPermissionIssues(command)
{
    let fixed = command;

    // Добавление -Force для команд, которые это поддерживают
    if (fixed.includes('Remove-Item') && !fixed.includes('-Force')) {
        fixed = fixed.replace(/Remove-Item/, 'Remove-Item -Force');
    }

    if (fixed.includes('Set-Item') && !fixed.includes('-Force')) {
        fixed = fixed.replace(/Set-Item/, 'Set-Item -Force');
    }

    // Добавление -ErrorAction SilentlyContinue для подавления ошибок
    if (!fixed.includes('-ErrorAction')) {
        fixed += ' -ErrorAction SilentlyContinue';
    }

    return fixed;
}

/**
 * Исправление проблем с кодировкой
 */
fixEncodingIssues(command)
{
    let fixed = command;

    // Добавление параметров кодировки для команд, которые это поддерживают
    if (fixed.includes('Get-Content') && !fixed.includes('-Encoding')) {
        fixed = fixed.replace(/Get-Content/, 'Get-Content -Encoding UTF8');
    }

    if (fixed.includes('Set-Content') && !fixed.includes('-Encoding')) {
        fixed = fixed.replace(/Set-Content/, 'Set-Content -Encoding UTF8');
    }

    // Добавление Out-File с кодировкой
    if (fixed.includes('Out-File') && !fixed.includes('-Encoding')) {
        fixed = fixed.replace(/Out-File/, 'Out-File -Encoding UTF8');
    }

    return fixed;
}

/**
 * Обработка команды исправления
 */
async
handleFix(id, command, {dryRun = false} = {})
{
    if (!command) {
        throw errorUtils.createError('Command is required for fix action');
    }

    if (dryRun) {
        const suggestion = this.suggestFix(command);
        return {
            success: true,
            command,
            suggestion,
            dryRun: true
        };
    }

    // Выполняем команду с автоматическим исправлением
    return await this.handleExec(id, command, {autoFix: true});
}

/**
 * Обработка команды предложения исправления
 */
async
handleSuggest(id, command)
{
    if (!command) {
        throw errorUtils.createError('Command is required for suggest action');
    }

    const suggestion = this.suggestFix(command);

    return {
        success: true,
        command,
        suggestion,
        timestamp: new Date().toISOString()
    };
}

/**
 * Предложение исправления для команды
 */
suggestFix(command)
{
    const suggestions = [];

    // Проверяем типичные проблемы
    if (command.includes('/')) {
        suggestions.push('Consider using backslashes (\\) for Windows paths');
    }

    if (command.includes('&&') || command.includes('||')) {
        suggestions.push('Use semicolon (;) instead of && or || in PowerShell');
    }

    if (command.includes('rm ') || command.includes('ls ')) {
        suggestions.push('Use PowerShell cmdlets: Remove-Item instead of rm, Get-ChildItem instead of ls');
    }

    if (command.includes('>') && !command.includes('Out-File')) {
        suggestions.push('Consider using Out-File for better encoding control');
    }

    if (command.includes('cat ') || command.includes('type ')) {
        suggestions.push('Use Get-Content instead of cat or type');
    }

    return suggestions.length > 0 ? suggestions : ['No specific suggestions available'];
}

getTools()
{
    return [{
        name: 'powershell',
        description: 'PowerShell команды: exec | fix | suggest',
        inputSchema: {
            type: 'object',
            properties: {
                action: {type: 'string', enum: ['exec', 'fix', 'suggest']},
                command: {type: 'string', description: 'PowerShell команда для выполнения'},
                autoFix: {type: 'boolean', default: true, description: 'Автоматическое исправление ошибок'},
                timeout: {type: 'number', default: 30000, description: 'Таймаут в миллисекундах'},
                dryRun: {type: 'boolean', default: false, description: 'Режим симуляции для fix'}
            },
            required: ['action', 'command']
        }
    }];
}
}

module.exports = {PowerShellModule};


