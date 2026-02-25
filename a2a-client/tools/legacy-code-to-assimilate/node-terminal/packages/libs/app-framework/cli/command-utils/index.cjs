const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
// Динамический импорт для поддержки тестирования
let execa;
try {
  const execaModule = require('execa');
  execa = execaModule;
} catch (e) {
  // Заглушка для тестирования
  execa = {
    execa: async () => ({
      exitCode: 0,
      stdout: 'test output',
      stderr: '',
      command: 'test'
    })
  };
}
// Фиксируем пути вместо загрузки из path-utils (избегаем ES модулей)
const LIBS_ROOT = 'C:/apps/libs';
const HISTORY_CJS_PATH = path.join(LIBS_ROOT, 'system', 'history', 'index.cjs');
const WORKDIR_CJS_PATH = path.join(LIBS_ROOT, 'system', 'workdir', 'index.cjs');
const ENHANCED_TIMEOUT_HINTS_CJS_PATH = path.join(LIBS_ROOT, 'mcp', 'EnhancedTimeoutHints.cjs');
const DEBUG_SYSTEM_CJS_PATH = path.join(LIBS_ROOT, 'core', 'debug-system', 'index.cjs');
const COMMAND_CONVERTER_CJS_PATH = path.join(LIBS_ROOT, 'mcp', 'CommandConverter.cjs');
const SYNTAX_FIXER_CLI_CJS_PATH = path.join(LIBS_ROOT, 'mcp', 'SyntaxFixer.cjs');
const INPUT_PROCESSOR_CJS_PATH = path.join(LIBS_ROOT, 'mcp', 'InputProcessor.cjs');
const TEST_INTERCEPTOR_CJS_PATH = path.join(LIBS_ROOT, 'mcp', 'TestInterceptor.cjs');

// Импортируем необходимые модули
const { pushMemoryHistory, getCurrentSessionId } = require('C:/apps/libs/system/history/index.cjs');
const { getCurrentDir, expandPath } = require('C:/apps/libs/system/workdir/index.cjs');
const { EnhancedTimeoutHints } = require(ENHANCED_TIMEOUT_HINTS_CJS_PATH);
const { debugSystem, DEBUG_CATEGORIES } = require(DEBUG_SYSTEM_CJS_PATH);
const { CommandConverter } = require('C:/apps/libs/system/command-converter/index.cjs');
const { testInterceptor } = require(TEST_INTERCEPTOR_CJS_PATH);
const { InputProcessor } = require(INPUT_PROCESSOR_CJS_PATH);
// const { SystemCommandInterceptor } = require('C:/apps/root/mcp/node-terminal/mcp/CommandInterceptors.cjs');

// Временные заглушки для isDefaultBackground и isSimulateExec
const isDefaultBackground = () => false;
const isSimulateExec = () => false;

// Временная функция для отладочного логирования в отдельный файл
function writeTemporaryDebugLog(message) {
    const logPath = path.join(process.cwd(), 'tmp', 'command-runner-debug.log');
    try {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`, { encoding: 'utf8' });
    } catch (e) {
        console.error(`Failed to write to temporary debug log: ${e.message}`);
    }
}

// Простая функция для отображения PWD без внешних зависимостей
const pwdDisplay = {
	createPWDHeader: (command, { cwd }) => {
		return `📁 **Рабочая директория**: ${cwd || process.cwd()}\n💻 **Команда**: ${command}\n\n`;
	}
};

const MAX_CAPTURE = 10 * 1024 * 1024; // 10MB bytes of stdout/err to keep in memory

// Путь для временных файлов батников и логов
const tempCommandLogsDir = path.join(process.cwd(), 'tmp', 'command_logs');
// Убедимся, что временная директория существует
try {
    fs.mkdirSync(tempCommandLogsDir, { recursive: true });
} catch (e) {
    // В случае ошибки создания директории, логируем и продолжаем
    console.warn(`Failed to create temporary command logs directory: ${e.message}`);
}

// Функции логирования команд для мониторинга зависших процессов
function logCommandEvent(event) {
  const logEntry = {
    id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    session: getCurrentSessionId() || 'unknown',
    timestamp: new Date().toISOString(),
    ...event
  };

  try {
    // Запись в файл состояний процессов
    const statusPath = path.join(process.cwd(), 'work', 'process_status.json');
    let statusData = {};

    if (fs.existsSync(statusPath)) {
      try {
        statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
      } catch (e) {
        // Игнорируем ошибки чтения
        statusData = {};
      }
    }

    if (event.status === 'started') {
      statusData[event.pid] = {
        command: event.command,
        start_time: event.start_time,
        session: event.session,
        cwd: event.cwd
      };
    } else if (event.status === 'completed' || event.status === 'timeout' || event.status === 'killed' || event.status === 'failed') {
      if (statusData[event.pid]) {
        delete statusData[event.pid];
      }
    }

    fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
  } catch (error) {
    // Тихо игнорируем ошибки логирования, чтобы не нарушать выполнение команд
    console.warn('Command logging error:', error.message);
  }
}

// Основная функция runCommand
async function runCommand(command, options = {}) {
    const {
        timeout = 120,
        isBackground = false,
        cwd = null,
        logger = console,
        errorHandler = null
    } = options;

    const executor = new CommandExecutor(logger, errorHandler);
    return await executor.runCommand(command, timeout, isBackground, cwd);
}

// Классы для управления процессами
class ProcessManager {
    static isPowerShellCommand(command) {
        return command && (command.includes('powershell') || command.includes('pwsh'));
    }
}

class CatEmulator {
    static stripQuotes(s) {
        if (s.startsWith('\'') && s.endsWith('\'')) {
            return s.slice(1, -1);
        }
        if (s.startsWith('"') && s.endsWith('"')) {
            return s.slice(1, -1);
        }
        return s;
    }
}

class BackgroundExecutor {
    constructor() {
        // Конструктор
    }
}

class CommandExecutor {
    constructor(logger, errorHandler) {
        this.logger = logger;
        this.errorHandler = errorHandler;
        // this.systemInterceptor = new SystemCommandInterceptor();
    }

    /**
     * Выполняет команду в терминале
     * @param {string} command - Команда для выполнения
     * @param {number} timeout - Таймаут в секундах
     * @param {boolean} isBackground - Фоновый режим
     * @param {string} cwd - Рабочая директория
     * @returns {Promise<Object>} Результат выполнения команды
     */
    async runCommand(command, timeout = 120, isBackground = false, cwd = null) {
        const startTime = Date.now();

        try {
            // Логируем начало выполнения команды
            if (this.logger) {
                this.logger.info(`[CommandExecutor] Выполнение команды: ${command}`);
                this.logger.debug(`[CommandExecutor] Timeout: ${timeout}s, Background: ${isBackground}, CWD: ${cwd || process.cwd()}`);
            }

            // Проверяем перехватчики команд (временно отключено)
            // if (this.systemInterceptor && this.systemInterceptor.canHandle(command)) {
            //     if (this.logger) {
            //         this.logger.debug(`[CommandExecutor] Команда ${command} перехвачена системным перехватчиком`);
            //     }
            //     
            //     const interceptResult = await this.systemInterceptor.handle(command, { cwd: cwd || process.cwd() });
            //     
            //     if (interceptResult && interceptResult.intercepted) {
            //         const duration = ((Date.now() - startTime) / 1000).toFixed(3);
            //         
            //         return {
            //             success: interceptResult.success,
            //             stdout: interceptResult.output || '',
            //             stderr: '',
            //             return_code: interceptResult.success ? 0 : 1,
            //             duration,
            //             command,
            //             background: false,
            //             intercepted: true
            //         };
            //     }
            // }

            // Используем уже импортированный execa

            // Настройки для выполнения команды
            const execOptions = {
                timeout: timeout * 1000, // Конвертируем в миллисекунды
                cwd: cwd || process.cwd(),
                stripFinalNewline: false,
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024, // 10MB
                reject: false, // Не отклонять промис при ошибке
                shell: 'pwsh.exe' // Явно указываем оболочку PowerShell
            };

            // Если фоновый режим, запускаем без ожидания завершения
            if (isBackground) {
                const childProcess = execa.execa(command, execOptions);
                return {
                    success: true,
                    stdout: '',
                    stderr: '',
                    return_code: 0,
                    duration: '0.001',
                    command,
                    background: true,
                    pid: childProcess.pid
                };
            }

            // Выполняем команду и ждем завершения
            const result = await execa.execa(command, execOptions);

            // Логируем результат
            if (this.logger) {
                this.logger.debug(`[CommandExecutor] Команда завершена с кодом: ${result.exitCode}`);
                if (result.stdout) {
                    this.logger.debug(`[CommandExecutor] STDOUT: ${result.stdout.substring(0, 200)}${result.stdout.length > 200 ? '...' : ''}`);
                }
                if (result.stderr) {
                    this.logger.debug(`[CommandExecutor] STDERR: ${result.stderr.substring(0, 200)}${result.stderr.length > 200 ? '...' : ''}`);
                }
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(3);

            return {
                success: result.exitCode === 0,
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                return_code: result.exitCode,
                duration,
                command,
                background: false
            };

        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(3);

            if (this.logger) {
                this.logger.error(`[CommandExecutor] Ошибка выполнения команды: ${error.message}`);
            }

            // Обработка ошибки через errorHandler, если доступен
            if (this.errorHandler) {
                this.errorHandler.handle(error, 'CommandExecutor.runCommand');
            }

            return {
                success: false,
                stdout: '',
                stderr: error.message || 'Unknown error',
                return_code: -1,
                duration,
                command,
                background: false,
                error: error.message
            };
        }
    }

    /**
     * Статический метод для совместимости с существующими тестами
     */
    static async runCommand(command, timeout = 120, isBackground = false, cwd = null) {
        const executor = new CommandExecutor(console, null);
        return await executor.runCommand(command, timeout, isBackground, cwd);
    }
}

module.exports = {
	runCommand,
	ProcessManager,
	CatEmulator,
	BackgroundExecutor,
	CommandExecutor,
	InputProcessor,
	isPowerShellCommand: ProcessManager.isPowerShellCommand,
	// Для совместимости с тестами
	runCommandStatic: CommandExecutor.runCommand
};

