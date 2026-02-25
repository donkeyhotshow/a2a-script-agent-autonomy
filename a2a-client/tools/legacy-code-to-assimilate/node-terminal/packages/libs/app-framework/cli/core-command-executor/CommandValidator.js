import { AppError } from './CommandErrors.js';

/**
 * Валидатор команд
 */
class CommandValidator {
  constructor(config) {
    this.config = config;
  }

  /**
   * Валидация запроса команды
   */
  validateRequest(request) {
    if (!request) {
      throw new AppError('Request cannot be null or undefined', 'VALIDATION_ERROR', 400);
    }
    if (!request.command || request.command.trim().length === 0) {
      throw new AppError('Command cannot be empty', 'VALIDATION_ERROR', 400);
    }

    if (request.command.length > this.config.security.maxCommandLength) {
      throw new AppError(
        `Command length exceeds maximum of ${this.config.security.maxCommandLength} characters`,
        'VALIDATION_ERROR',
        400
      );
    }

    if (request.timeout !== undefined && request.timeout !== null && request.timeout <= 0) {
      throw new AppError('Timeout must be positive', 'VALIDATION_ERROR', 400);
    }

    // Проверка заблокированных команд
    if (this.config.security.blockedCommands.length > 0) {
      const command = request.command.toLowerCase();
      for (const blocked of this.config.security.blockedCommands) {
        if (command.includes(blocked.toLowerCase())) {
          throw new AppError(
            `Command contains blocked pattern: ${blocked}`,
            'SECURITY_ERROR',
            403
          );
        }
      }
    }

    // Проверка разрешенных команд (если указаны)
    if (this.config.security.allowedCommands.length > 0) {
      const command = request.command.toLowerCase();
      const isAllowed = this.config.security.allowedCommands.some(allowed =>
        command.includes(allowed.toLowerCase())
      );
      
      if (!isAllowed) {
        throw new AppError(
          'Command not in allowed list',
          'SECURITY_ERROR',
          403
        );
      }
    }
  }
}

export { CommandValidator };
