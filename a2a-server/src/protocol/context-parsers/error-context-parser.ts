/**
 * Error Context Parser
 *
 * Specialized parser for error-related context
 * Handles error parsing, stack traces, and error collections
 */

import {
    ProtocolError,
} from '../../types/index.js';
import {
    BaseContextParser,
    ParseContext,
} from './base-parser.js';

/**
 * Parsed stack frame
 */
export interface StackFrame {
    function?: string;
    file?: string;
    line?: number;
    column?: number;
    source?: string;
}

/**
 * Parsed error with details
 */
export interface ParsedError {
    code: string;
    message: string;
    file?: string;
    line?: number;
    column?: number;
    stack?: StackFrame[];
    cause?: ParsedError;
    metadata?: Record<string, unknown>;
}

/**
 * Error context data
 */
export interface ErrorContext {
    sessionId: string;
    errors: ParsedError[];
    hasErrors: boolean;
    lastError?: ParsedError;
    errorCount: number;
}

/**
 * Parser for error-related context
 */
export class ErrorContextParser extends BaseContextParser<ErrorContext> {
    constructor(options: ParseContext = {}) {
        super(options);
    }

    /**
     * Validate error context data
     */
    validate(data: unknown): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.isObject(data)) {
            return { valid: false, errors: ['Error context must be an object'] };
        }

        const ctx = data as Record<string, unknown>;

        // Validate session_id
        if (!this.isString(ctx['session_id'])) {
            errors.push('session_id is required and must be a string');
        } else if (ctx['session_id'].length === 0) {
            errors.push('session_id cannot be empty');
        }

        // Validate errors array
        if (ctx['errors'] !== undefined) {
            if (!Array.isArray(ctx['errors'])) {
                errors.push('errors must be an array');
            } else {
                for (let i = 0; i < ctx['errors'].length; i++) {
                    if (!this.isValidError(ctx['errors'][i])) {
                        errors.push(`errors[${i}] is invalid: must have code and message`);
                    }
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Parse error context from data
     */
    parse(data: unknown): ErrorContext {
        const validation = this.validate(data);
        if (!validation.valid) {
            throw new Error(`Invalid error context: ${validation.errors.join(', ')}`);
        }

        const ctx = data as Record<string, unknown>;
        const errors = (ctx['errors'] as ParsedError[]) || [];

        return {
            sessionId: ctx['session_id'] as string,
            errors,
            hasErrors: errors.length > 0,
            lastError: errors.length > 0 ? errors[errors.length - 1] : undefined,
            errorCount: errors.length,
        };
    }

    /**
     * Normalize error context to standard format
     */
    normalize(data: unknown): ErrorContext {
        if (!this.isObject(data)) {
            throw new Error('Cannot normalize non-object data');
        }

        const ctx = data as Record<string, unknown>;
        const errors = this.normalizeErrors(ctx['errors']);

        return {
            sessionId: this.isString(ctx['session_id']) ? ctx['session_id'] : 'unknown',
            errors,
            hasErrors: errors.length > 0,
            lastError: errors.length > 0 ? errors[errors.length - 1] : undefined,
            errorCount: errors.length,
        };
    }

    /**
     * Create empty error context
     */
    createErrorContext(sessionId: string): ErrorContext {
        return {
            sessionId,
            errors: [],
            hasErrors: false,
            errorCount: 0,
        };
    }

    /**
     * Add error to context
     */
    addError(context: ErrorContext, error: ParsedError): ErrorContext {
        const errors = [...context.errors, error];
        return {
            ...context,
            errors,
            hasErrors: true,
            lastError: error,
            errorCount: errors.length,
        };
    }

    /**
     * Add ProtocolError to context
     */
    addProtocolError(context: ErrorContext, error: ProtocolError): ErrorContext {
        return this.addError(context, this.parseProtocolError(error));
    }

    /**
     * Add JavaScript Error to context
     */
    addJsError(context: ErrorContext, error: Error): ErrorContext {
        return this.addError(context, this.parseJsError(error));
    }

    /**
     * Clear all errors
     */
    clearErrors(context: ErrorContext): ErrorContext {
        return {
            ...context,
            errors: [],
            hasErrors: false,
            lastError: undefined,
            errorCount: 0,
        };
    }

    /**
     * Get errors by code
     */
    getErrorsByCode(context: ErrorContext, code: string): ParsedError[] {
        return context.errors.filter((e) => e.code === code);
    }

    /**
     * Get errors by file
     */
    getErrorsByFile(context: ErrorContext, file: string): ParsedError[] {
        return context.errors.filter((e) => e.file === file);
    }

    /**
     * Check if has error with specific code
     */
    hasErrorCode(context: ErrorContext, code: string): boolean {
        return context.errors.some((e) => e.code === code);
    }

    /**
     * Parse ProtocolError to ParsedError
     */
    parseProtocolError(error: ProtocolError): ParsedError {
        return {
            code: error.code,
            message: error.message,
            file: error.file,
            line: error.line,
        };
    }

    /**
     * Parse JavaScript Error to ParsedError
     */
    parseJsError(error: Error): ParsedError {
        const parsed: ParsedError = {
            code: error.name || 'Error',
            message: error.message || 'Unknown error',
        };

        if (error.stack) {
            parsed.stack = this.parseStackTrace(error.stack);

            // Extract file and line from first frame if available
            const firstFrame = parsed.stack[0];
            if (firstFrame) {
                parsed.file = firstFrame.file;
                parsed.line = firstFrame.line;
                parsed.column = firstFrame.column;
            }
        }

        // Handle cause
        if ((error as Error & { cause?: Error }).cause) {
            parsed.cause = this.parseJsError((error as Error & { cause?: Error }).cause!);
        }

        return parsed;
    }

    /**
     * Parse stack trace string into structured frames
     */
    parseStackTrace(stack: string): StackFrame[] {
        if (!stack) return [];

        const lines = stack.split('\n');
        const frames: StackFrame[] = [];

        for (const line of lines) {
            const frame = this.parseStackLine(line);
            if (frame) {
                frames.push(frame);
            }
        }

        return frames;
    }

    /**
     * Format error for display
     */
    formatError(error: ParsedError): string {
        let result = `[${error.code}] ${error.message}`;

        if (error.file) {
            result += `\n  at ${error.file}`;
            if (error.line !== undefined) {
                result += `:${error.line}`;
                if (error.column !== undefined) {
                    result += `:${error.column}`;
                }
            }
        }

        if (error.stack && error.stack.length > 0) {
            result += '\n' + this.formatStack(error.stack);
        }

        if (error.cause) {
            result += '\nCaused by: ' + this.formatError(error.cause);
        }

        return result;
    }

    /**
     * Format stack frames
     */
    formatStack(stack: StackFrame[]): string {
        return stack
            .map((frame) => {
                let line = '    at';
                if (frame.function) {
                    line += ` ${frame.function}`;
                }
                if (frame.file) {
                    line += ` (${frame.file}`;
                    if (frame.line !== undefined) {
                        line += `:${frame.line}`;
                        if (frame.column !== undefined) {
                            line += `:${frame.column}`;
                        }
                    }
                    line += ')';
                }
                return line;
            })
            .join('\n');
    }

    /**
     * Convert ParsedError back to ProtocolError
     */
    toProtocolError(error: ParsedError): ProtocolError {
        return {
            code: error.code,
            message: error.message,
            file: error.file,
            line: error.line,
        };
    }

    // ============================================
    // Private Helpers
    // ============================================

    private isValidError(value: unknown): boolean {
        if (!this.isObject(value)) return false;
        const err = value as Record<string, unknown>;
        return this.isString(err['code']) && this.isString(err['message']);
    }

    private normalizeErrors(value: unknown): ParsedError[] {
        if (!Array.isArray(value)) return [];

        return value
            .filter(this.isValidError.bind(this))
            .map((err) => this.normalizeError(err));
    }

    private normalizeError(value: unknown): ParsedError {
        const err = value as Record<string, unknown>;

        return {
            code: this.isString(err['code']) ? err['code'] : 'UNKNOWN',
            message: this.isString(err['message']) ? err['message'] : 'Unknown error',
            file: this.isString(err['file']) ? err['file'] : undefined,
            line: typeof err['line'] === 'number' ? err['line'] : undefined,
            column: typeof err['column'] === 'number' ? err['column'] : undefined,
            stack: Array.isArray(err['stack'])
                ? err['stack'].filter(this.isValidStackFrame.bind(this)) as StackFrame[]
                : undefined,
            cause: err['cause'] && this.isValidError(err['cause'])
                ? this.normalizeError(err['cause'])
                : undefined,
            metadata: this.isObject(err['metadata']) ? err['metadata'] : undefined,
        };
    }

    private isValidStackFrame(value: unknown): boolean {
        if (!this.isObject(value)) return false;
        const frame = value as Record<string, unknown>;
        return (
            frame['function'] === undefined || this.isString(frame['function'])
        ) && (
            frame['file'] === undefined || this.isString(frame['file'])
        ) && (
            frame['line'] === undefined || typeof frame['line'] === 'number'
        ) && (
            frame['column'] === undefined || typeof frame['column'] === 'number'
        );
    }

    private parseStackLine(line: string): StackFrame | null {
        // Node.js/V8 style: "    at functionName (file:line:column)"
        // or "    at file:line:column"
        const atMatch = line.match(/^\s*at\s+(?:(.+?)\s+\()?([^()]+):(\d+):(\d+)\)?$/);
        if (atMatch) {
            return {
                function: atMatch[1] || undefined,
                file: atMatch[2],
                line: parseInt(atMatch[3], 10),
                column: parseInt(atMatch[4], 10),
            };
        }

        // Firefox style: "functionName@file:line:column"
        const firefoxMatch = line.match(/^(.+?)@(.+):(\d+):(\d+)$/);
        if (firefoxMatch) {
            return {
                function: firefoxMatch[1] || undefined,
                file: firefoxMatch[2],
                line: parseInt(firefoxMatch[3], 10),
                column: parseInt(firefoxMatch[4], 10),
            };
        }

        // Simple file:line format
        const simpleMatch = line.match(/(.+):(\d+):(\d+)$/);
        if (simpleMatch) {
            return {
                file: simpleMatch[1],
                line: parseInt(simpleMatch[2], 10),
                column: parseInt(simpleMatch[3], 10),
            };
        }

        return null;
    }
}

/**
 * Create a new error context parser
 */
export function createErrorContextParser(options?: ParseContext): ErrorContextParser {
    return new ErrorContextParser(options);
}
