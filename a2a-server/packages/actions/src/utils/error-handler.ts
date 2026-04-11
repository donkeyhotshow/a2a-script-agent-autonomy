/**
 * Shared error handling utility
 * Standardizes logging and conditional rethrow pattern
 */

export type ErrorPolicy = 'fail-fast' | 'lenient' | string;

export interface HandleErrorOptions {
    logger: {
        error: (message: string, metadata?: Record<string, unknown>) => void;
        warn?: (message: string, metadata?: Record<string, unknown>) => void;
    };
    component: string;
    message: string;
    error: unknown;
    policy: ErrorPolicy;
    onLenient?: () => void;
}

export function handleError(options: HandleErrorOptions): void {
    const { logger, component, message, error, policy, onLenient } = options;

    logger.error(`[${component}] ${message}`, {
        error: error instanceof Error ? error.message : String(error)
    });

    if (policy === 'fail-fast') {
        throw error;
    }

    if (onLenient) {
        onLenient();
    }
}
