/**
 * Проверки типов данных - CommonJS версия
 * Модуль содержит функции для проверки различных типов данных
 */

function isType(value, type) {
  switch (type.toLowerCase()) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'function':
      return typeof value === 'function';
    case 'undefined':
      return typeof value === 'undefined';
    case 'null':
      return value === null;
    case 'date':
      return value instanceof Date;
    case 'regexp':
      return value instanceof RegExp;
    case 'error':
      return value instanceof Error;
    case 'promise':
      return value instanceof Promise;
    case 'buffer':
      return Buffer.isBuffer(value);
    default:
      return false;
  }
}

function isString(value) {
  return isType(value, 'string');
}

function isNumber(value) {
  return isType(value, 'number');
}

function isBoolean(value) {
  return isType(value, 'boolean');
}

function isObject(value) {
  return isType(value, 'object');
}

function isArray(value) {
  return isType(value, 'array');
}

function isFunction(value) {
  return isType(value, 'function');
}

function isUndefined(value) {
  return isType(value, 'undefined');
}

function isNull(value) {
  return isType(value, 'null');
}

function isDate(value) {
  return isType(value, 'date');
}

function isRegExp(value) {
  return isType(value, 'regexp');
}

function isError(value) {
  return isType(value, 'error');
}

function isPromise(value) {
  return isType(value, 'promise');
}

function isBuffer(value) {
  return isType(value, 'buffer');
}

function isEmpty(value) {
  if (isNull(value) || isUndefined(value)) {
    return true;
  }
  
  if (isString(value)) {
    return value.trim() === '';
  }
  
  if (isArray(value)) {
    return value.length === 0;
  }
  
  if (isObject(value)) {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

function isNotEmpty(value) {
  return !isEmpty(value);
}

function isStringLength(value, min, max) {
  if (!isString(value)) {
    return false;
  }
  
  const length = value.length;
  return length >= min && length <= max;
}

function isArrayLength(value, min, max) {
  if (!isArray(value)) {
    return false;
  }
  
  const length = value.length;
  return length >= min && length <= max;
}

function isNumberRange(value, min, max) {
  if (!isNumber(value)) {
    return false;
  }
  
  return value >= min && value <= max;
}

function isInteger(value) {
  return isNumber(value) && Number.isInteger(value);
}

function isPositive(value) {
  return isNumber(value) && value > 0;
}

function isNegative(value) {
  return isNumber(value) && value < 0;
}

function isNonNegative(value) {
  return isNumber(value) && value >= 0;
}

function isNonPositive(value) {
  return isNumber(value) && value <= 0;
}

module.exports = {
  isType,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  isUndefined,
  isNull,
  isDate,
  isRegExp,
  isError,
  isPromise,
  isBuffer,
  isEmpty,
  isNotEmpty,
  isStringLength,
  isArrayLength,
  isNumberRange,
  isInteger,
  isPositive,
  isNegative,
  isNonNegative,
  isNonPositive
};

