/**
 * Simple logger utility for the SDK
 * Provides structured logging with levels
 */

export interface Logger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}

class ConsoleLogger implements Logger {
    private prefix: string;

    constructor(prefix: string = '[SDK]') {
        this.prefix = prefix;
    }

    info(message: string, meta?: Record<string, unknown>): void {
        console.log(`${this.prefix} ${message}`, meta ? JSON.stringify(meta) : '');
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        console.warn(`${this.prefix} ${message}`, meta ? JSON.stringify(meta) : '');
    }

    error(message: string, meta?: Record<string, unknown>): void {
        console.error(`${this.prefix} ${message}`, meta ? JSON.stringify(meta) : '');
    }

    debug(message: string, meta?: Record<string, unknown>): void {
        console.debug(`${this.prefix} ${message}`, meta ? JSON.stringify(meta) : '');
    }
}

// Default logger instance
export const logger = new ConsoleLogger('[SESSION]');