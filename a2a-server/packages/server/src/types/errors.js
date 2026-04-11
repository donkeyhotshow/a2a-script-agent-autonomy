"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
/**
 * Application error class for structured error handling
 */
class AppError {
    constructor(code, message, statusCode, details = undefined) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
        this.details = details;
        // Maintains proper stack trace (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}
exports.AppError = AppError;