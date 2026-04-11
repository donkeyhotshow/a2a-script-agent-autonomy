/**
 * Configuration Validation Module
 *
 * Centralized validation functions for configuration.
 * Contains all validation logic in one place to avoid duplication.
 */
/**
 * Formats Zod validation errors into human-readable messages.
 */
export declare function formatValidationErrors(error: z.ZodError): string;
/**
 * Validates configuration and returns typed config object.
 * Throws error with detailed message if validation fails.
 */
export declare function validateConfig(): AppConfig;
/**
 * Validates configuration without throwing.
 * Returns result object with success status and either config or errors.
 */
export declare function validateConfigSafe(): {
    success: true;
    config: AppConfig;
    errors: null;
} | {
    success: false;
    config: null;
    errors: string[];
};
/**
 * Validates only port configuration.
 * Useful for service startup validation.
 */
export declare function validatePorts(): {};
/**
 * Validates only database configuration.
 */
export declare function validateDatabase(): any;
/**
 * Validates only security configuration.
 */
export declare function validateSecurity(): any;
/**
 * Validates only AI Hub configuration.
 */
export declare function validateAIHub(): any;
//# sourceMappingURL=config-validator.d.ts.map