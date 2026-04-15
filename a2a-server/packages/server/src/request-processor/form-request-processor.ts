/**
 * Form Request Processor
 *
 * Handles form-based request processing including:
 * - Form submissions
 * - Form data validation
 * - Choice selection processing
 * - Interactive form flows
 */

import {logger} from "@a2a/server-utils/logger";
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome
} from './request-processor.interfaces';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';
import {runFormChoicePipeline} from './form-choice-pipeline.js';

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
    severity: 'error' | 'warning' | 'info';
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



        // Check if this is a choice selection first (action-key shape result.choice)
        // Support: ctx.choice_id, ctx.selected_choice, or result.choice
        const resultChoice = (ctx['result'] as Record<string, unknown>)?.choice;
        if (ctx['selected_choice'] || ctx['choice_id'] || resultChoice) {
            // Normalize choice_id from various sources
            if (resultChoice && !ctx['choice_id']) {
                ctx['choice_id'] = resultChoice;
            }
            return this.handleChoiceSelection(ctx);
        }

        // Check if this is a form submission
        if (ctx['form_submission'] || ctx['form_data']) {
            return this.handleFormSubmission(ctx);
        }

        // Check if this is a form request
        if (ctx['request_form'] || ctx['show_form']) {
            return this.handleFormRequest(ctx);
        }

        // Default: return available forms
        return this.handleListForms(ctx);
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
        const validationErrors = await this.validateFormData(form, formData);
        if (validationErrors.length > 0) {
            const result: ProcessResult = {
                outcome: 'failed' as ProcessOutcome,
                error: 'Form validation failed',
                validationErrors,
                execute: {
                    form: {
                        title: form.title,
                        choices: form.choices
                    }
                }
            };

            return result;
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
            execute: {
                message: `Form "${form.title}" submitted successfully`
            }
        } as ProcessResult;
    }

    /**
     * Handle choice selection — routed by prompts/transforms/form-choice-response.json
     */
    private async handleChoiceSelection(ctx: Record<string, unknown>): Promise<ProcessResult> {
        const resultChoice = (ctx['result'] as Record<string, unknown>)?.choice;
        const choiceId = (ctx['selected_choice'] || ctx['choice_id'] || resultChoice) as string;
        const formId = ctx['form_id'] as string || 'default';

        logger.info('[FormRequestProcessor] Handling choice selection', {choiceId, formId});

        if (!choiceId) {
            const result: ProcessResult = {
                outcome: 'failed' as ProcessOutcome,
                error: 'No choice selected'
            };

            return result;
        }

        const pipelineInput = {...ctx, choice_id: choiceId, form_id: formId};
        const result = await runFormChoicePipeline(pipelineInput);

        return result;
    }

    /**
     * Handle form request - return form definition
     */
    private async handleFormRequest(ctx: Record<string, unknown>): Promise<ProcessResult> {
        const formId = (ctx['request_form'] || ctx['show_form'] || ctx['form_id'] || 'default') as string;

        logger.info('[FormRequestProcessor] Handling form request', {formId});

        const form = this.forms.get(formId);
        if (!form) {
            const result: ProcessResult = {
                outcome: 'failed' as ProcessOutcome,
                error: `Form not found: ${formId}`
            };

            return result;
        }

        const result: ProcessResult = {
            outcome: 'completed',
            execute: {
                form: {
                    title: form.title,
                    choices: form.choices
                }
            }
        };

        return result;
    }

    /**
     * Handle list forms request
     */
    private async handleListForms(ctx: Record<string, unknown>): Promise<ProcessResult> {
        const availableForms = Array.from(this.forms.values()).map(f => ({
            id: f.id,
            title: f.title,
            description: f.description
        }));

        const result: ProcessResult = {
            outcome: 'completed',
            execute: {
                message: `Available forms: ${availableForms.map(f => f.title).join(', ')}`
            }
        };

        return result;
    }

    /**
     * Validate form data using external validator
     */
    private async validateFormData(form: FormDefinition, data: Record<string, unknown>): Promise<FormValidationError[]> {
        const { validateFormData } = await import('./validators/form-validator');
        return validateFormData(form, data);
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
