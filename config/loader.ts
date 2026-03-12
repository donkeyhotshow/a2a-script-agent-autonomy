/**
 * Configuration Loader & Validator
 * Loads raw config and validates/parses with Zod.
 * <80 lines
 */

import { z } from 'zod';
import { appConfigSchema } from './schema.js';
import { RawConfig, mapEnvironmentVariables } from './env-mapper.js';
import type { AppConfig } from './types.js';

/**
 * Formats Zod errors to readable messages.
 */
function formatValidationErrors(error: z.ZodError): string {
    const lines = error.issues.map((issue) => {
        const path = issue.path.join('.');
        const message = issue.message;
        return `  - ${path}: ${message}`;
    });
    return lines.join('\n');
}

/**
 * Validates and parses raw config, throws detailed error.
 */
export function validateConfig(): AppConfig {
    const rawConfig = mapEnvironmentVariables();
    
    try {
        // Compute promisesDir if missing
        const computedConfig = {
            ...rawConfig,
            proxy: {
                ...rawConfig.proxy,
                promisesDir: rawConfig.proxy.promisesDir || 
                    (rawConfig.proxy.storageDir ? `${rawConfig.proxy.storageDir}/promises` : undefined),
            },
        } as RawConfig;
        
        return appConfigSchema.parse(computedConfig);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessage = formatValidationErrors(error);
            throw new Error(
                `Configuration validation failed. Please check .env:\n${errorMessage}\n\n` +
                `See docs/CONFIGURATION.md`
            );
        }
        throw error;
    }
}

/**
 * Safe validation, returns success/error object.
 */
export function validateConfigSafe(): 
    | { success: true; config: AppConfig }
    | { success: false; errors: string[] } {
    
    const rawConfig = mapEnvironmentVariables();
    
    try {
        const computedConfig = {
            ...rawConfig,
            proxy: {
                ...rawConfig.proxy,
                promisesDir: rawConfig.proxy.promisesDir || 
                    (rawConfig.proxy.storageDir ? `${rawConfig.proxy.storageDir}/promises` : undefined),
            },
        } as RawConfig;
        
        const config = appConfigSchema.parse(computedConfig);
        return { success: true, config };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.issues.map((issue) => {
                const path = issue.path.join('.');
                return `${path}: ${issue.message}`;
            });
            return { success: false, errors };
        }
        throw error;
    }
}

// Individual validators (moved to validators/ later)
export function validatePorts() {
    const raw = mapEnvironmentVariables().ports;
    return z.object({
        serverPort: z.coerce.number().int().min(1).max(65535),
        // ... simplified
    }).parse(raw);
}

// Export for barrel
export { validateConfig, validateConfigSafe, validatePorts };
