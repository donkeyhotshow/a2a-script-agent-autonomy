/**
 * Логика валидации - CommonJS версия
 */

const { isType, isNotEmpty, isStringLength, isNumberRange } = require('./type-checkers.cjs');
const { isEmail, isUrl } = require('./format-validators.cjs');

function validate(condition, message, field = null, throwOnError = true, createValidationError) {
  if (!condition) {
    const error = createValidationError(message, field);
    if (throwOnError) {
      throw error;
    }
    return { valid: false, error };
  }
  return { valid: true };
}

function validateType(value, type, field = null, throwOnError = true, createValidationError) {
  const isValid = isType(value, type);
  return validate(isValid, `Value must be of type ${type}`, field, throwOnError, createValidationError);
}

function validateRequired(value, field = null, throwOnError = true, createValidationError) {
  const isValid = isNotEmpty(value);
  return validate(isValid, 'Field is required', field, throwOnError, createValidationError);
}

function validateStringLength(value, min, max, field = null, throwOnError = true, createValidationError) {
  const isValid = isStringLength(value, min, max);
  return validate(isValid, `String length must be between ${min} and ${max}`, field, throwOnError, createValidationError);
}

function validateNumberRange(value, min, max, field = null, throwOnError = true, createValidationError) {
  const isValid = isNumberRange(value, min, max);
  return validate(isValid, `Number must be between ${min} and ${max}`, field, throwOnError, createValidationError);
}

function validateEmail(value, field = null, throwOnError = true, createValidationError) {
  const isValid = isEmail(value);
  return validate(isValid, 'Invalid email format', field, throwOnError, createValidationError);
}

function validateUrl(value, field = null, throwOnError = true, createValidationError) {
  const isValid = isUrl(value);
  return validate(isValid, 'Invalid URL format', field, throwOnError, createValidationError);
}

function validateObject(obj, schema, context = 'object', throwOnError = true, createValidationError) {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];
    
    for (const rule of rules) {
      const result = rule(value, field);
      if (!result.valid) {
        errors.push(result.error);
      }
    }
  }
  
  if (errors.length > 0) {
    const error = createValidationError(`Validation failed for ${context}`, context);
    error.details = errors;
    if (throwOnError) {
      throw error;
    }
    return { valid: false, error, details: errors };
  }
  
  return { valid: true };
}

function createRule(validator, message, throwOnError = true, createValidationError) {
  return (value, field) => {
    const isValid = validator(value);
    return validate(isValid, message, field, throwOnError, createValidationError);
  };
}

function combineRules(...rules) {
  return (value, field) => {
    for (const rule of rules) {
      const result = rule(value, field);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  };
}

module.exports = {
  validate,
  validateType,
  validateRequired,
  validateStringLength,
  validateNumberRange,
  validateEmail,
  validateUrl,
  validateObject,
  createRule,
  combineRules
};

