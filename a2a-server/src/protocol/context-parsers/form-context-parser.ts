/**
 * Form Context Parser
 *
 * Specialized parser for form-related context
 * Handles choices, input fields, and form state
 */

import {
    BaseContextParser,
    ParseContext,
} from './base-parser.js';

/**
 * Form choice option
 */
export interface FormChoice {
    id: string;
    label: string;
    value: string;
    description?: string;
    disabled?: boolean;
}

/**
 * Form input field
 */
export interface FormInput {
    id: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'multiline' | 'password';
    label: string;
    value?: unknown;
    placeholder?: string;
    required?: boolean;
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
    };
    options?: FormChoice[];
}

/**
 * Form state
 */
export interface FormState {
    id: string;
    title?: string;
    description?: string;
    status: 'pending' | 'active' | 'submitted' | 'cancelled';
    submittedAt?: number;
}

/**
 * Form context data
 */
export interface FormContext {
    sessionId: string;
    form?: FormState;
    choices?: FormChoice[];
    inputs?: FormInput[];
    values?: Record<string, unknown>;
}

/**
 * Parser for form-related context
 */
export class FormContextParser extends BaseContextParser<FormContext> {
    constructor(options: ParseContext = {}) {
        super(options);
    }

    /**
     * Validate form context data
     */
    validate(data: unknown): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.isObject(data)) {
            return { valid: false, errors: ['Form context must be an object'] };
        }

        const ctx = data as Record<string, unknown>;

        // Validate session_id
        if (!this.isString(ctx['session_id'])) {
            errors.push('session_id is required and must be a string');
        } else if (ctx['session_id'].length === 0) {
            errors.push('session_id cannot be empty');
        }

        // Validate form if present
        if (ctx['form'] !== undefined) {
            const formValidation = this.validateFormState(ctx['form']);
            errors.push(...formValidation);
        }

        // Validate choices if present
        if (ctx['choices'] !== undefined) {
            if (!Array.isArray(ctx['choices'])) {
                errors.push('choices must be an array');
            } else {
                for (let i = 0; i < ctx['choices'].length; i++) {
                    if (!this.isValidFormChoice(ctx['choices'][i])) {
                        errors.push(`choices[${i}] is invalid`);
                    }
                }
            }
        }

        // Validate inputs if present
        if (ctx['inputs'] !== undefined) {
            if (!Array.isArray(ctx['inputs'])) {
                errors.push('inputs must be an array');
            } else {
                for (let i = 0; i < ctx['inputs'].length; i++) {
                    if (!this.isValidFormInput(ctx['inputs'][i])) {
                        errors.push(`inputs[${i}] is invalid`);
                    }
                }
            }
        }

        // Validate values if present
        if (ctx['values'] !== undefined && !this.isObject(ctx['values'])) {
            errors.push('values must be an object');
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Parse form context from data
     */
    parse(data: unknown): FormContext {
        const validation = this.validate(data);
        if (!validation.valid) {
            throw new Error(`Invalid form context: ${validation.errors.join(', ')}`);
        }

        const ctx = data as Record<string, unknown>;

        const result: FormContext = {
            sessionId: ctx['session_id'] as string,
        };

        if (ctx['form']) {
            result.form = ctx['form'] as FormState;
        }

        if (ctx['choices']) {
            result.choices = ctx['choices'] as FormChoice[];
        }

        if (ctx['inputs']) {
            result.inputs = ctx['inputs'] as FormInput[];
        }

        if (ctx['values']) {
            result.values = ctx['values'] as Record<string, unknown>;
        }

        return result;
    }

    /**
     * Normalize form context to standard format
     */
    normalize(data: unknown): FormContext {
        if (!this.isObject(data)) {
            throw new Error('Cannot normalize non-object data');
        }

        const ctx = data as Record<string, unknown>;

        return {
            sessionId: this.isString(ctx['session_id']) ? ctx['session_id'] : 'unknown',
            form: this.normalizeFormState(ctx['form']),
            choices: this.normalizeChoices(ctx['choices']),
            inputs: this.normalizeInputs(ctx['inputs']),
            values: this.isObject(ctx['values']) ? ctx['values'] : undefined,
        };
    }

    /**
     * Create new form context
     */
    createFormContext(sessionId: string, formId: string, title?: string): FormContext {
        return {
            sessionId,
            form: {
                id: formId,
                title,
                status: 'pending',
            },
            choices: [],
            inputs: [],
            values: {},
        };
    }

    /**
     * Add form choice
     */
    addChoice(context: FormContext, choice: FormChoice): FormContext {
        return {
            ...context,
            choices: [...(context.choices || []), choice],
        };
    }

    /**
     * Add form input
     */
    addInput(context: FormContext, input: FormInput): FormContext {
        return {
            ...context,
            inputs: [...(context.inputs || []), input],
        };
    }

    /**
     * Set form value
     */
    setValue(context: FormContext, key: string, value: unknown): FormContext {
        return {
            ...context,
            values: {
                ...context.values,
                [key]: value,
            },
        };
    }

    /**
     * Set multiple form values
     */
    setValues(context: FormContext, values: Record<string, unknown>): FormContext {
        return {
            ...context,
            values: {
                ...context.values,
                ...values,
            },
        };
    }

    /**
     * Activate form
     */
    activateForm(context: FormContext): FormContext {
        if (!context.form) return context;

        return {
            ...context,
            form: {
                ...context.form,
                status: 'active',
            },
        };
    }

    /**
     * Submit form
     */
    submitForm(context: FormContext): FormContext {
        if (!context.form) return context;

        return {
            ...context,
            form: {
                ...context.form,
                status: 'submitted',
                submittedAt: Date.now(),
            },
        };
    }

    /**
     * Cancel form
     */
    cancelForm(context: FormContext): FormContext {
        if (!context.form) return context;

        return {
            ...context,
            form: {
                ...context.form,
                status: 'cancelled',
            },
        };
    }

    /**
     * Get choice by ID
     */
    getChoiceById(context: FormContext, id: string): FormChoice | null {
        return context.choices?.find((c) => c.id === id) || null;
    }

    /**
     * Get input by ID
     */
    getInputById(context: FormContext, id: string): FormInput | null {
        return context.inputs?.find((i) => i.id === id) || null;
    }

    /**
     * Get value by key
     */
    getValue(context: FormContext, key: string): unknown {
        return context.values?.[key];
    }

    /**
     * Check if form has all required values
     */
    hasRequiredValues(context: FormContext): boolean {
        if (!context.inputs) return true;

        return context.inputs
            .filter((input) => input.required)
            .every((input) => {
                const value = context.values?.[input.id];
                return value !== undefined && value !== null && value !== '';
            });
    }

    /**
     * Check if form is submitted
     */
    isSubmitted(context: FormContext): boolean {
        return context.form?.status === 'submitted';
    }

    /**
     * Validate input value
     */
    validateInput(input: FormInput, value: unknown): { valid: boolean; error?: string } {
        if (input.required && (value === undefined || value === null || value === '')) {
            return { valid: false, error: `${input.label} is required` };
        }

        if (value === undefined || value === null || value === '') {
            return { valid: true };
        }

        const validation = input.validation;
        if (!validation) return { valid: true };

        // String validations
        if (typeof value === 'string') {
            if (validation.minLength !== undefined && value.length < validation.minLength) {
                return { valid: false, error: `${input.label} must be at least ${validation.minLength} characters` };
            }
            if (validation.maxLength !== undefined && value.length > validation.maxLength) {
                return { valid: false, error: `${input.label} must be at most ${validation.maxLength} characters` };
            }
            if (validation.pattern !== undefined && !new RegExp(validation.pattern).test(value)) {
                return { valid: false, error: `${input.label} format is invalid` };
            }
        }

        // Number validations
        if (typeof value === 'number') {
            if (validation.min !== undefined && value < validation.min) {
                return { valid: false, error: `${input.label} must be at least ${validation.min}` };
            }
            if (validation.max !== undefined && value > validation.max) {
                return { valid: false, error: `${input.label} must be at most ${validation.max}` };
            }
        }

        return { valid: true };
    }

    // ============================================
    // Private Helpers
    // ============================================

    private validateFormState(value: unknown): string[] {
        const errors: string[] = [];

        if (!this.isObject(value)) {
            return ['form must be an object'];
        }

        const form = value as Record<string, unknown>;

        if (!this.isString(form['id'])) {
            errors.push('form.id is required and must be a string');
        }

        const validStatuses = ['pending', 'active', 'submitted', 'cancelled'];
        if (form['status'] !== undefined &&
            (!this.isString(form['status']) || !validStatuses.includes(form['status']))) {
            errors.push('form.status must be one of: ' + validStatuses.join(', '));
        }

        return errors;
    }

    private isValidFormChoice(value: unknown): boolean {
        if (!this.isObject(value)) return false;
        const choice = value as Record<string, unknown>;
        return (
            this.isString(choice['id']) &&
            this.isString(choice['label']) &&
            this.isString(choice['value'])
        );
    }

    private isValidFormInput(value: unknown): boolean {
        if (!this.isObject(value)) return false;
        const input = value as Record<string, unknown>;
        const validTypes = ['text', 'number', 'boolean', 'select', 'multiline', 'password'];

        return (
            this.isString(input['id']) &&
            this.isString(input['type']) &&
            validTypes.includes(input['type']) &&
            this.isString(input['label'])
        );
    }

    private normalizeFormState(value: unknown): FormState | undefined {
        if (!this.isObject(value)) return undefined;

        const form = value as Record<string, unknown>;
        const validStatuses = ['pending', 'active', 'submitted', 'cancelled'];
        const status = this.isString(form['status']) && validStatuses.includes(form['status'])
            ? form['status']
            : 'pending';

        return {
            id: this.isString(form['id']) ? form['id'] : this.generateTaskId(),
            title: this.isString(form['title']) ? form['title'] : undefined,
            description: this.isString(form['description']) ? form['description'] : undefined,
            status: status as FormState['status'],
            submittedAt: typeof form['submittedAt'] === 'number' ? form['submittedAt'] : undefined,
        };
    }

    private normalizeChoices(value: unknown): FormChoice[] | undefined {
        if (!Array.isArray(value)) return undefined;

        return value
            .filter(this.isValidFormChoice.bind(this))
            .map((choice) => ({
                id: (choice as Record<string, unknown>)['id'] as string,
                label: (choice as Record<string, unknown>)['label'] as string,
                value: (choice as Record<string, unknown>)['value'] as string,
                description: this.isString((choice as Record<string, unknown>)['description'])
                    ? (choice as Record<string, unknown>)['description']
                    : undefined,
                disabled: (choice as Record<string, unknown>)['disabled'] === true,
            }));
    }

    private normalizeInputs(value: unknown): FormInput[] | undefined {
        if (!Array.isArray(value)) return undefined;

        return value
            .filter(this.isValidFormInput.bind(this))
            .map((input) => {
                const inp = input as Record<string, unknown>;
                const validation = this.isObject(inp['validation'])
                    ? inp['validation'] as Record<string, unknown>
                    : undefined;

                return {
                    id: inp['id'] as string,
                    type: inp['type'] as FormInput['type'],
                    label: inp['label'] as string,
                    value: inp['value'],
                    placeholder: this.isString(inp['placeholder']) ? inp['placeholder'] : undefined,
                    required: inp['required'] === true,
                    validation: validation
                        ? {
                            pattern: this.isString(validation['pattern']) ? validation['pattern'] : undefined,
                            min: typeof validation['min'] === 'number' ? validation['min'] : undefined,
                            max: typeof validation['max'] === 'number' ? validation['max'] : undefined,
                            minLength: typeof validation['minLength'] === 'number' ? validation['minLength'] : undefined,
                            maxLength: typeof validation['maxLength'] === 'number' ? validation['maxLength'] : undefined,
                        }
                        : undefined,
                    options: this.normalizeChoices(inp['options']),
                };
            });
    }
}

/**
 * Create a new form context parser
 */
export function createFormContextParser(options?: ParseContext): FormContextParser {
    return new FormContextParser(options);
}
