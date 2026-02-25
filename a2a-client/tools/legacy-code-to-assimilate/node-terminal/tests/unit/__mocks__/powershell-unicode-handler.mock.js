/**
 * Mock для PowerShellUnicodeHandler
 * Предоставляет методы для работы с Unicode в PowerShell среде
 */

export class PowerShellUnicodeHandler {
  constructor() {
    this.encoding = 'utf8';
    this.isWindows = process.platform === 'win32';
    this.powerShellAvailable = this.isWindows;
  }

  /**
   * Определяет, является ли команда PowerShell командой
   */
  isPowerShellCommand(command) {
    if (typeof command !== 'string') {
      return false;
    }

    const psPatterns = [
      /^Write-(Output|Host|Warning|Error|Debug)\b/i,
      /^Get-\w+/i,
      /^Set-\w+/i,
      /^New-\w+/i,
      /^Remove-\w+/i,
      /^Invoke-\w+/i,
      /^Start-\w+/i,
      /^Stop-\w+/i,
      /^\$\w+/i, // Переменные PowerShell
      /^\[.*\]\s*::/i, // Статические методы
      /^powershell\.exe\b/i,
      /^pwsh\b/i
    ];

    return psPatterns.some(pattern => pattern.test(command.trim()));
  }

  /**
   * Получает настройки кодировки для PowerShell
   */
  getEncodingSettings() {
    return {
      inputEncoding: this.encoding,
      outputEncoding: this.encoding,
      consoleEncoding: this.encoding,
      defaultEncoding: 'utf8',
      supportedEncodings: ['utf8', 'cp1251', 'ascii', 'utf16']
    };
  }

  /**
   * Устанавливает кодировку для PowerShell
   */
  setEncoding(encoding) {
    if (!encoding || typeof encoding !== 'string') {
      return false;
    }

    const supportedEncodings = ['utf8', 'cp1251', 'ascii', 'utf16'];
    if (!supportedEncodings.includes(encoding.toLowerCase())) {
      return false;
    }

    this.encoding = encoding.toLowerCase();
    return true;
  }

  /**
   * Конвертирует команду для корректной работы с Unicode в PowerShell
   */
  convertCommand(command) {
    if (!command || typeof command !== 'string') {
      return '';
    }

    // Если это не PowerShell команда, возвращаем как есть
    if (!this.isPowerShellCommand(command)) {
      return command;
    }

    // Добавляем настройки кодировки для PowerShell команд
    const encodingFlag = `-Encoding ${this.encoding.toUpperCase()}`;
    
    // Для команд вывода добавляем кодировку
    if (/^Write-(Output|Host)/i.test(command)) {
      return `${command} ${encodingFlag}`;
    }

    // Для команд чтения файлов добавляем кодировку
    if (/^Get-Content/i.test(command)) {
      return `${command} ${encodingFlag}`;
    }

    return command;
  }

  /**
   * Обрабатывает вывод PowerShell на проблемы с кодировкой
   */
  processOutput(output) {
    if (typeof output !== 'string') {
      return {
        processed: output,
        hasEncodingIssues: false,
        issues: []
      };
    }

    const issues = [];
    let processed = output;

    // Проверяем на символы замены Unicode
    if (output.includes('\uFFFD')) {
      issues.push('unicode_replacement_characters');
      processed = processed.replace(/\uFFFD/g, '?');
    }

    // Проверяем на null символы
    if (output.includes('\u0000')) {
      issues.push('null_characters');
      processed = processed.replace(/\u0000/g, '');
    }

    // Проверяем на невалидные символы управления
    const controlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
    if (controlChars.test(output)) {
      issues.push('control_characters');
      processed = processed.replace(controlChars, '');
    }

    // Проверяем нормализацию Unicode
    try {
      const normalized = output.normalize();
      if (output !== normalized) {
        issues.push('non_normalized_unicode');
        processed = normalized;
      }
    } catch (error) {
      issues.push('unicode_normalization_error');
    }

    return {
      processed,
      hasEncodingIssues: issues.length > 0,
      issues,
      originalLength: output.length,
      processedLength: processed.length
    };
  }

  /**
   * Получает информацию о системе
   */
  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      isWindows: this.isWindows,
      hasPowerShell: this.powerShellAvailable,
      encoding: this.encoding,
      locale: process.env.LANG || process.env.LC_ALL || 'en_US.UTF-8'
    };
  }

  /**
   * Создает безопасную команду для PowerShell
   */
  createSafeCommand(command) {
    if (!command || typeof command !== 'string') {
      return '""';
    }

    // Экранируем одинарные кавычки для PowerShell
    let safeCommand = command.replace(/'/g, "''");
    
    // Оборачиваем в двойные кавычки
    safeCommand = `"${safeCommand}"`;
    
    return safeCommand;
  }

  /**
   * Проверяет доступность PowerShell
   */
  checkPowerShellAvailability() {
    return {
      available: this.powerShellAvailable,
      version: this.powerShellAvailable ? '5.1' : null,
      executable: this.powerShellAvailable ? 'powershell.exe' : null,
      isWindows: this.isWindows
    };
  }

  /**
   * Генерирует команды для настройки кодировки в PowerShell
   */
  generateEncodingSetupCommands() {
    if (!this.powerShellAvailable) {
      return [];
    }

    return [
      `[Console]::OutputEncoding = [System.Text.Encoding]::${this.encoding.toUpperCase()}`,
      `[Console]::InputEncoding = [System.Text.Encoding]::${this.encoding.toUpperCase()}`,
      `$OutputEncoding = [System.Text.Encoding]::${this.encoding.toUpperCase()}`,
      `$PSDefaultParameterValues['*:Encoding'] = '${this.encoding.toUpperCase()}'`
    ];
  }

  /**
   * Валидирует Unicode переменные PowerShell
   */
  validatePowerShellVariables(variables) {
    if (!Array.isArray(variables)) {
      return { valid: false, issues: ['Variables must be an array'] };
    }

    const issues = [];
    const validVariables = [];

    for (const variable of variables) {
      if (typeof variable !== 'string') {
        issues.push(`Invalid variable type: ${typeof variable}`);
        continue;
      }

      // Проверяем имя переменной на корректность
      if (!/^\$[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
        issues.push(`Invalid variable name: ${variable}`);
        continue;
      }

      // Проверяем на Unicode символы в имени
      if (/[^\x00-\x7F]/.test(variable)) {
        issues.push(`Unicode characters in variable name: ${variable}`);
        continue;
      }

      validVariables.push(variable);
    }

    return {
      valid: issues.length === 0,
      issues,
      validVariables,
      totalVariables: variables.length,
      validCount: validVariables.length
    };
  }

  /**
   * Обрабатывает файловые операции с Unicode
   */
  handleFileOperation(operation, path, content = null) {
    const operations = {
      read: () => this.simulateFileRead(path),
      write: () => this.simulateFileWrite(path, content),
      delete: () => this.simulateFileDelete(path),
      exists: () => this.simulateFileExists(path)
    };

    const handler = operations[operation];
    if (!handler) {
      return {
        success: false,
        error: `Unsupported operation: ${operation}`
      };
    }

    try {
      return handler();
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Симулирует чтение файла
   */
  simulateFileRead(path) {
    // Симулируем чтение файла с различным содержимым
    const mockContent = {
      'test-utf8.txt': 'Привет мир! Hello World! 🌍',
      'test-cp1251.txt': 'Привет мир! (CP1251)',
      'test-unicode.txt': 'Unicode: 😀 🚀 💻 © ® ™ € $ ¥',
      'test-empty.txt': '',
      'test-binary.txt': Buffer.from([0x00, 0x01, 0x02, 0xFF])
    };

    const content = mockContent[path] || 'Default content';
    
    return {
      success: true,
      content: typeof content === 'string' ? content : content.toString('hex'),
      encoding: this.encoding,
      size: typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.length
    };
  }

  /**
   * Симулирует запись файла
   */
  simulateFileWrite(path, content) {
    if (!content) {
      return {
        success: false,
        error: 'No content provided'
      };
    }

    return {
      success: true,
      path,
      size: Buffer.byteLength(content, 'utf8'),
      encoding: this.encoding
    };
  }

  /**
   * Симулирует удаление файла
   */
  simulateFileDelete(path) {
    return {
      success: true,
      path,
      deleted: true
    };
  }

  /**
   * Симулирует проверку существования файла
   */
  simulateFileExists(path) {
    const existingFiles = ['test-utf8.txt', 'test-cp1251.txt', 'test-unicode.txt'];
    return {
      success: true,
      exists: existingFiles.includes(path)
    };
  }
}

export default PowerShellUnicodeHandler;
