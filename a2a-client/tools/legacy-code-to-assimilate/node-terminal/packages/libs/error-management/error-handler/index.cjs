/**
 * Unified Error Handling Library - Re-export from core/error-core
 * Объединенная библиотека обработки ошибок - реэкспорт из core/error-core
 * 
 * This file provides backward compatibility by re-exporting from the canonical
 * error handling implementation in core/error-core/.
 * 
 * Feature flag: USE_CORE_ERROR_HANDLER (default: false)
 */

const { ErrorCoreManager, ...errorClasses } = require('../../core/error-core/index.cjs');
const { defaultLogger } = require('../../logging-monitoring/logging/index.cjs'); // Node.js version of logger
const { unifiedConfigManager } = require('@libs/config-unified/index.cjs');
const { ValidationUtils } = require('../../validation/validation/index.cjs');

const validationUtils = new ValidationUtils();

class ErrorHandlingUtils {
  constructor(options = {}) {
    // Ensure logger is provided
    if (!options.logger) {
      throw new Error('[ErrorHandlingUtils] Logger instance must be provided.');
    }
    this.errorCoreManager = new ErrorCoreManager(options);

    // Expose internal properties for testing or compatibility if needed
    this.errorHistory = this.errorCoreManager.errorHistory;
    this.errorCounts = this.errorCoreManager.errorCounts;
    this.retryCounts = this.errorCoreManager.retryCounts;
    this.md5Cache = this.errorCoreManager.md5Cache;
    this.logger = this.errorCoreManager.logger;
    this.errorLogPath = this.errorCoreManager.errorLogPath;
    this.reportDir = this.errorCoreManager.reportDir;
    this.maxHistorySize = this.errorCoreManager.maxHistorySize;
    this.projectRoot = this.errorCoreManager.projectRoot;
    this.maxRetries = this.errorCoreManager.maxRetries;
    this.retryDelays = this.errorCoreManager.retryDelays;
  }

  async initialize() {
    return this.errorCoreManager.initialize();
  }

  async ensureErrorLogFile() {
    return this.errorCoreManager.ensureErrorLogFile();
  }

  generateParametersHash(params) {
    return this.errorCoreManager.generateParametersHash(params);
  }

  async logError(error, context) {
    return this.errorCoreManager.registerError(error, context);
  }

  async createErrorReport(options) {
    return this.errorCoreManager.createErrorReport(options);
  }

  async checkExistingError(errorHash, customWorkDir) {
    return this.errorCoreManager.checkExistingError(errorHash, customWorkDir);
  }

  async handleServiceError(serviceId, error) {
    return this.errorCoreManager.handleServiceError(serviceId, error);
  }

  async handleCriticalError(error, context) {
    return this.errorCoreManager.handleCriticalError(error, context);
  }

  async sendCriticalNotification(errorEntry) {
    return this.errorCoreManager.sendCriticalNotification(errorEntry);
  }

  async handleWithFallback(mainOperation, fallbackOperation) {
    return this.errorCoreManager.handleWithFallback(mainOperation, fallbackOperation);
  }

  async handleWithRetry(operation, maxRetries, context) {
    return this.errorCoreManager.handleWithRetry(operation, maxRetries, context);
  }

  addErrorToBatch(error, parameters) {
    return this.errorCoreManager.addErrorToBatch(error, parameters);
  }

  getErrorStats() {
    return this.errorCoreManager.getErrorStats();
  }

  clearErrorHistory() {
    this.errorCoreManager.clearErrorHistory();
  }

  getErrorsByType(type) {
    return this.errorCoreManager.getErrorsByType(type);
  }

  getErrorsByService(serviceId) {
    return this.errorCoreManager.getErrorsByService(serviceId);
  }

  checkErrorFrequency(threshold, timeWindow) {
    return this.errorCoreManager.checkErrorFrequency(threshold, timeWindow);
  }
}

function validateInput(data, schema, logger) {
  const config = unifiedConfigManager.getFeatureConfig('settings').getConfig();
  const useCoreValidation = config.featureFlags && config.featureFlags.USE_CORE_VALIDATION;

  if (useCoreValidation) {
    defaultLogger.debug('[error-handler] Using unified validation via USE_CORE_VALIDATION flag.');
    const { isValid, errors: validationErrors } = validationUtils.validate(data, schema);

    if (!isValid) {
      const errorDetails = [];
      let firstErrorMessage = 'Ошибки валидации';

      // Iterate through validationErrors object to find the first error message
      for (const fieldKey in validationErrors) {
        if (validationErrors[fieldKey] && Array.isArray(validationErrors[fieldKey])) {
          validationErrors[fieldKey].forEach(msg => {
            if (firstErrorMessage === 'Ошибки валидации') {
              firstErrorMessage = msg; // Set the first specific message as the main message
            }
            errorDetails.push(new errorClasses.ValidationError(msg, fieldKey)); // Use fieldKey here
          });
        }
      }

      if (defaultLogger.error) {
        defaultLogger.error('Ошибки валидации (Unified)', errorDetails);
      }
      throw new errorClasses.ValidationError(firstErrorMessage, null, errorDetails);
    }
    return true;

  } else {
    defaultLogger.debug('[error-handler] Using legacy validation, USE_CORE_VALIDATION flag is false.');
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Handle nested objects for legacy path
      if (rules.type === 'object' && rules.schema && typeof value === 'object' && value !== null) {
        try {
          validateInput(value, rules.schema, logger); // Recursive call
        } catch (e) {
          if (e instanceof errorClasses.ValidationError && e.details) {
            // Append errors from nested validation, adjusting field names and messages
            e.details.forEach(detailError => {
              const nestedField = detailError.field ? `${field}.${detailError.field}` : field; // Construct full nested field name
              const nestedMessage = detailError.message.includes(`Поле ${detailError.field}`) ?
                                    detailError.message.replace(`Поле ${detailError.field}`, `Поле ${nestedField}`) :
                                    detailError.message; // Construct full nested message
              errors.push(new errorClasses.ValidationError(nestedMessage, nestedField));
            });
          } else {
            errors.push(new errorClasses.ValidationError(`Ошибка валидации вложенного объекта ${field}: ${e.message}`));
          }
        }
        continue; // Skip further simple validation for this nested object
      }

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(new errorClasses.ValidationError(`Поле ${field} обязательно`, field));
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          errors.push(new errorClasses.ValidationError(`Поле ${field} должно быть типа ${rules.type}`, field));
        }

        if (rules.minLength && value.length < rules.minLength) {
          errors.push(new errorClasses.ValidationError(`Поле ${field} должно содержать минимум ${rules.minLength} символов`, field));
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(new errorClasses.ValidationError(`Поле ${field} должно содержать максимум ${rules.maxLength} символов`, field));
        }

        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(new errorClasses.ValidationError(`Поле ${field} имеет некорректный формат`, field));
        }

        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(new errorClasses.ValidationError(`Поле ${field} должно быть одним из: ${rules.enum.join(', ')}`, field));
        }
      }
    }

    if (errors.length > 0) {
      let firstErrorMessage = errors[0].message || 'Ошибки валидации'; // Simplified first error message logic
      if (defaultLogger.error) { // Use defaultLogger
        defaultLogger.error(firstErrorMessage, errors); // Changed first argument from 'Ошибки валидации' to firstErrorMessage
      }
      throw new errorClasses.ValidationError(firstErrorMessage, null, errors);
    }

    return true;
  }
}

module.exports = {
  ErrorHandlingUtils: ErrorHandlingUtils, // Use the new class directly
  ...errorClasses,
  validateInput
};

