/**
 * Base Message Builder
 *
 * Абстрактный базовый класс для всех специализированных билдеров сообщений
 * Предоставляет общие методы: build(), validate(), serialize()
 */

import {ContextBlock, ClientMessage, ServerMessage, FileBlock} from '../../types/index.js';
import {validateContextBlock} from '../context-parser.js';
import {CURRENT_PROTOCOL_VERSION} from '../versioning/protocol-versions.js';

export const PROTOCOL_VERSION = CURRENT_PROTOCOL_VERSION;

/**
 * Результат валидации сообщения
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Базовые опции для построения сообщений
 */
export interface MessageBuilderOptions {
    sessionId: string;
    version?: string;
    files?: FileBlock[];
    message?: string;
}

/**
 * Абстрактный базовый класс для всех билдеров сообщений
 */
export abstract class BaseMessageBuilder<T extends ClientMessage | ServerMessage> {
    protected context: ContextBlock;
    protected files?: FileBlock[];
    protected message?: string;

    constructor(sessionId: string, version: ContextBlock['version'] = PROTOCOL_VERSION) {
        this.context = {
            version,
            session_id: sessionId,
        };
    }

    /**
     * Построить и валидировать сообщение
     * Подлежит переопределению в наследниках
     */
    abstract build(): T;

    /**
     * Валидировать контекст сообщения
     */
    protected validateContext(): ValidationResult {
        return validateContextBlock(this.context);
    }

    /**
     * Проверить валидность всего сообщения
     */
    validate(): ValidationResult {
        const errors: string[] = [];
        
        // Проверяем контекст
        const contextResult = this.validateContext();
        if (!contextResult.valid) {
            errors.push(...contextResult.errors.map(e => `context: ${e}`));
        }

        // Проверяем файлы
        if (this.files !== undefined) {
            if (!Array.isArray(this.files)) {
                errors.push('files must be an array');
            } else {
                for (let i = 0; i < this.files.length; i++) {
                    const file = this.files[i];
                    if (!file.path || typeof file.path !== 'string') {
                        errors.push(`files[${i}].path is required`);
                    }
                    if (typeof file.content !== 'string') {
                        errors.push(`files[${i}].content must be a string`);
                    }
                }
            }
        }

        return {valid: errors.length === 0, errors};
    }

    /**
     * Сериализовать сообщение в JSON
     */
    serialize(): string {
        const message = this.build();
        return JSON.stringify(message);
    }

    /**
     * Добавить файлы к сообщению
     */
    withFiles(files: FileBlock[]): this {
        this.files = files;
        return this;
    }

    /**
     * Добавить текстовое сообщение
     */
    withMessage(message: string): this {
        this.message = message;
        return this;
    }

    /**
     * Добавить задачи в контекст
     */
    protected setTasks(tasks: ContextBlock['tasks']): void {
        this.context.tasks = tasks;
    }

    /**
     * Добавить ошибки в контекст
     */
    protected setErrors(errors: ContextBlock['errors']): void {
        this.context.errors = errors;
    }

    /**
     * Добавить architectural features в контекст
     */
    protected setArchitecturalFeatures(features: string[]): void {
        this.context.architectural_features = features;
    }

    /**
     * Установить произвольное поле контекста
     */
    protected setContextField<K extends keyof ContextBlock>(
        field: K,
        value: ContextBlock[K]
    ): void {
        (this.context as Record<string, unknown>)[field] = value;
    }

    /**
     * Получить текущий контекст
     */
    getContext(): ContextBlock {
        return {...this.context};
    }

    /**
     * Клонировать билдер с новым sessionId
     */
    abstract clone(sessionId: string): BaseMessageBuilder<T>;
}
