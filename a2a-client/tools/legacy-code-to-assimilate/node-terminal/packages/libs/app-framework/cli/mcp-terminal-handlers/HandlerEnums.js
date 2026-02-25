/**
 * Состояния обработки
 */
const HandlerState = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Типы инструментов
 */
const ToolType = {
  TERMINAL: 'terminal',
  FILE: 'file',
  SEARCH: 'search',
  ARCHIVE: 'archive',
  ATOMIC: 'atomic',
  POWERSHELL: 'powershell',
  INTERCEPTOR: 'interceptor',
  TEST: 'test'
};

export { HandlerState, ToolType };
