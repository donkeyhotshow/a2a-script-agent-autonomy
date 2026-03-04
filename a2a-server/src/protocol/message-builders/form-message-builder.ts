/**
 * Form Message Builder
 *
 * Специализированный билдер для построения form-сообщений
 * Input/choices handling
 */

import {
    BaseMessageBuilder,
    ValidationResult
} from './base-builder.js';
import {ServerMessage, ClientMessage, ContextBlock} from '../../types/index.js';

export interface FormChoice {
    id: string;
    label: string;
    description?: string;
    value?: string;
    default?: boolean;
}

export interface FormField {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'radio';
    required?: boolean;
    placeholder?: string;
    defaultValue?: unknown;
    options?: Array<{label: string; value: string}>;
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
    };
}

export interface FormOptions {
    sessionId: string;
    formId?: string;
    title?: string;
    description?: string;
    choices?: FormChoice[];
    input?: FormField[];
    submitLabel?: string;
    cancelLabel?: string;
    allowMultiple?: boolean;
}

/**
 * Билдер для создания form-сообщений
 */
export class FormMessageBuilder extends BaseMessageBuilder<ServerMessage> {
    private formId?: string;
    private title?: string;
    private description?: string;
    private choices: FormChoice[] = [];
    private input: FormField[] = [];
    private submitLabel?: string;
    private cancelLabel?: string;
    private allowMultiple?: boolean;

    constructor(sessionId: string) {
        super(sessionId);
    }

    /**
     * Установить ID формы
     */
    withFormId(id: string): this {
        this.formId = id;
        return this;
    }

    /**
     * Установить заголовок формы
     */
    withTitle(title: string): this {
        this.title = title;
        return this;
    }

    /**
     * Установить описание формы
     */
    withDescription(description: string): this {
        this.description = description;
        return this;
    }

    /**
     * Добавить вариант выбора
     */
    addChoice(choice: FormChoice): this {
        this.choices.push(choice);
        return this;
    }

    /**
     * Установить варианты выбора
     */
    withChoices(choices: FormChoice[]): this {
        this.choices = choices;
        return this;
    }

    /**
     * Добавить поле ввода
     */
    addField(field: FormField): this {
        this.input.push(field);
        return this;
    }

    /**
     * Установить поля ввода
     */
    withInput(input: FormField[]): this {
        this.input = input;
        return this;
    }

    /**
     * Установить метку кнопки отправки
     */
    withSubmitLabel(label: string): this {
        this.submitLabel = label;
        return this;
    }

    /**
     * Установить метку кнопки отмены
     */
    withCancelLabel(label: string): this {
        this.cancelLabel = label;
        return this;
    }

    /**
     * Разрешить множественный выбор
     */
    allowMultipleSelection(allow: boolean = true): this {
        this.allowMultiple = allow;
        return this;
    }

    /**
     * Создать форму подтверждения (yes/no)
     */
    static confirm(
        sessionId: string,
        title: string,
        description?: string
    ): FormMessageBuilder {
        const builder = new FormMessageBuilder(sessionId);
        builder.title = title;
        builder.description = description;
        builder.choices = [
            {id: 'yes', label: 'Yes', value: 'yes', default: true},
            {id: 'no', label: 'No', value: 'no'},
        ];
        return builder;
    }

    /**
     * Создать форму с текстовым вводом
     */
    static input(
        sessionId: string,
        title: string,
        fieldLabel: string,
        placeholder?: string
    ): FormMessageBuilder {
        const builder = new FormMessageBuilder(sessionId);
        builder.title = title;
        builder.input = [
            {
                id: 'user_input',
                label: fieldLabel,
                type: 'text',
                placeholder,
                required: true,
            },
        ];
        return builder;
    }

    /**
     * Построить server message с формой (новый протокол - execute.form)
     */
    build(): ServerMessage {
        // Формируем контекст
        const result: ServerMessage = {
            context: this.context,
        };

        // Новый формат: execute.form с choices/input
        if (this.choices.length > 0 || this.input.length > 0) {
            result.execute = {
                form: {
                    title: this.title,
                    description: this.description,
                    choices: this.choices.map(c => ({ id: c.id, label: c.label })),
                    input: this.input.length > 0 ? this.input.map(f => ({
                        id: f.id,
                        label: f.label,
                        type: f.type,
                        required: f.required,
                        placeholder: f.placeholder,
                        options: f.options
                    })) : undefined
                }
            };
        } else if (this.message) {
            // Fallback: простое сообщение
            result.message = this.message;
        }

        return result;
    }

    /**
     * Клонировать билдер с новым sessionId
     */
    clone(sessionId: string): FormMessageBuilder {
        const builder = new FormMessageBuilder(sessionId);
        builder.context = {...this.context, session_id: sessionId};
        builder.files = this.files ? [...this.files] : undefined;
        builder.message = this.message;
        builder.formId = this.formId;
        builder.title = this.title;
        builder.description = this.description;
        builder.choices = [...this.choices];
        builder.input = [...this.input];
        builder.submitLabel = this.submitLabel;
        builder.cancelLabel = this.cancelLabel;
        builder.allowMultiple = this.allowMultiple;
        return builder;
    }
}

/**
 * Билдер для создания client form response
 */
export class FormResponseMessageBuilder extends BaseMessageBuilder<ClientMessage> {
    private formId?: string;
    private choiceId?: string;
    private choiceIds: string[] = [];
    private values: Record<string, unknown> = {};

    constructor(sessionId: string) {
        super(sessionId);
    }

    /**
     * Установить ID формы
     */
    withFormId(id: string): this {
        this.formId = id;
        return this;
    }

    /**
     * Установить выбранный вариант
     */
    withChoice(id: string): this {
        this.choiceId = id;
        return this;
    }

    /**
     * Установить множественный выбор
     */
    withChoices(ids: string[]): this {
        this.choiceIds = ids;
        return this;
    }

    /**
     * Установить значение поля
     */
    withValue(fieldId: string, value: unknown): this {
        this.values[fieldId] = value;
        return this;
    }

    /**
     * Установить все значения
     */
    withValues(values: Record<string, unknown>): this {
        this.values = values;
        return this;
    }

    /**
     * Построить client message с ответом на форму
     */
    build(): ClientMessage {
        // Формируем контекст для ответа
        if (this.formId) {
            this.context.task = `form_response:${this.formId}`;
        }

        // Добавляем выбор в архитектурные признаки
        const features: string[] = ['form_response'];
        if (this.formId) features.push(`form:${this.formId}`);
        if (this.choiceId) features.push(`choice:${this.choiceId}`);
        if (this.choiceIds.length > 0) features.push('multiple_choice');
        if (Object.keys(this.values).length > 0) features.push('input_values');

        this.context.architectural_features = features;

        const result: ClientMessage = {
            context: this.context,
        };

        return result;
    }

    /**
     * Клонировать билдер с новым sessionId
     */
    clone(sessionId: string): FormResponseMessageBuilder {
        const builder = new FormResponseMessageBuilder(sessionId);
        builder.context = {...this.context, session_id: sessionId};
        builder.files = this.files ? [...this.files] : undefined;
        builder.formId = this.formId;
        builder.choiceId = this.choiceId;
        builder.choiceIds = [...this.choiceIds];
        builder.values = {...this.values};
        return builder;
    }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Создать FormMessageBuilder
 */
export function createFormMessageBuilder(sessionId: string): FormMessageBuilder {
    return new FormMessageBuilder(sessionId);
}

/**
 * Создать FormResponseMessageBuilder
 */
export function createFormResponseMessageBuilder(sessionId: string): FormResponseMessageBuilder {
    return new FormResponseMessageBuilder(sessionId);
}
