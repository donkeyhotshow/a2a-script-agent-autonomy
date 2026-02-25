const { EventEmitter } = require('events');
const { HandlerState, ToolType } = require('./HandlerEnums');
const { HandlerError, ValidationError, SecurityError } = require('./HandlerErrors');

/**
 * Базовый класс обработчика инструментов
 */
class BaseToolHandler extends EventEmitter {
  constructor(server, name) {
    super();
    this.server = server;
    this.name = name;
    this.logger = server.logger;
    this.config = server.config;
    this.state = HandlerState.PENDING;
  }

  /**
   * Получение списка инструментов
   */
  getTools() {
    return [];
  }

  /**
   * Валидация параметров
   */
  validateParams(args) {
    return { valid: true, errors: [] };
  }

  /**
   * Обработка запроса
   */
  async handleRequest(id, args) {
    throw new Error(`Handler ${this.name} must implement handleRequest`);
  }

  /**
   * Получение статуса
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      uptime: process.uptime()
    };
  }

  /**
   * Очистка ресурсов
   */
  async cleanup() {
    this.state = HandlerState.CANCELLED;
  }
}

/**
 * Обработчик терминальных команд
 */
class TerminalHandler extends BaseToolHandler {
  constructor(server) {
    super(server, 'terminal');
    this.commandExecutor = server.commandExecutor;
    this.securityAnalyzer = server.securityAnalyzer;
  }

  getTools() {
    return [
      {
        name: 'terminal_exec',
        description: 'Выполнение терминальных команд',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['exec'] },
            command: { type: 'string' },
            cwd: { type: 'string' },
            timeout: { type: 'number' },
            is_background: { type: 'boolean' }
          },
          required: ['action']
        }
      }
    ];
  }

  validateParams(args) {
    const errors = [];

    if (!args.action) {
      errors.push('Action is required');
    }

    if (args.action === 'exec' && !args.command) {
      errors.push('Command is required for exec action');
    }

    if (args.timeout && (args.timeout <= 0 || args.timeout > 300000)) {
      errors.push('Timeout must be between 1 and 300000 ms');
    }

    if (args.command && args.command.length > 10000) {
      errors.push('Command length exceeds maximum of 10000 characters');
    }

    return { valid: errors.length === 0, errors };
  }

  async handleRequest(id, args) {
    this.state = HandlerState.PROCESSING;

    try {
      // Валидация
      const validation = this.validateParams(args);
      if (!validation.valid) {
        throw new ValidationError(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const { action, command, cwd, timeout, is_background } = args;

      switch (action) {
        case 'exec':
          return await this.handleExec(id, { command, cwd, timeout, is_background });
        case 'help':
          return this.handleHelp();
        default:
          throw new ValidationError(`Unknown action: ${action}`);
      }

    } catch (error) {
      this.state = HandlerState.FAILED;
      this.emit('error', error);
      throw error;
    } finally {
      this.state = HandlerState.COMPLETED;
    }
  }

  async handleExec(id, { command, cwd, timeout, is_background }) {
    // Анализ безопасности
    const securityResult = await this.securityAnalyzer.analyzeCommand(command);
    if (!securityResult.safe) {
      throw new SecurityError(
        `Command blocked: ${securityResult.reason}`,
        securityResult.reason
      );
    }

    // Выполнение команды
    const result = await this.commandExecutor.execute({
      command,
      cwd: cwd || process.cwd(),
      timeout: timeout || 30000,
      env: { ...process.env, BACKGROUND: is_background ? '1' : '0' }
    });

    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      duration: result.duration,
      metadata: {
        command,
        cwd: result.metadata.cwd,
        pid: result.metadata.pid,
        platform: result.metadata.platform
      }
    };
  }

  handleHelp() {
    return {
      help: `
Terminal Handler Commands:
- exec: Execute terminal command
  Parameters:
    command: Command to execute
    cwd: Working directory (optional)
    timeout: Timeout in milliseconds (optional)
    is_background: Run in background (optional)
- help: Show this help
      `.trim()
    };
  }
}

export { TerminalHandler, BaseToolHandler };
