/**
 * Error Management библиотеки - управление ошибками
 */

// Импортируем все error-management модули
import * as handler from './error-handler/index.js';
import * as reporter from '@libs/app-framework/error-handling/error-report-manager/index.cjs';
import * as recovery from './error-operations/index.js';

// Экспортируем все модули
const ErrorManagement = {
  // Обработчик ошибок
  ...handler,
  
  // Репортер ошибок
  ...reporter,
  
  // Восстановление после ошибок
  ...recovery
};

export default ErrorManagement;
