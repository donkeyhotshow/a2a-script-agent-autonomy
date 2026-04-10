import { logger } from '../../lib/logger.js';

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export async function executeAction<TInput>(
    prefix: string,
    input: TInput,
    validateFn: (input: TInput) => ValidationResult,
    coreLogic: (input: TInput) => Promise<{ success: boolean; error?: string; [key: string]: any }>
): Promise<{ success: boolean; error?: string; [key: string]: any }> {
    logger.info(`[${prefix}] Executing`, input);

    try {
        const validation = validateFn(input);
        if (!validation.valid) {
            return { success: false, error: validation.error! };
        }

        const result = await coreLogic(input);
        return result;
    } catch (error) {
        logger.error(`[${prefix}] Execution failed`, { error: String(error) });
        return { success: false, error: String(error) };
    }
}