import { createRequire } from 'module';

// ESM wrapper around CommonJS exports
const require = createRequire(import.meta.url);
const cjs = require('./index.cjs');

export const ErrorHandlingUtils = cjs.ErrorHandlingUtils;
export const errorHandlingUtils = cjs.errorHandlingUtils;
export const ErrorCollector = cjs.ErrorCollector;
export const ErrorCategorizationManager = cjs.ErrorCategorizationManager;
export const ErrorHandlingStrategies = cjs.ErrorHandlingStrategies;
export const ServiceConfigurationValidator = cjs.ServiceConfigurationValidator;
export const ValidationUtils = cjs.ValidationUtils;
export const validationUtils = cjs.validationUtils;
