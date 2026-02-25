/**
 * Проверки типов данных
 * Модуль содержит функции для проверки различных типов данных
 */

/**
 * Проверка типа
 */
export function isType(value, type) {
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

/**
 * Проверка на строку
 */
export function isString(value) {
  return isType(value, 'string');
}

/**
 * Проверка на число
 */
export function isNumber(value) {
  return isType(value, 'number');
}

/**
 * Проверка на булево значение
 */
export function isBoolean(value) {
  return isType(value, 'boolean');
}

/**
 * Проверка на объект
 */
export function isObject(value) {
  return isType(value, 'object');
}

/**
 * Проверка на массив
 */
export function isArray(value) {
  return isType(value, 'array');
}

/**
 * Проверка на функцию
 */
export function isFunction(value) {
  return isType(value, 'function');
}

/**
 * Проверка на undefined
 */
export function isUndefined(value) {
  return isType(value, 'undefined');
}

/**
 * Проверка на null
 */
export function isNull(value) {
  return isType(value, 'null');
}

/**
 * Проверка на Date
 */
export function isDate(value) {
  return isType(value, 'date');
}

/**
 * Проверка на RegExp
 */
export function isRegExp(value) {
  return isType(value, 'regexp');
}

/**
 * Проверка на Error
 */
export function isError(value) {
  return isType(value, 'error');
}

/**
 * Проверка на Promise
 */
export function isPromise(value) {
  return isType(value, 'promise');
}

/**
 * Проверка на Buffer
 */
export function isBuffer(value) {
  return isType(value, 'buffer');
}

/**
 * Проверка на пустое значение
 */
export function isEmpty(value) {
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

/**
 * Проверка на непустое значение
 */
export function isNotEmpty(value) {
  return !isEmpty(value);
}

/**
 * Проверка длины строки
 */
export function isStringLength(value, min, max) {
  if (!isString(value)) {
    return false;
  }
  
  const length = value.length;
  return length >= min && length <= max;
}

/**
 * Проверка длины массива
 */
export function isArrayLength(value, min, max) {
  if (!isArray(value)) {
    return false;
  }
  
  const length = value.length;
  return length >= min && length <= max;
}

/**
 * Проверка диапазона числа
 */
export function isNumberRange(value, min, max) {
  if (!isNumber(value)) {
    return false;
  }
  
  return value >= min && value <= max;
}

/**
 * Проверка на целое число
 */
export function isInteger(value) {
  return isNumber(value) && Number.isInteger(value);
}

/**
 * Проверка на положительное число
 */
export function isPositive(value) {
  return isNumber(value) && value > 0;
}

/**
 * Проверка на отрицательное число
 */
export function isNegative(value) {
  return isNumber(value) && value < 0;
}

/**
 * Проверка на неотрицательное число
 */
export function isNonNegative(value) {
  return isNumber(value) && value >= 0;
}

/**
 * Проверка на неположительное число
 */
export function isNonPositive(value) {
  return isNumber(value) && value <= 0;
}
