/**
 * Form Request Processor
 *
 * Handles form-based request processing including:
 * - Form submissions
 * - Form data validation
 * - Choice selection processing
 * - Interactive form flows
 */

import {logger} from '../../../utils/logger.js';
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome
} from '../request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';

/**
 * Form field definition
 */
export interface FormField {
    id: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea';
    label: string;
    required?: boolean;
    defaultValue?: unknown;
    options?: Array<{value: string; label: string}>;
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
    };
}

/**
 * Form definition
 */
export interface FormDefinition {
    id: string;
    title: string;
    description?: string;
    fields: FormField[];
    choices?: Array<{id: string; label: string}>;
    submitLabel?: string;
    cancelLabel?: string;
}

/**
 * Form submission data
 */
export interface FormSubmission {
    formId: string;
    values: Record<string, unknown>;
    selectedChoice?: string;
    timestamp: string;
}

/**
 * Form validation error
 */
export interface FormValidationError {
    field: string;
    message: string;
    code: string;
}

/**
 * Form Request Processor
 * Handles form submissions and interactive form flows
 */
export class FormRequestProcessor extends BaseRequestProcessor {
    private forms: Map<string, FormDefinition> = new Map();

    constructor() {
        super('FormRequestProcessor', {});
        this.registerDefaultForms();
    }

    /**
     * Determine if this processor can handle the request
     */
    canProcess(request: RequestContext): boolean {
        const ctx = request.context;

        // Check for form submission
        if (ctx['form_submission'] || ctx['form_data'] || ctx['form_id']) {
            return true;
        }

        // Check for choice selection
        if (ctx['selected_choice'] || ctx['choice_id']) {
            return true;
        }

        // Check for form request
        if (ctx['request_form'] || ctx['show_form']) {
            return true;
        }

        // Check action type
        const actionType = this.getActionType(ctx);
        if (actionType === 'form_submit' || actionType === 'form_request') {
            return true;
        }

        return false;
    }

    /**
     * Get the request type this processor handles
     */
    getRequestType(): RequestType {
        return 'form';
    }

    /**
     * Main processing logic for form requests
     */
    protected async doProcess(request: RequestContext): Promise<ProcessResult> {
        const {promiseId, context} = request;
        const ctx = context;

        logger.info('[FormRequestProcessor] Processing form request', {promiseId});

        // Check if this is a form submission
        if (ctx['form_submission'] || ctx['form_data']) {
            return this.handleFormSubmission(ctx);
        }

        // Check if this is a choice selection
        if (ctx['selected_choice'] || ctx['choice_id']) {
            return this.handleChoiceSelection(ctx);
        }

        // Check if this is a form request
        if (ctx['request_form'] || ctx['show_form']) {
            return this.handleFormRequest(ctx);
        }

        // Default: return available forms
        return this.handleListForms();
    }

    /**
     * Handle form submission
     */
    private async handleFormSubmission(ctx: Record<string, unknown>): Promise<ProcessResult> {
        const formId = ctx['form_id'] as string || 'default';
        const formData = (ctx['form_submission'] || ctx['form_data']) as Record<string, unknown>;

        logger.info('[FormRequestProcessor] Handling form submission', {formId});

        // Get form definition
        const form = this.forms.get(formId);
        if (!form) {
            return {
                outcome: 'failed' as ProcessOutcome,
                error: `Form not found: ${formId}`
            } as ProcessResult;
        }

        // Validate form data
        const validationErrors = this.validateFormData(form, formData);
        if (validationErrors.length > 0) {
            return {
                outcome: 'failed' as ProcessOutcome,
                error: 'Form validation failed',
                validationErrors,
                execute: {
                    form: {
                        title: form.title,
                        choices: form.choices
                    }
                }
            } as ProcessResult;
        }

        // Process the submission
        const submission: FormSubmission = {
            formId,
            values: formData,
            timestamp: new Date().toISOString()
        };

        // Store submission (in real implementation, this would persist)
        logger.info('[FormRequestProcessor] Form submitted successfully', {
            formId,
            values: Object.keys(formData)
        });

        return {
            outcome: 'completed',
            message: 'Form submitted successfully',
            submission,
            execute: {
                message: `Form "${form.title}" submitted successfully`
            }
        } as ProcessResult;
    }

    /**
     * Handle choice selection
     */
    private async handleChoiceSelection(ctx: Record<string, unknown>): Promise<ProcessResult> {
        const choiceId = (ctx['selected_choice'] || ctx['choice_id']) as string;
        const formId = ctx['form_id'] as string || 'default';

        logger.info('[FormRequestProcessor] Handling choice selection', {choiceId, formId});

        if (!choiceId) {
            return {
                outcome: 'failed' as ProcessOutcome,
                error: 'No choice selected'
            } as ProcessResult;
        }

        // Process the choice
        return {
            outcome: 'completed',
            message: 'Choice selected',
            selection: {
                choiceId,
                formId,
                timestamp: new Date().toISOString()
            },
            execute: {
                message: `Selected: ${choiceId}`
            }
        } as ProcessResult;
    }

    /**
     * Handle form request - return form definition
     */
    private async handleFormRequest(ctx: Record<string, unknown>): Promise<ProcessResult> {
        const formId = (ctx['request_form'] || ctx['show_form'] || ctx['form_id'] || 'default') as string;

        logger.info('[FormRequestProcessor] Handling form request', {formId});

        const form = this.forms.get(formId);
        if (!form) {
            return {
                outcome: 'failed' as ProcessOutcome,
                error: `Form not found: ${formId}`
            } as ProcessResult;
        }

        return {
            outcome: 'completed',
            message: 'Form definition',
            form: {
                id: form.id,
                title: form.title,
                description: form.description,
                fields: form.fields,
                choices: form.choices
            },
            execute: {
                form: {
                    title: form.title,
                    choices: form.choices
                }
            }
        } as ProcessResult;
    }

    /**
     * Handle list forms request
     */
    private async handleListForms(): Promise<ProcessResult> {
        const availableForms = Array.from(this.forms.values()).map(f => ({
            id: f.id,
            title: f.title,
            description: f.description
        }));

        return {
            outcome: 'completed',
            message: 'Available forms',
            forms: availableForms
        } as ProcessResult;
    }

    /**
     * Validate form data against form definition
     */
    private validateFormData(form: FormDefinition, data: Record<string, unknown>): FormValidationError[] {
        const errors: FormValidationError[] = [];

        for (const field of form.fields) {
            const value = data[field.id];

            // Check required fields
            if (field.required && (value === undefined || value === null || value === '')) {
                errors.push({
                    field: field.id,
                    message: `${field.label} is required`,
                    code: 'REQUIRED_FIELD'
                });
                continue;
            }

            // Skip validation for empty optional fields
            if (!field.required && (value === undefined || value === null || value === '')) {
                continue;
            }

            // Type validation
            if (field.type === 'number' && typeof value !== 'number') {
                errors.push({
                    field: field.id,
                    message: `${field.label} must be a number`,
                    code: 'INVALID_TYPE'
                });
            }

            // Pattern validation
            if (field.validation?.pattern && typeof value === 'string') {
                const regex = new RegExp(field.validation.pattern);
                if (!regex.test(value)) {
                    errors.push({
                        field: field.id,
                        message: `${field.label} format is invalid`,
                        code: 'PATTERN_MISMATCH'
                    });
                }
            }

            // Length validation
            if (typeof value === 'string') {
                if (field.validation?.minLength && value.length < field.validation.minLength) {
                    errors.push({
                        field: field.id,
                        message: `${field.label} must be at least ${field.validation.minLength} characters`,
                        code: 'MIN_LENGTH'
                    });
                }
                if (field.validation?.maxLength && value.length > field.validation.maxLength) {
                    errors.push({
                        field: field.id,
                        message: `${field.label} must be at most ${field.validation.maxLength} characters`,
                        code: 'MAX_LENGTH'
                    });
                }
            }

            // Range validation for numbers
            if (typeof value === 'number') {
                if (field.validation?.min !== undefined && value < field.validation.min) {
                    errors.push({
                        field: field.id,
                        message: `${field.label} must be at least ${field.validation.min}`,
                        code: 'MIN_VALUE'
                    });
                }
                if (field.validation?.max !== undefined && value > field.validation.max) {
                    errors.push({
                        field: field.id,
                        message: `${field.label} must be at most ${field.validation.max}`,
                        code: 'MAX_VALUE'
                    });
                }
            }
        }

        return errors;
    }

    /**
     * Register a form definition
     */
    registerForm(form: FormDefinition): void {
        this.forms.set(form.id, form);
        logger.debug('[FormRequestProcessor] Registered form', {formId: form.id});
    }

    /**
     * Unregister a form definition
     */
    unregisterForm(formId: string): boolean {
        return this.forms.delete(formId);
    }

    /**
     * Get a form definition
     */
    getForm(formId: string): FormDefinition | undefined {
        return this.forms.get(formId);
    }

    /**
     * Register default forms
     */
    private registerDefaultForms(): void {
        // Register action selection form
        this.registerForm({
            id: 'action_selection',
            title: 'Оберіть спосіб виконання',
            description: 'Select how you want to proceed with the task',
            fields: [],
            choices: [
                {id: 'auto', label: 'Автоматично'},
                {id: 'manual', label: 'Вручну'},
                {id: 'ai', label: 'AI Action Generator'}
            ],
            submitLabel: 'Select',
            cancelLabel: 'Cancel'
        });

        // Register confirmation form
        this.registerForm({
            id: 'confirmation',
            title: 'Підтвердження',
            description: 'Please confirm your action',
            fields: [],
            choices: [
                {id: 'confirm', label: 'Підтвердити'},
                {id: 'cancel', label: 'Скасувати'}
            ],
            submitLabel: 'Confirm',
            cancelLabel: 'Cancel'
        });
    }
}

// Singleton instance
export const formRequestProcessor = new FormRequestProcessor();
