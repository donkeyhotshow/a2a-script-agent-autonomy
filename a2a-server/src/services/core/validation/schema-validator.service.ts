/**
 * Schema Validation Service
 * 
 * Provides JSON Schema validation using AJV for A2A protocol requests and responses.
 * Validation is enabled by default in development mode and can be optionally disabled.
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { logger } from '../../../utils/logger.js';

// Import JSON schemas
import serverInvokeRequestSchema from '../../../../../docs/new-request-flow/json-schemas/server-invoke-request.schema.json';
import serverInvokeResponseFirstFormSchema from '../../../../../docs/new-request-flow/json-schemas/server-invoke-response-first-form.schema.json';
import serverInvokeResponseExecuteSchema from '../../../../../docs/new-request-flow/json-schemas/server-invoke-response-execute.schema.json';
import serverInvokeResponsePendingSchema from '../../../../../docs/new-request-flow/json-schemas/server-invoke-response-pending.schema.json';
import clientResultSchema from '../../../../../docs/new-request-flow/json-schemas/client-result.schema.json';

/**
 * Schema types for validation
 */
export type SchemaType = 
    | 'server-invoke-request'
    | 'server-invoke-response-first-form'
    | 'server-invoke-response-execute'
    | 'server-invoke-response-pending'
    | 'client-result';

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

/**
 * Detailed validation error
 */
export interface ValidationError {
    path: string;
    message: string;
    keyword: string;
    params: Record<string, unknown>;
}

/**
 * Schema validator configuration
 */
export interface SchemaValidatorConfig {
    /** Enable validation (default: true in development, false in production) */
    enabled: boolean;
    /** Throw on validation error (default: false - just log) */
    throwOnError: boolean;
    /** Custom AJV instance */
    ajv?: Ajv;
}

/**
 * Default configuration - validation enabled in development
 */
const DEFAULT_CONFIG: SchemaValidatorConfig = {
    enabled: process.env.NODE_ENV !== 'production',
    throwOnError: false
};

/**
 * Schema map for quick lookup
 */
const SCHEMA_MAP: Record<SchemaType, object> = {
    'server-invoke-request': serverInvokeRequestSchema,
    'server-invoke-response-first-form': serverInvokeResponseFirstFormSchema,
    'server-invoke-response-execute': serverInvokeResponseExecuteSchema,
    'server-invoke-response-pending': serverInvokeResponsePendingSchema,
    'client-result': clientResultSchema
};

/**
 * Schema Validator Service
 * 
 * Validates A2A protocol requests and responses against JSON schemas.
 * Uses AJV for schema validation with support for Draft-07 JSON Schema.
 */
export class SchemaValidatorService {
    private ajv: Ajv;
    private validators: Map<SchemaType, ValidateFunction> = new Map();
    private config: SchemaValidatorConfig;

    /**
     * Create a new SchemaValidatorService
     */
    constructor(config: Partial<SchemaValidatorConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        // Initialize AJV with strict mode disabled for flexibility
        this.ajv = this.config.ajv || new Ajv({
            strict: false,
            allErrors: true,
            verbose: true,
            coerceTypes: false,
            removeAdditional: false
        });

        // Add format support
        addFormats(this.ajv);

        // Compile all schemas
        this.compileSchemas();
    }

    /**
     * Compile all schemas into validators
     */
    private compileSchemas(): void {
        for (const [type, schema] of Object.entries(SCHEMA_MAP)) {
            try {
                const validator = this.ajv.compile(schema);
                this.validators.set(type as SchemaType, validator);
                logger.debug(`[SchemaValidator] Compiled schema: ${type}`);
            } catch (error) {
                logger.error(`[SchemaValidator] Failed to compile schema: ${type}`, {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    }

    /**
     * Check if validation is enabled
     */
    isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Enable or disable validation
     */
    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
        logger.info(`[SchemaValidator] Validation ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Validate data against a schema
     */
    private validateData(data: unknown, validator: ValidateFunction): ValidationResult {
        const valid = validator(data);

        if (valid) {
            return { valid: true, errors: [] };
        }

        const errors: ValidationError[] = (validator.errors || []).map((error: ErrorObject) => ({
            path: error.instancePath || '/',
            message: error.message || 'Validation error',
            keyword: error.keyword,
            params: error.params as Record<string, unknown>
        }));

        return { valid: false, errors };
    }

    /**
     * Validate server invoke request
     * 
     * @param data - Request data to validate
     * @returns Validation result
     */
    validateRequest(data: unknown): ValidationResult {
        if (!this.config.enabled) {
            return { valid: true, errors: [] };
        }

        const validator = this.validators.get('server-invoke-request');
        if (!validator) {
            logger.warn('[SchemaValidator] Request validator not available');
            return { valid: true, errors: [] };
        }

        const result = this.validateData(data, validator);

        if (!result.valid) {
            logger.warn('[SchemaValidator] Request validation failed', {
                errors: result.errors
            });

            if (this.config.throwOnError) {
                throw new Error(`Request validation failed: ${JSON.stringify(result.errors)}`);
            }
        }

        return result;
    }

    /**
     * Validate first form response
     * 
     * @param data - Response data to validate
     * @returns Validation result
     */
    validateFirstFormResponse(data: unknown): ValidationResult {
        if (!this.config.enabled) {
            return { valid: true, errors: [] };
        }

        const validator = this.validators.get('server-invoke-response-first-form');
        if (!validator) {
            logger.warn('[SchemaValidator] First form response validator not available');
            return { valid: true, errors: [] };
        }

        const result = this.validateData(data, validator);

        if (!result.valid) {
            logger.warn('[SchemaValidator] First form response validation failed', {
                errors: result.errors
            });

            if (this.config.throwOnError) {
                throw new Error(`Response validation failed: ${JSON.stringify(result.errors)}`);
            }
        }

        return result;
    }

    /**
     * Validate execute response
     * 
     * @param data - Response data to validate
     * @returns Validation result
     */
    validateExecuteResponse(data: unknown): ValidationResult {
        if (!this.config.enabled) {
            return { valid: true, errors: [] };
        }

        const validator = this.validators.get('server-invoke-response-execute');
        if (!validator) {
            logger.warn('[SchemaValidator] Execute response validator not available');
            return { valid: true, errors: [] };
        }

        const result = this.validateData(data, validator);

        if (!result.valid) {
            logger.warn('[SchemaValidator] Execute response validation failed', {
                errors: result.errors
            });

            if (this.config.throwOnError) {
                throw new Error(`Response validation failed: ${JSON.stringify(result.errors)}`);
            }
        }

        return result;
    }

    /**
     * Validate pending response
     * 
     * @param data - Response data to validate
     * @returns Validation result
     */
    validatePendingResponse(data: unknown): ValidationResult {
        if (!this.config.enabled) {
            return { valid: true, errors: [] };
        }

        const validator = this.validators.get('server-invoke-response-pending');
        if (!validator) {
            logger.warn('[SchemaValidator] Pending response validator not available');
            return { valid: true, errors: [] };
        }

        const result = this.validateData(data, validator);

        if (!result.valid) {
            logger.warn('[SchemaValidator] Pending response validation failed', {
                errors: result.errors
            });

            if (this.config.throwOnError) {
                throw new Error(`Response validation failed: ${JSON.stringify(result.errors)}`);
            }
        }

        return result;
    }

    /**
     * Validate server response (auto-detect type)
     * 
     * @param data - Response data to validate
     * @returns Validation result
     */
    validateResponse(data: unknown): ValidationResult {
        if (!this.config.enabled) {
            return { valid: true, errors: [] };
        }

        if (!data || typeof data !== 'object') {
            return { 
                valid: false, 
                errors: [{ 
                    path: '/', 
                    message: 'Response must be an object', 
                    keyword: 'type',
                    params: {}
                }] 
            };
        }

        const response = data as Record<string, unknown>;

        // Auto-detect response type
        if ('promiseId' in response && 'status' in response) {
            return this.validatePendingResponse(data);
        }

        if ('execute' in response && 'form' in (response.execute as object)) {
            return this.validateFirstFormResponse(data);
        }

        if ('execute' in response) {
            return this.validateExecuteResponse(data);
        }

        // Unknown response type, log warning but don't fail
        logger.warn('[SchemaValidator] Unknown response type, skipping validation');
        return { valid: true, errors: [] };
    }

    /**
     * Validate client result
     * 
     * @param data - Result data to validate
     * @returns Validation result
     */
    validateResult(data: unknown): ValidationResult {
        if (!this.config.enabled) {
            return { valid: true, errors: [] };
        }

        const validator = this.validators.get('client-result');
        if (!validator) {
            logger.warn('[SchemaValidator] Result validator not available');
            return { valid: true, errors: [] };
        }

        const result = this.validateData(data, validator);

        if (!result.valid) {
            logger.warn('[SchemaValidator] Result validation failed', {
                errors: result.errors
            });

            if (this.config.throwOnError) {
                throw new Error(`Result validation failed: ${JSON.stringify(result.errors)}`);
            }
        }

        return result;
    }

    /**
     * Validate data against a specific schema type
     * 
     * @param type - Schema type to validate against
     * @param data - Data to validate
     * @returns Validation result
     */
    validate(type: SchemaType, data: unknown): ValidationResult {
        if (!this.config.enabled) {
            return { valid: true, errors: [] };
        }

        const validator = this.validators.get(type);
        if (!validator) {
            logger.warn(`[SchemaValidator] Validator not available for: ${type}`);
            return { valid: true, errors: [] };
        }

        const result = this.validateData(data, validator);

        if (!result.valid) {
            logger.warn(`[SchemaValidator] Validation failed for: ${type}`, {
                errors: result.errors
            });

            if (this.config.throwOnError) {
                throw new Error(`${type} validation failed: ${JSON.stringify(result.errors)}`);
            }
        }

        return result;
    }
}

// Default singleton instance
let schemaValidatorInstance: SchemaValidatorService | null = null;

/**
 * Get the default schema validator instance
 * 
 * @param config - Optional configuration override
 * @returns SchemaValidatorService instance
 */
export function getSchemaValidator(config?: Partial<SchemaValidatorConfig>): SchemaValidatorService {
    if (!schemaValidatorInstance) {
        schemaValidatorInstance = new SchemaValidatorService(config);
    }
    return schemaValidatorInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetSchemaValidator(): void {
    schemaValidatorInstance = null;
}

/**
 * Helper function to validate and throw on error
 * 
 * @param type - Schema type
 * @param data - Data to validate
 * @param validator - Validator instance
 * @throws Error if validation fails and throwOnError is true
 */
export function validateOrThrow(type: SchemaType, data: unknown, validator: SchemaValidatorService): ValidationResult {
    const result = validator.validate(type, data);
    if (!result.valid && validator.isEnabled()) {
        throw new Error(`Schema validation failed for ${type}: ${JSON.stringify(result.errors)}`);
    }
    return result;
}
