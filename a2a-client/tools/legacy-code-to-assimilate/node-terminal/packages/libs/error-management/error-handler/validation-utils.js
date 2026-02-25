/**
 * Утилиты валидации
 * Модуль содержит функции для валидации входных данных
 */

import { ValidationError } from './error-classes.js';

/**
 * Валидация входных данных
 */
export function validateInput(data, schema, logger) {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(new ValidationError(`Поле ${field} обязательно`, field));
      continue;
    }
    
    if (value !== undefined && value !== null) {
      if (rules.type && typeof value !== rules.type) {
        errors.push(new ValidationError(`Поле ${field} должно быть типа ${rules.type}`, field));
      }
      
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(new ValidationError(`Поле ${field} должно содержать минимум ${rules.minLength} символов`, field));
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(new ValidationError(`Поле ${field} должно содержать максимум ${rules.maxLength} символов`, field));
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(new ValidationError(`Поле ${field} имеет некорректный формат`, field));
      }
      
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(new ValidationError(`Поле ${field} должно быть одним из: ${rules.enum.join(', ')}`, field));
      }
    }
  }
  
  if (errors.length > 0) {
    if (logger && logger.error) {
      logger.error('Ошибки валидации', errors);
    }
    throw new ValidationError('Ошибки валидации', null, errors);
  }
  
  return true;
}
