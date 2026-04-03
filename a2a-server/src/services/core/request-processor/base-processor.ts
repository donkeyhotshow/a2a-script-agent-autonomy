/**
 * Base Request Processor
 *
 * Abstract base class for all request processors. Defines the common interface
 * and shared functionality for processing different types of requests.
 */

import {logger} from '../../../utils/logger.js';
import type {
    RequestContext,
    ProcessResult,
    ValidationResult
} from './request-processor.interfaces.js';
import type {CodeBlock} from '../../../types/entity.types.js';
import {resolveExecution} from './normalization.js';
import {LLM_PIPELINE_ACTIONS} from '../../../config/router-static.js';

/**
 * Base processor configuration
 */
export interface BaseProcessorConfig {
    maxRetries: number;
    retryDelay: number;
    timeout: number;
    enableValidation: boolean;
    simulationsBasePath?: string;
    promptsTransformsPath?: string;
    enableReplay?: boolean;
    defaultSimulation?: string | null;
}

/**
 * Default processor configuration
 */
export const DEFAULT_PROCESSOR_CONFIG: BaseProcessorConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    enableValidation: true
};

/**
 * Request type enum for processor selection
 */
export type RequestType = 'action' | 'simulation' | 'form' | 'dialog' | 'neuron' | 'unknown';

/**
 * Abstract base class for all request processors
 */
export abstract class BaseRequestProcessor {
    public config: BaseProcessorConfig;
    public processorName: string;

    public getProcessorName(): string {
        return this.processorName;
    }

    constructor(processorName: string, config: Partial<BaseProcessorConfig> = {}) {
        this.processorName = processorName;
        this.config = {...DEFAULT_PROCESSOR_CONFIG, ...config};
    }

    /**
     * Main entry point for processing a request
     * Validates, processes, and cleans up
     */
    async process(request: RequestContext): Promise<ProcessResult> {
        const startTime = Date.now();
        const {promiseId} = request;

        try {
            logger.info(`[${this.processorName}] Starting processing`, {
                promiseId,
                processor: this.processorName
            });

            // Validate the request
            const validation = await this.validate(request);
            if (!validation.valid) {
                logger.warn(`[${this.processorName}] Validation failed`, {
                    promiseId,
                    errors: validation.errors
                });
                return this.createValidationErrorResult(validation);
            }

            // Process the request
            const result = await this.doProcess(request);

            // Schema validation disabled for simulations

            const duration = Date.now() - startTime;
            logger.info(`[${this.processorName}] Processing completed`, {
                promiseId,
                outcome: result.outcome,
                duration
            });

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`[${this.processorName}] Processing error`, {
                promiseId,
                error: error instanceof Error ? error.message : String(error),
                duration
            });

            return this.createErrorResult(error);

        } finally {
            // Always cleanup
            await this.cleanup(request);
        }
    }

    /**
     * Validate the request before processing
     * Override in subclasses for specific validation logic
     */
    async validate(request: RequestContext): Promise<ValidationResult> {
        const errors: Array<{field: string; code: string; message: string; severity: 'error' | 'warning' | 'info'}> = [];

        // Basic validation
        if (!request.promiseId) {
            errors.push({
                field: 'promiseId',
                code: 'MISSING_PROMISE_ID',
                message: 'Promise ID is required',
                severity: 'error'
            });
        }

        if (!request.context) {
            errors.push({
                field: 'context',
                code: 'MISSING_CONTEXT',
                message: 'Request context is required',
                severity: 'error'
            });
        }

        return {
            valid: errors.filter(e => e.severity === 'error').length === 0,
            errors,
        };
    }

    /**
     * Main processing logic - must be implemented by subclasses
     */
    protected abstract doProcess(request: RequestContext): Promise<ProcessResult>;

    /**
     * Cleanup resources after processing
     * Override in subclasses if needed
     */
    protected async cleanup(request: RequestContext): Promise<void> {
        logger.debug(`[${this.processorName}] Cleanup`, {promiseId: request.promiseId});
    }

    /**
     * Get the request type this processor handles
     */
    abstract getRequestType(): RequestType;

    /**
     * Check if this processor can handle the given request
     */
    abstract canProcess(request: RequestContext): boolean;

    /**
     * Create a successful result
     */
    protected createSuccessResult(data: Partial<ProcessResult> = {}): ProcessResult {
        return {
            outcome: 'completed',
            ...data
        };
    }

    /**
     * Create an error result
     */
    protected createErrorResult(error: unknown): ProcessResult {
        return {
            outcome: 'failed',
            error: error instanceof Error ? error.message : String(error)
        } as ProcessResult;
    }

    /**
     * Create a validation error result
     */
    protected createValidationErrorResult(validation: ValidationResult): ProcessResult {
        const errorMessages = validation.errors
            .filter(e => e.severity === 'error')
            .map(e => `${e.field}: ${e.message}`)
            .join('; ');

        return {
            outcome: 'failed',
            error: `Validation failed: ${errorMessages}`,
            validationErrors: validation.errors
        } as ProcessResult;
    }

    /**
     * Parse task text from various context formats
     */
    protected parseTaskText(ctx: Record<string, unknown>): string {
        const toStr = (v: unknown): string | null => {
            if (!v) return null;
            if (Array.isArray(v)) return v.join(' ');
            if (typeof v === 'string') return v;
            return null;
        };
        const nestedCtx = ctx['context'] as Record<string, unknown> | undefined;
        const resultObj = ctx['result'];
        const resultMsg =
            resultObj && typeof resultObj === 'object' && !Array.isArray(resultObj)
                ? toStr((resultObj as Record<string, unknown>)['message'])
                : null;
        // Prefer explicit message/result.message over task (task can be stale on context when user submits a new line).
        return (
            toStr(ctx['message']) ??
            resultMsg ??
            toStr(ctx['task']) ??
            toStr(ctx['new_task']) ??
            toStr(nestedCtx?.['task']) ??
            ''
        );
    }

    /**
     * Parse code blocks from request
     */
    protected parseCodeBlocks(blocks: unknown): CodeBlock[] {
        if (!Array.isArray(blocks)) return [];
        return blocks
            .filter((b): b is { path: string; content: string } =>
                typeof b === 'object' && b !== null &&
                typeof (b as Record<string, unknown>)['path'] === 'string' &&
                typeof (b as Record<string, unknown>)['content'] === 'string'
            )
            .map(b => ({path: b['path'], content: b['content']}));
    }

    /**
     * Get action type from context
     */
    protected getActionType(ctx: Record<string, unknown>): string | undefined {
        return ctx['action'] as string | undefined;
    }

    /**
     * Check if this is a step result request
     */
    protected isStepResult(ctx: Record<string, unknown>): boolean {
        const actionType = this.getActionType(ctx);
        const hasContinue = Boolean(ctx['continue']);
        const hasStepResult = Boolean(ctx['step_result']);
        return actionType === 'step_result' || (hasContinue && hasStepResult);
    }

    /**
     * Check if this is a task request
     * Returns false if execution.action is already set to an LLM pipeline action (e.g., agent mode seeded from session create)
     */
    protected isTaskRequest(ctx: Record<string, unknown>): boolean {
        const actionType = this.getActionType(ctx);
        if (actionType === 'task_request') return true;
        if (actionType !== undefined) return false;
        // actionType is undefined - check if execution.action is already an LLM pipeline action
        const exec = resolveExecution(ctx);
        const execAction = exec?.['action'] as string | undefined;
        if (execAction && LLM_PIPELINE_ACTIONS.includes(execAction)) {
            return false; // Already in LLM pipeline, not a new task request
        }
        return true;
    }

    /**
     * Check if this is an approve action request
     */
    protected isApproveAction(ctx: Record<string, unknown>): boolean {
        return this.getActionType(ctx) === 'approve_action';
    }
}

/**
 * Processor registry for managing available processors
 */
export class ProcessorRegistry {
    private processors: Map<RequestType, BaseRequestProcessor> = new Map();

    /**
     * Register a processor for a request type
     */
    register(type: RequestType, processor: BaseRequestProcessor): void {
        this.processors.set(type, processor);
        logger.info('[ProcessorRegistry] Registered processor', {type, processor: processor.processorName});
    }

    /**
     * Get processor for a request type
     */
    get(type: RequestType): BaseRequestProcessor | undefined {
        return this.processors.get(type);
    }

    /**
     * Find processor that can handle the request
     */
    findProcessor(request: RequestContext): BaseRequestProcessor | undefined {
        for (const processor of this.processors.values()) {
            if (processor.canProcess(request)) {
                return processor;
            }
        }
        return undefined;
    }

    /**
     * Get all registered processors
     */
    getAll(): BaseRequestProcessor[] {
        return Array.from(this.processors.values());
    }
}

// Global processor registry instance
export const processorRegistry = new ProcessorRegistry();
