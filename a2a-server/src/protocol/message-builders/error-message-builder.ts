/**
 * Error Message Builder
 *
 * Специализированный билдер для построения error-сообщений
 * Error formatting с различными типами ошибок
 */

import {
    BaseMessageBuilder,
    ValidationResult
} from './base-builder.js';
import {ServerMessage, ClientMessage, ContextBlock, ProtocolError} from '../../types/index.js';

export interface ErrorDetails {
    code: string;
    message: string;
    file?: string;
    line?: number;
    column?: number;
    stack?: string;
    details?: Record<string, unknown>;
    recoverable?: boolean;
    suggestions?: string[];
}

export interface ErrorOptions {
    sessionId: string;
    code: string;
    message: string;
    file?: string;
    line?: number;
    column?: number;
    stack?: string;
    details?: Record<string, unknown>;
    recoverable?: boolean;
    suggestions?: string[];
}

export type ErrorCode = 
    // Validation errors
    | 'VALIDATION_ERROR'
    | 'INVALID_FORMAT'
    | 'MISSING_REQUIRED_FIELD'
    | 'INVALID_TYPE'
    
    // Protocol errors
    | 'PROTOCOL_ERROR'
    | 'INVALID_MESSAGE'
    | 'UNKNOWN_MESSAGE_TYPE'
    | 'VERSION_MISMATCH'
    
    // Runtime errors
    | 'RUNTIME_ERROR'
    | 'EXECUTION_ERROR'
    | 'TIMEOUT_ERROR'
    | 'RESOURCE_ERROR'
    
    // Authentication/Authorization
    | 'AUTH_ERROR'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'SESSION_EXPIRED'
    
    // Network/IO
    | 'NETWORK_ERROR'
    | 'FILE_NOT_FOUND'
    | 'PERMISSION_DENIED'
    | 'IO_ERROR'
    
    // Internal
    | 'INTERNAL_ERROR'
    | 'NOT_IMPLEMENTED'
    | 'DEPRECATED'
    | 'UNKNOWN_ERROR';

/**
 * Билдер для создания error-сообщений
 */
export class ErrorMessageBuilder extends BaseMessageBuilder<ServerMessage> {
    private errors: ErrorDetails[] = [];
    private defaultRecoverable: boolean = false;

    constructor(sessionId: string) {
        super(sessionId);
    }

    /**
     * Добавить ошибку
     */
    addError(error: ErrorDetails): this {
        this.errors.push({
            ...error,
            recoverable: error.recoverable ?? this.defaultRecoverable,
        });
        return this;
    }

    /**
     * Установить ошибку
     */
    withError(code: string, message: string, options?: Omit<ErrorDetails, 'code' | 'message'>): this {
        this.errors = []; // Сбрасываем предыдущие
        return this.addError({
            code,
            message,
            ...options,
        });
    }

    /**
     * Добавить ошибку из исключения
     */
    fromError(error: Error, recoverable: boolean = false): this {
        return this.addError({
            code: 'RUNTIME_ERROR',
            message: error.message,
            stack: error.stack,
            recoverable,
        });
    }

    /**
     * Установить файл и строку для ошибки
     */
    atLocation(file: string, line?: number, column?: number): this {
        if (this.errors.length > 0) {
            this.errors[this.errors.length - 1].file = file;
            if (line !== undefined) this.errors[this.errors.length - 1].line = line;
            if (column !== undefined) this.errors[this.errors.length - 1].column = column;
        }
        return this;
    }

    /**
     * Добавить детали к последней ошибке
     */
    withDetails(details: Record<string, unknown>): this {
        if (this.errors.length > 0) {
            this.errors[this.errors.length - 1].details = details;
        }
        return this;
    }

    /**
     * Добавить предложения для исправления
     */
    withSuggestions(suggestions: string[]): this {
        if (this.errors.length > 0) {
            this.errors[this.errors.length - 1].suggestions = suggestions;
        }
        return this;
    }

    /**
     * Отметить ошибки как восстановимые
     */
    setRecoverable(recoverable: boolean = true): this {
        this.errors = this.errors.map(e => ({...e, recoverable}));
        return this;
    }

    /**
     * Установить признак восстановимости по умолчанию
     */
    withDefaultRecoverable(recoverable: boolean): this {
        this.defaultRecoverable = recoverable;
        return this;
    }

    /**
     * Создать ошибку валидации
     */
    static validation(
        sessionId: string,
        message: string,
        field?: string
    ): ErrorMessageBuilder {
        const builder = new ErrorMessageBuilder(sessionId);
        builder.addError({
            code: 'VALIDATION_ERROR',
            message: field ? `${field}: ${message}` : message,
            details: field ? {field} : undefined,
            recoverable: true,
        });
        return builder;
    }

    /**
     * Создать ошибку авторизации
     */
    static unauthorized(sessionId: string, message: string = 'Unauthorized'): ErrorMessageBuilder {
        const builder = new ErrorMessageBuilder(sessionId);
        builder.addError({
            code: 'UNAUTHORIZED',
            message,
            recoverable: false,
        });
        return builder;
    }

    /**
     * Создать ошибку доступа
     */
    static forbidden(sessionId: string, message: string = 'Forbidden'): ErrorMessageBuilder {
        const builder = new ErrorMessageBuilder(sessionId);
        builder.addError({
            code: 'FORBIDDEN',
            message,
            recoverable: false,
        });
        return builder;
    }

    /**
     * Создать ошибку "не найдено"
     */
    static notFound(sessionId: string, resource: string, id?: string): ErrorMessageBuilder {
        const builder = new ErrorMessageBuilder(sessionId);
        builder.addError({
            code: 'FILE_NOT_FOUND',
            message: id ? `${resource} not found: ${id}` : `${resource} not found`,
            details: id ? {id} : undefined,
        });
        return builder;
    }

    /**
     * Создать внутреннюю ошибку
     */
    static internal(sessionId: string, message: string = 'Internal error'): ErrorMessageBuilder {
        const builder = new ErrorMessageBuilder(sessionId);
        builder.addError({
            code: 'INTERNAL_ERROR',
            message,
            recoverable: false,
        });
        return builder;
    }

    /**
     * Построить server message с ошибками
     */
    build(): ServerMessage {
        // Преобразуем ошибки в ProtocolError формат
        const protocolErrors: ProtocolError[] = this.errors.map(e => ({
            code: e.code,
            message: e.message,
            ...(e.file && {file: e.file}),
            ...(e.line !== undefined && {line: e.line}),
        }));

        // Устанавливаем ошибки в контекст
        this.context.errors = protocolErrors;

        // Добавляем архитектурные признаки
        this.context.architectural_features = [
            'error',
            ...this.errors.map(e => `error:${e.code.toLowerCase()}`),
            ...(this.errors.some(e => e.recoverable) ? ['recoverable'] : []),
        ];

        const result: ServerMessage = {
            context: this.context,
        };

        // Формируем сообщение с ошибками
        let content = '';

        this.errors.forEach((error, index) => {
            const recoverableIcon = error.recoverable ? '⚠' : '✗';
            content += `${recoverableIcon} [${error.code}] ${error.message}\n`;

            if (error.file) {
                content += `   File: ${error.file}`;
                if (error.line) content += `:${error.line}`;
                if (error.column) content += `:${error.column}`;
                content += '\n';
            }

            if (error.stack) {
                content += `   Stack:\n${error.stack.split('\n').map(l => `   ${l}`).join('\n')}\n`;
            }

            if (error.details && Object.keys(error.details).length > 0) {
                content += `   Details: ${JSON.stringify(error.details)}\n`;
            }

            if (error.suggestions && error.suggestions.length > 0) {
                content += '   Suggestions:\n';
                error.suggestions.forEach(s => {
                    content += `     • ${s}\n`;
                });
            }

            if (index < this.errors.length - 1) {
                content += '\n';
            }
        });

        if (content) {
            result.message = content.trim();
        }

        // Добавляем action для восстановления если есть восстановимые ошибки
        if (this.errors.some(e => e.recoverable)) {
            result.action = {
                id: 'error_recovery',
                title: 'Error Recovery',
                nextSteps: [
                    {id: 'retry', title: 'Retry'},
                    {id: 'cancel', title: 'Cancel'},
                ],
            };
        }

        return result;
    }

    /**
     * Клонировать билдер с новым sessionId
     */
    clone(sessionId: string): ErrorMessageBuilder {
        const builder = new ErrorMessageBuilder(sessionId);
        builder.context = {...this.context, session_id: sessionId};
        builder.files = this.files ? [...this.files] : undefined;
        builder.message = this.message;
        builder.errors = [...this.errors];
        builder.defaultRecoverable = this.defaultRecoverable;
        return builder;
    }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Создать ErrorMessageBuilder
 */
export function createErrorMessageBuilder(sessionId: string): ErrorMessageBuilder {
    return new ErrorMessageBuilder(sessionId);
}

/**
 * Быстрое создание сообщения об ошибке
 */
export function quickError(
    sessionId: string,
    code: string,
    message: string,
    file?: string,
    line?: number
): ServerMessage {
    return createErrorMessageBuilder(sessionId)
        .withError(code, message, {file, line})
        .build();
}
