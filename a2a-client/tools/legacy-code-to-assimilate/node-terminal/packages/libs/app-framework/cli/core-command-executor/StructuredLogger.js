/**
 * Структурированный логгер
 */
class StructuredLogger {
  constructor(logger) {
    this.logger = logger;
  }

  logCommand(data) {
    if (!this.logger) {
      return; // Игнорируем логирование если logger не установлен
    }

    const logData = {
      type: 'command_execution',
      timestamp: new Date().toISOString(),
      ...data
    };

    switch (data.state) {
      case 'pending':
        this.logger.info('Command execution started', logData);
        break;
      case 'running':
        this.logger.info('Command execution running', logData);
        break;
      case 'completed':
        this.logger.info('Command execution completed', logData);
        break;
      case 'failed':
        this.logger.error('Command execution failed', logData);
        break;
      case 'cancelled':
        this.logger.warn('Command execution cancelled', logData);
        break;
      case 'timeout':
        this.logger.error('Command execution timed out', logData);
        break;
      default:
        this.logger.info('Command execution state change', logData);
    }
  }
}

export default StructuredLogger;
