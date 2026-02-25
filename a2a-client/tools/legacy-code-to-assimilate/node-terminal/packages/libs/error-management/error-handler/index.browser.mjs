/**
 * Browser-compatible stub for ErrorHandlingUtils.
 * Provides a minimal implementation for client-side error handling without Node.js dependencies.
 */

import { ErrorHandlingUtils } from './browser-error-handler.js';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError
} from './error-classes.js';
import { validateInput } from './validation-utils.js';

export {
  ErrorHandlingUtils,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  validateInput
};
