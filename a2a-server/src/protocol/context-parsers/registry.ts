/**
 * Context Parser Registry
 *
 * Factory and registry for context parsers
 * Provides automatic parser selection based on context type
 */

import { BaseContextParser, ParseContext } from './base-parser.js';
import { ActionContextParser } from './action-context-parser.js';
import { SimulationContextParser } from './simulation-context-parser.js';
import { FormContextParser } from './form-context-parser.js';
import { ErrorContextParser } from './error-context-parser.js';

/**
 * Context type identifiers
 */
export type ContextType =
    | 'action'
    | 'simulation'
    | 'form'
    | 'error'
    | 'generic';

/**
 * Parser registry entry
 */
interface ParserEntry<T = unknown> {
    type: ContextType;
    parser: new (options?: ParseContext) => BaseContextParser<T>;
    detector: (data: unknown) => boolean;
}

/**
 * Registry for context parsers
 */
export class ContextParserRegistry {
    private static parsers: ParserEntry[] = [
        {
            type: 'action',
            parser: ActionContextParser,
            detector: (data: unknown): boolean => {
                if (!data || typeof data !== 'object') return false;
                const ctx = data as Record<string, unknown>;
                return (
                    // Note: proposedActions removed - use canonical format
                    ctx['executingAction'] !== undefined ||
                    ctx['actionId'] !== undefined
                );
            },
        },
        {
            type: 'simulation',
            parser: SimulationContextParser,
            detector: (data: unknown): boolean => {
                if (!data || typeof data !== 'object') return false;
                const ctx = data as Record<string, unknown>;
                return (
                    ctx['simulation'] !== undefined ||
                    ctx['replay'] !== undefined ||
                    ctx['replayEvents'] !== undefined
                );
            },
        },
        {
            type: 'form',
            parser: FormContextParser,
            detector: (data: unknown): boolean => {
                if (!data || typeof data !== 'object') return false;
                const ctx = data as Record<string, unknown>;
                return (
                    ctx['form'] !== undefined ||
                    ctx['choices'] !== undefined ||
                    ctx['inputs'] !== undefined ||
                    ctx['formId'] !== undefined
                );
            },
        },
        {
            type: 'error',
            parser: ErrorContextParser,
            detector: (data: unknown): boolean => {
                if (!data || typeof data !== 'object') return false;
                const ctx = data as Record<string, unknown>;
                return (
                    ctx['errors'] !== undefined ||
                    ctx['error'] !== undefined ||
                    ctx['hasErrors'] === true
                );
            },
        },
    ];

    /**
     * Register a new parser
     */
    static register<T>(
        type: ContextType,
        parser: new (options?: ParseContext) => BaseContextParser<T>,
        detector: (data: unknown) => boolean
    ): void {
        // Remove existing entry for this type if any
        this.parsers = this.parsers.filter((p) => p.type !== type);
        this.parsers.push({ type, parser, detector });
    }

    /**
     * Detect context type from data
     */
    static detectType(data: unknown): ContextType {
        for (const entry of this.parsers) {
            if (entry.detector(data)) {
                return entry.type;
            }
        }
        return 'generic';
    }

    /**
     * Create parser for detected context type
     */
    static createParser<T>(
        data: unknown,
        options?: ParseContext
    ): BaseContextParser<T> | null {
        const type = this.detectType(data);
        return this.createParserForType<T>(type, options);
    }

    /**
     * Create parser for specific type
     */
    static createParserForType<T>(
        type: ContextType,
        options?: ParseContext
    ): BaseContextParser<T> | null {
        const entry = this.parsers.find((p) => p.type === type);
        if (!entry) return null;
        return new entry.parser(options) as BaseContextParser<T>;
    }

    /**
     * Get all registered types
     */
    static getRegisteredTypes(): ContextType[] {
        return this.parsers.map((p) => p.type);
    }

    /**
     * Check if type is registered
     */
    static isRegistered(type: ContextType): boolean {
        return this.parsers.some((p) => p.type === type);
    }
}

/**
 * Create appropriate parser for context data
 */
export function createParserForContext<T>(
    data: unknown,
    options?: ParseContext
): BaseContextParser<T> | null {
    return ContextParserRegistry.createParser<T>(data, options);
}

/**
 * Create parser for specific context type
 */
export function createParserForType<T>(
    type: ContextType,
    options?: ParseContext
): BaseContextParser<T> | null {
    return ContextParserRegistry.createParserForType<T>(type, options);
}

/**
 * Detect context type from data
 */
export function detectContextType(data: unknown): ContextType {
    return ContextParserRegistry.detectType(data);
}
