/**
 * Validation Utils - Унифицированные утилиты для валидации
 * Заменяет прямые проверки типов и валидации
 */

const { createValidationError } = require('../../error-management/error-handler/error-utils.cjs');

const typeCheckers = require('./type-checkers.cjs');
const formatValidators = require('./format-validators.cjs');
const validationLogic = require('./validation-logic.cjs');

class ValidationUtils {
  constructor(options = {}) {
    this.strict = options.strict !== false;
    this.throwOnError = options.throwOnError !== false;
  }

  // Делегируем все проверки типов к модулю type-checkers
  isType(value, type) { return typeCheckers.isType(value, type); }
  isString(value) { return typeCheckers.isString(value); }
  isNumber(value) { return typeCheckers.isNumber(value); }
  isBoolean(value) { return typeCheckers.isBoolean(value); }
  isObject(value) { return typeCheckers.isObject(value); }
  isArray(value) { return typeCheckers.isArray(value); }
  isFunction(value) { return typeCheckers.isFunction(value); }
  isUndefined(value) { return typeCheckers.isUndefined(value); }
  isNull(value) { return typeCheckers.isNull(value); }
  isDate(value) { return typeCheckers.isDate(value); }
  isRegExp(value) { return typeCheckers.isRegExp(value); }
  isError(value) { return typeCheckers.isError(value); }
  isPromise(value) { return typeCheckers.isPromise(value); }
  isBuffer(value) { return typeCheckers.isBuffer(value); }
  isEmpty(value) { return typeCheckers.isEmpty(value); }
  isNotEmpty(value) { return typeCheckers.isNotEmpty(value); }
  isStringLength(value, min, max) { return typeCheckers.isStringLength(value, min, max); }
  isArrayLength(value, min, max) { return typeCheckers.isArrayLength(value, min, max); }
  isNumberRange(value, min, max) { return typeCheckers.isNumberRange(value, min, max); }
  isInteger(value) { return typeCheckers.isInteger(value); }
  isPositive(value) { return typeCheckers.isPositive(value); }
  isNegative(value) { return typeCheckers.isNegative(value); }
  isNonNegative(value) { return typeCheckers.isNonNegative(value); }
  isNonPositive(value) { return typeCheckers.isNonPositive(value); }

  // Делегируем все проверки форматов к модулю format-validators
  isEmail(value) { return formatValidators.isEmail(value); }
  isUrl(value) { return formatValidators.isUrl(value); }
  isIpAddress(value) { return formatValidators.isIpAddress(value); }
  isUuid(value) { return formatValidators.isUuid(value); }
  isDateString(value) { return formatValidators.isDateString(value); }
  isJson(value) { return formatValidators.isJson(value); }
  isRegexString(value) { return formatValidators.isRegexString(value); }
  isHexColor(value) { return formatValidators.isHexColor(value); }
  isPhoneNumber(value) { return formatValidators.isPhoneNumber(value); }
  isPassword(value, options) { return formatValidators.isPassword(value, options); }

  // Делегируем все функции валидации к модулю validation-logic
  validate(condition, message, field = null) {
    return validationLogic.validate(condition, message, field, this.throwOnError, createValidationError);
  }

  validateType(value, type, field = null) {
    return validationLogic.validateType(value, type, field, this.throwOnError, createValidationError);
  }

  validateRequired(value, field = null) {
    return validationLogic.validateRequired(value, field, this.throwOnError, createValidationError);
  }

  validateStringLength(value, min, max, field = null) {
    return validationLogic.validateStringLength(value, min, max, field, this.throwOnError, createValidationError);
  }

  validateNumberRange(value, min, max, field = null) {
    return validationLogic.validateNumberRange(value, min, max, field, this.throwOnError, createValidationError);
  }

  validateEmail(value, field = null) {
    return validationLogic.validateEmail(value, field, this.throwOnError, createValidationError);
  }

  validateUrl(value, field = null) {
    return validationLogic.validateUrl(value, field, this.throwOnError, createValidationError);
  }

  validateObject(obj, schema, context = 'object') {
    return validationLogic.validateObject(obj, schema, context, this.throwOnError, createValidationError);
  }

  createRule(validator, message) {
    return validationLogic.createRule(validator, message, this.throwOnError, createValidationError);
  }

  combineRules(...rules) {
    return validationLogic.combineRules(...rules);
  }
}

// Создаем глобальный экземпляр
const globalValidationUtils = new ValidationUtils();

// Экспортируем утилиты
module.exports.ValidationUtils = ValidationUtils;
module.exports.validationUtils = globalValidationUtils;
module.exports.isType = (value, type) => globalValidationUtils.isType(value, type);
module.exports.isString = (value) => globalValidationUtils.isString(value);
module.exports.isNumber = (value) => globalValidationUtils.isNumber(value);
module.exports.isBoolean = (value) => globalValidationUtils.isBoolean(value);
module.exports.isObject = (value) => globalValidationUtils.isObject(value);
module.exports.isArray = (value) => globalValidationUtils.isArray(value);
module.exports.isFunction = (value) => globalValidationUtils.isFunction(value);
module.exports.isUndefined = (value) => globalValidationUtils.isUndefined(value);
module.exports.isNull = (value) => globalValidationUtils.isNull(value);
module.exports.isDate = (value) => globalValidationUtils.isDate(value);
module.exports.isRegExp = (value) => globalValidationUtils.isRegExp(value);
module.exports.isError = (value) => globalValidationUtils.isError(value);
module.exports.isPromise = (value) => globalValidationUtils.isPromise(value);
module.exports.isBuffer = (value) => globalValidationUtils.isBuffer(value);
module.exports.isEmpty = (value) => globalValidationUtils.isEmpty(value);
module.exports.isNotEmpty = (value) => globalValidationUtils.isNotEmpty(value);
module.exports.isStringLength = (value, min, max) => globalValidationUtils.isStringLength(value, min, max);
module.exports.isArrayLength = (value, min, max) => globalValidationUtils.isArrayLength(value, min, max);
module.exports.isNumberRange = (value, min, max) => globalValidationUtils.isNumberRange(value, min, max);
module.exports.isInteger = (value) => globalValidationUtils.isInteger(value);
module.exports.isPositive = (value) => globalValidationUtils.isPositive(value);
module.exports.isNegative = (value) => globalValidationUtils.isNegative(value);
module.exports.isNonNegative = (value) => globalValidationUtils.isNonNegative(value);
module.exports.isNonPositive = (value) => globalValidationUtils.isNonPositive(value);
module.exports.isEmail = (value) => globalValidationUtils.isEmail(value);
module.exports.isUrl = (value) => globalValidationUtils.isUrl(value);
module.exports.isIpAddress = (value) => globalValidationUtils.isIpAddress(value);
module.exports.isUuid = (value) => globalValidationUtils.isUuid(value);
module.exports.isDateString = (value) => globalValidationUtils.isDateString(value);
module.exports.isJson = (value) => globalValidationUtils.isJson(value);
module.exports.isRegexString = (value) => globalValidationUtils.isRegexString(value);
module.exports.isHexColor = (value) => globalValidationUtils.isHexColor(value);
module.exports.isPhoneNumber = (value) => globalValidationUtils.isPhoneNumber(value);
module.exports.isPassword = (value, options) => globalValidationUtils.isPassword(value, options);
module.exports.validate = (condition, message, field) => globalValidationUtils.validate(condition, message, field);
module.exports.validateType = (value, type, field) => globalValidationUtils.validateType(value, type, field);
module.exports.validateRequired = (value, field) => globalValidationUtils.validateRequired(value, field);
module.exports.validateStringLength = (value, min, max, field) => globalValidationUtils.validateStringLength(value, min, max, field);
module.exports.validateNumberRange = (value, min, max, field) => globalValidationUtils.validateNumberRange(value, min, max, field);
module.exports.validateEmail = (value, field) => globalValidationUtils.validateEmail(value, field);
module.exports.validateUrl = (value, field) => globalValidationUtils.validateUrl(value, field);
module.exports.validateObject = (obj, schema, context) => globalValidationUtils.validateObject(obj, schema, context);
module.exports.createRule = (validator, message) => globalValidationUtils.createRule(validator, message);
module.exports.combineRules = (...rules) => globalValidationUtils.combineRules(...rules);