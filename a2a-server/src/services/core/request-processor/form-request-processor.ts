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
        // Support multiple ways to pass choice
        const resultChoice = (ctx['result'] as Record<string, unknown>)?.choice;
        const choiceId = (ctx['selected_choice'] || ctx['choice_id'] || resultChoice) as string;
        const formId = ctx['form_id'] as string || 'default';

        logger.info('[FormRequestProcessor] Handling choice selection', {choiceId, formId});

        if (!choiceId) {
            return {
                outcome: 'failed' as ProcessOutcome,
                error: 'No choice selected'
            } as ProcessResult;
        }

        // Process the choice based on selection
        switch (choiceId) {
            case 'auto':
                return {
                    outcome: 'completed',
                    message: 'Auto mode selected',
                    selection: { choiceId, formId, timestamp: new Date().toISOString() },
                    execute: {
                        message: 'Автоматичний режим вибрано. Очікуйте виконання...',
                        finalResult: {
                            action: 'auto_execute',
                            summary: { mode: 'automatic', status: 'processing' }
                        }
                    }
                } as ProcessResult;

            case 'manual':
                return {
                    outcome: 'completed',
                    message: 'Manual mode selected',
                    selection: { choiceId, formId, timestamp: new Date().toISOString() },
                    execute: {
                        message: 'Ручний режим вибрано. Кроки будуть показані для підтвердження.',
                        form: {
                            title: 'Підтвердьте дію',
                            choices: [
                                { id: 'confirm', label: 'Підтвердити' },
                                { id: 'cancel', label: 'Скасувати' }
                            ]
                        }
                    }
                } as ProcessResult;

            case 'ai':
                return {
                    outcome: 'completed',
                    message: 'AI mode selected',
                    selection: { choiceId, formId, timestamp: new Date().toISOString() },
                    execute: {
                        message: 'AI режим вибрано. Генерація дій через LLM...',
                        form: {
                            title: 'AI генерація дій',
                            choices: [
                                { id: 'generate', label: 'Згенерувати дії' },
                                { id: 'refine', label: 'Уточнити задачу' }
                            ]
                        }
                    }
                } as ProcessResult;

            case 'dialog':
                // Dialog mode selected - return input form for user message
                logger.info('[FormRequestProcessor] Dialog mode selected, returning input form', {choiceId});
                return {
                    outcome: 'completed',
                    message: 'Dialog mode selected',
                    selection: { choiceId, formId, timestamp: new Date().toISOString() },
                    context: {
                        task: (ctx['task'] as string) || 'диалог',
                        execution: {
                            action: 'dialog',
                            step: 'request'
                        }
                    },
                    execute: {
                        form: {
                            input: [
                                {
                                    name: 'message',
                                    type: 'text',
                                    label: 'Повідомлення',
                                    required: true
                                }
                            ]
                        }
                    }
                } as ProcessResult;

            case 'auto-ai':
                // Auto-AI Action Generator mode
                logger.info('[FormRequestProcessor] Auto-AI mode selected, routing to AI-Actions', {choiceId});
                return {
                    outcome: 'ai_action_ready',
                    message: 'Auto-AI mode selected',
                    selection: { choiceId, formId, timestamp: new Date().toISOString() },
                    context: {
                        action: 'auto-ai',
                        execution: {
                            step: 'request',
                            progress: 0
                        }
                    },
                    execute: {
                        message: 'Auto-AI генератор активовано. Аналіз задачі через LLM...',
                        finalResult: {
                            action: 'auto-ai',
                            summary: { mode: 'auto-ai', status: 'processing' }
                        }
                    },
                    aiActions: {
                        action: 'auto-ai',
                        mode: 'llm-driven',
                        step: 'start',
                        completed: false
                    }
                } as ProcessResult;

            case 'task-decomposition':
                // Task decomposition mode
                logger.info('[FormRequestProcessor] Task decomposition mode selected', {choiceId});
                return {
                    outcome: 'completed',
                    message: 'Task decomposition mode selected',
                    selection: { choiceId, formId, timestamp: new Date().toISOString() },
                    execute: {
                        message: 'Декомпозиція задачі. Розбиття на підзадачі...',
                        finalResult: {
                            action: 'task-decomposition',
                            summary: { mode: 'decomposition', status: 'processing' }
                        }
                    }
                } as ProcessResult;

            default:
                return {
                    outcome: 'completed',
                    message: 'Choice selected',
                    selection: { choiceId, formId, timestamp: new Date().toISOString() },
                    execute: {
                        message: `Вибрано: ${choiceId}`
                    }
                } as ProcessResult;
        }
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
     * Validate form data using external validator
     */
    private async validateFormData(form: FormDefinition, data: Record<string, unknown>): Promise<FormValidationError[]> {
        const { validateFormData } = await import('./validators/form-validator.js');
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
