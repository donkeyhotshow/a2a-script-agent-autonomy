'use strict';

/**
 * Обёртка для CommandExecutor, которая использует реальный execa из node_modules проекта
 * вместо мока из библиотеки C:\apps\libs
 * 
 * Основные возможности:
 * - Фильтрует ANSI escape-коды для чистого вывода
 * - Автоматически устанавливает UTF-8 кодировку в PowerShell для корректной работы с Unicode
 * - Корректно обрабатывает превышение таймаута (код 124)
 * - Обрабатывает ошибки запуска в фоновом режиме
 * - Нормализует Unix-команды для Windows PowerShell
 * 
 * Исправления (2025-12-03):
 * - Добавлена автоматическая установка UTF-8 кодировки перед выполнением команды
 * - Улучшена обработка таймаута с возвратом кода 124 и сообщения об ошибке
 * - Добавлена обработка ошибок запуска в фоновом режиме
 * - Исправлена потеря данных при большом выводе
 */

const path = require('path');
const { spawn } = require('child_process');

/**
 * Удаляет ANSI escape-коды из строки
 * @param {string} text - Текст с возможными ANSI escape-кодами
 * @returns {string} - Текст без ANSI escape-кодов
 */
function stripAnsiCodes(text) {
  if (typeof text !== 'string') return text;
  // Удаляем ANSI escape-коды (например, [32;1m, [0m, [31;1m и т.д.)
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Нормализует команды для Windows PowerShell
 * Преобразует Unix-команды в PowerShell эквиваленты
 * @param {string} command - Исходная команда
 * @returns {string} - Нормализованная команда для Windows
 */
function normalizeCommandForWindows(command) {
  if (typeof command !== 'string') return command;
  
  // Убираем пробелы в начале и конце
  const trimmed = command.trim();
  
  // Если команда уже начинается с PowerShell команды или переменной, не трогаем
  if (trimmed.startsWith('$') || trimmed.startsWith('Get-') || trimmed.startsWith('Set-') || 
      trimmed.startsWith('Remove-') || trimmed.startsWith('New-') || trimmed.startsWith('Test-')) {
    return command;
  }
  
  let normalized = trimmed;
  
  // ls -la -> Get-ChildItem -Force (показывает все файлы включая скрытые)
  // ls -l -> Get-ChildItem (детальный список)
  // ls -a -> Get-ChildItem -Force (показывает скрытые)
  // ls -> оставляем как есть (ls это алиас Get-ChildItem в PowerShell)
  if (/^ls\s/.test(normalized)) {
    // Разбираем команду: ls [флаги] [путь]
    const lsMatch = normalized.match(/^ls\s+(.*)$/);
    if (lsMatch) {
      let args = lsMatch[1].trim();
      
      // Проверяем наличие флагов -la, -a -l, -l -a, --all
      // Используем более точные проверки для флагов
      const hasLaFlag = /(^|\s)-la(\s|$)/.test(' ' + args + ' ');
      const hasAllFlag = hasLaFlag || /(^|\s)--all(\s|$)/.test(' ' + args + ' ');
      const hasAFlag = /(^|\s)-a(\s|$)/.test(' ' + args + ' ');
      const hasLFlag = /(^|\s)-l(\s|$)/.test(' ' + args + ' ');
      
      // Определяем, нужно ли показывать скрытые файлы
      const needsForce = hasAllFlag || (hasAFlag && hasLFlag) || (hasAFlag && !hasLFlag);
      
      // Убираем Unix-флаги из аргументов, сохраняя пути
      // Заменяем флаги на пробелы, затем убираем лишние пробелы
      args = (' ' + args + ' ')
        .replace(/(\s)-la(\s)/g, ' ')  // -la
        .replace(/(\s)--all(\s)/g, ' ')  // --all
        .replace(/(\s)-a(\s)/g, ' ')    // -a
        .replace(/(\s)-l(\s)/g, ' ')    // -l
        .replace(/\s+/g, ' ')           // множественные пробелы в один
        .trim();
      
      // Формируем PowerShell команду
      let psCommand = 'Get-ChildItem';
      if (needsForce) {
        psCommand += ' -Force';
      }
      if (args) {
        psCommand += ' ' + args;
      }
      
      normalized = psCommand;
    }
  }
  
  // pwd -> Get-Location или $PWD
  if (/^pwd(\s|$)/.test(normalized)) {
    normalized = normalized.replace(/^pwd/, 'Get-Location');
  }
  
  // cat -> Get-Content
  if (/^cat\s+/.test(normalized)) {
    normalized = normalized.replace(/^cat\s+/, 'Get-Content ');
  }
  
  // grep -> Select-String (но это сложнее, так как нужно сохранить паттерн)
  // Пока оставляем как есть, так как grep может быть установлен через Git Bash или WSL
  
  // rm -> Remove-Item
  if (/^rm\s+/.test(normalized)) {
    normalized = normalized.replace(/^rm\s+/, 'Remove-Item ');
  }
  
  // mkdir -> New-Item -ItemType Directory
  if (/^mkdir\s+/.test(normalized)) {
    normalized = normalized.replace(/^mkdir\s+/, 'New-Item -ItemType Directory -Path ');
  }
  
  // rmdir -> Remove-Item
  if (/^rmdir\s+/.test(normalized)) {
    normalized = normalized.replace(/^rmdir\s+/, 'Remove-Item ');
  }
  
  return normalized;
}

// Импортируем реальный execa из node_modules проекта
let execa;
try {
  // Пытаемся найти execa в node_modules проекта
  const projectRoot = path.resolve(__dirname, '../..');
  const execaPath = require.resolve('execa', { paths: [projectRoot] });
  execa = require(execaPath);
} catch (e) {
  // Если не нашли, пытаемся импортировать напрямую
  try {
    execa = require('execa');
  } catch (e2) {
    throw new Error(`Failed to import execa: ${e.message}. Please install execa: npm install execa`);
  }
}

class CommandExecutorWrapper {
  constructor(logger, errorHandler) {
    this.logger = logger || console;
    this.errorHandler = errorHandler;
  }

  /**
   * Выполняет команду и возвращает Promise с результатом
   * 
   * Автоматически устанавливает UTF-8 кодировку в PowerShell для корректной работы с Unicode.
   * Корректно обрабатывает таймауты и ошибки запуска в фоновом режиме.
   * 
   * @param {string} command - Команда для выполнения
   * @param {number} timeout - Таймаут в секундах (по умолчанию 120)
   * @param {boolean} isBackground - Фоновый режим (по умолчанию false)
   * @param {string} cwd - Рабочая директория (по умолчанию process.cwd())
   * @returns {Promise<Object>} Результат выполнения команды с полями:
   *   - success: boolean - успешность выполнения
   *   - stdout: string - стандартный вывод
   *   - stderr: string - стандартный вывод ошибок
   *   - return_code: number - код возврата (124 для таймаута)
   *   - exitCode: number - код выхода процесса
   *   - duration: string - длительность выполнения в секундах
   *   - command: string - выполненная команда
   *   - background: boolean - флаг фонового режима
   *   - timedOut: boolean - флаг превышения таймаута (если применимо)
   *   - pid: number - ID процесса (для фонового режима)
   */
  async runCommand(command, timeout = 120, isBackground = false, cwd = null) {
    const startTime = Date.now();
    
    try {
      // Логируем начало выполнения команды
      if (this.logger && this.logger.info) {
        this.logger.info(`[CommandExecutor] Выполнение команды: ${command}`);
        this.logger.debug(`[CommandExecutor] Timeout: ${timeout}s, Background: ${isBackground}, CWD: ${cwd || process.cwd()}`);
      }

      // Определяем оболочку для Windows
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'pwsh.exe' : '/bin/sh';
      
      // Нормализуем команду для Windows (преобразуем Unix-команды в PowerShell)
      if (isWindows) {
        const originalCommand = command;
        command = normalizeCommandForWindows(command);
        if (command !== originalCommand && this.logger && this.logger.debug) {
          this.logger.debug(`[CommandExecutor] Нормализована команда для Windows: "${originalCommand}" -> "${command}"`);
        }
      }
      
      // Отключаем цвета в PowerShell для чистого вывода (убираем ANSI escape-коды)
      // И устанавливаем UTF-8 кодировку для корректной работы с Unicode
      const env = { ...process.env };
      if (isWindows) {
        // Отключаем цвета через переменную окружения PowerShell
        env.POWERSHELL_UPDATECHECK = 'Off';
        
        // Устанавливаем UTF-8 кодировку для PowerShell перед выполнением команды
        // Это исправляет проблему с искажением Unicode символов (кириллица, китайские иероглифы, эмодзи)
        // Исправление от 2025-12-03: автоматическая установка кодировки для всех команд
        const setupCmd = [
          '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
          '[Console]::InputEncoding = [System.Text.Encoding]::UTF8',
          '$OutputEncoding = [System.Text.Encoding]::UTF8',
          '$PSStyle.OutputRendering = \'PlainText\''
        ].join('; ') + '; ';
        
        command = setupCmd + command;
      }
      
      const execOptions = {
        cwd: cwd || process.cwd(),
        timeout: timeout * 1000, // execa использует миллисекунды
        shell: shell,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
        reject: false, // Не выбрасывать ошибку при ненулевом exitCode
        env: env
      };

      // Если фоновый режим, запускаем без ожидания завершения
      if (isBackground) {
        // execa может быть функцией или объектом с методом execa
        const execaFn = typeof execa === 'function' ? execa : execa.execa;
        const childProcess = execaFn(command, execOptions);
        
        // Обрабатываем ошибки запуска процесса
        let startupError = null;
        childProcess.on('error', (error) => {
          startupError = error;
          if (this.logger && this.logger.error) {
            this.logger.error(`[CommandExecutor] Ошибка запуска фонового процесса: ${error.message}`);
          }
        });
        
        // Ждем немного, чтобы проверить, запустился ли процесс
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Если была ошибка запуска, возвращаем ошибку
        if (startupError) {
          return {
            success: false,
            stdout: '',
            stderr: startupError.message || 'Failed to start background process',
            return_code: 1,
            exitCode: 1,
            duration: '0',
            command: command,
            background: true,
            error: startupError.message
          };
        }
        
        return Promise.resolve({
          success: true,
          stdout: '',
          stderr: '',
          return_code: 0,
          exitCode: 0,
          duration: '0',
          command: command,
          background: true,
          pid: childProcess.pid
        });
      }

      // Выполняем команду и ждем завершения
      // execa может быть функцией или объектом с методом execa
      const execaFn = typeof execa === 'function' ? execa : execa.execa;
      let result;
      let timeoutOccurred = false;
      
      try {
        result = await execaFn(command, execOptions);
      } catch (error) {
        // Проверяем, была ли это ошибка таймаута
        if (error.timedOut || error.signal === 'SIGTERM' || error.message?.includes('timeout')) {
          timeoutOccurred = true;
          if (this.logger && this.logger.warn) {
            this.logger.warn(`[CommandExecutor] Команда превысила таймаут ${timeout} секунд`);
          }
          // Создаем результат с информацией о таймауте
          result = {
            stdout: result?.stdout || '',
            stderr: (result?.stderr || '') + `\n[ERROR] Command exceeded timeout of ${timeout} seconds`,
            exitCode: 124, // Стандартный код для таймаута
            timedOut: true
          };
        } else if (error.stdout !== undefined || error.stderr !== undefined || error.exitCode !== undefined) {
          // execa может выбрасывать ошибку при ненулевом exitCode, но содержит stdout/stderr
          // Используем error как результат, если он содержит нужные поля
          result = error;
        } else {
          throw error;
        }
      }

      // Логируем результат
      if (this.logger && this.logger.debug) {
        this.logger.debug(`[CommandExecutor] Команда завершена с кодом: ${result.exitCode}`);
        if (result.stdout) {
          this.logger.debug(`[CommandExecutor] STDOUT: ${result.stdout.substring(0, 200)}`);
        }
        if (result.stderr) {
          this.logger.debug(`[CommandExecutor] STDERR: ${result.stderr.substring(0, 200)}`);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(3);
      
      // execa возвращает exitCode (может быть 0, число или undefined)
      // Если undefined, считаем успешным выполнение (0)
      // Если был таймаут, используем код 124
      const exitCode = timeoutOccurred ? 124 : 
                       (result.exitCode !== undefined && result.exitCode !== null ? result.exitCode : 0);

      // Фильтруем ANSI escape-коды из вывода для чистого результата
      const cleanStdout = stripAnsiCodes(result.stdout || '');
      const cleanStderr = stripAnsiCodes(result.stderr || '');

      return {
        success: exitCode === 0 && !timeoutOccurred,
        stdout: cleanStdout,
        stderr: cleanStderr,
        return_code: exitCode,
        exitCode: exitCode,
        duration: duration,
        command: command,
        background: false,
        timedOut: timeoutOccurred || false
      };

    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(3);
      
      // Логируем ошибку
      if (this.logger && this.logger.error) {
        this.logger.error(`[CommandExecutor] Ошибка выполнения команды: ${error.message}`);
      }

      // Обработка ошибки через errorHandler, если доступен
      if (this.errorHandler && this.errorHandler.handleError) {
        this.errorHandler.handleError(error);
      }

      return {
        success: false,
        stdout: '',
        stderr: error.message || '',
        return_code: error.exitCode || 1,
        exitCode: error.exitCode || 1,
        duration: duration,
        command: command,
        background: false,
        error: error.message
      };
    }
  }

  /**
   * Метод execute для совместимости с API, который принимает объект параметров
   * @param {Object} options - Параметры выполнения команды
   * @param {string} options.command - Команда для выполнения
   * @param {string} [options.cwd] - Рабочая директория
   * @param {number} [options.timeout] - Таймаут в миллисекундах (будет преобразован в секунды)
   * @param {boolean} [options.isBackground] - Фоновый режим (может быть is_background)
   * @returns {Promise<Object>} Результат выполнения команды
   */
  async execute(options = {}) {
    const {
      command,
      cwd = null,
      timeout = 120000, // По умолчанию 120 секунд (в миллисекундах)
      isBackground = false,
      is_background = false // Поддержка обоих вариантов имени параметра
    } = options;

    if (!command) {
      throw new Error('Command is required');
    }

    // Преобразуем таймаут из миллисекунд в секунды для runCommand
    const timeoutSeconds = timeout / 1000;
    
    // Поддерживаем оба варианта имени параметра
    const background = isBackground || is_background;

    return this.runCommand(command, timeoutSeconds, background, cwd);
  }
}

module.exports = { CommandExecutor: CommandExecutorWrapper };
