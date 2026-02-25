/**
 * Валидаторы форматов данных
 * Модуль содержит функции для проверки различных форматов данных
 */

import { isString } from './type-checkers.js';

/**
 * Проверка на email
 */
export function isEmail(value) {
  if (!isString(value)) {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Проверка на URL
 */
export function isUrl(value) {
  if (!isString(value)) {
    return false;
  }
  
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Проверка на IP адрес
 */
export function isIpAddress(value) {
  if (!isString(value)) {
    return false;
  }
  
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(value);
}

/**
 * Проверка на UUID
 */
export function isUuid(value) {
  if (!isString(value)) {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Проверка на дату
 */
export function isDateString(value) {
  if (!isString(value)) {
    return false;
  }
  
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Проверка на JSON
 */
export function isJson(value) {
  if (!isString(value)) {
    return false;
  }
  
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Проверка на регулярное выражение
 */
export function isRegexString(value) {
  if (!isString(value)) {
    return false;
  }
  
  try {
    new RegExp(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Проверка на hex цвет
 */
export function isHexColor(value) {
  if (!isString(value)) {
    return false;
  }
  
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(value);
}

/**
 * Проверка на телефонный номер
 */
export function isPhoneNumber(value) {
  if (!isString(value)) {
    return false;
  }
  
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Проверка на пароль
 */
export function isPassword(value, options = {}) {
  if (!isString(value)) {
    return false;
  }
  
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = false
  } = options;
  
  if (value.length < minLength) {
    return false;
  }
  
  if (requireUppercase && !/[A-Z]/.test(value)) {
    return false;
  }
  
  if (requireLowercase && !/[a-z]/.test(value)) {
    return false;
  }
  
  if (requireNumbers && !/\d/.test(value)) {
    return false;
  }
  
  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    return false;
  }
  
  return true;
}
