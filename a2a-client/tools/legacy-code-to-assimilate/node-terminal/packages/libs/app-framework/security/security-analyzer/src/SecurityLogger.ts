/**
 * Интерфейс для логгера
 */
export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

/**
 * Интерфейс для структурированного логгера
 */
export interface StructuredLogger {
  logSecurity(event: any): void; // Using any for SecurityEvent to avoid circular dependency
  logError(error: Error, context?: Record<string, unknown>): void;
}

/**
 * Создание логгера по умолчанию
 */
function createDefaultLogger(): Logger {
  return {
    info: (message: string, context?: Record<string, unknown>) => 
      console.log(`[INFO] ${message}`, context || ''),
    warn: (message: string, context?: Record<string, unknown>) => 
      console.warn(`[WARN] ${message}`, context || ''),
    error: (message: string, context?: Record<string, unknown>) => 
      console.error(`[ERROR] ${message}`, context || ''),
    debug: (message: string, context?: Record<string, unknown>) => 
      console.debug(`[DEBUG] ${message}`, context || '')
  };
}

/**
 * Создание структурированного логгера по умолчанию
 */
function createDefaultStructuredLogger(): StructuredLogger {
  return {
    logSecurity: (event: any) => { // Using any for SecurityEvent to avoid circular dependency
      console.log('[SECURITY]', JSON.stringify(event, null, 2));
    },
    logError: (error: Error, context?: Record<string, unknown>) => {
      console.error('[SECURITY_ERROR]', error.message, context || '');
    }
  };
}

export { Logger, StructuredLogger, createDefaultLogger, createDefaultStructuredLogger };
