/**
 * Extractors Registry
 *
 * Centralized registration and access to all entity extractors.
 */

import type { ExtractionInput, ExtractionResult, EntityExtractor } from '../types.js';
import { extractPHPEntity, canHandlePHP } from './php-extractor.js';
import { extractVueEntity, canHandleVue } from './vue-extractor.js';

// Re-export individual extractors
export { extractPHPEntity, canHandlePHP } from './php-extractor.js';
export { extractVueEntity, canHandleVue } from './vue-extractor.js';

/**
 * Registry of available extractors
 */
const extractors: Array<{ canHandle: (path: string) => boolean; extract: (input: ExtractionInput) => ExtractionResult }> = [
    { canHandle: canHandlePHP, extract: extractPHPEntity },
    { canHandle: canHandleVue, extract: extractVueEntity },
];

/**
 * Find extractor for given file path
 * Returns null if no suitable extractor found
 */
export function findExtractor(path: string): ((input: ExtractionInput) => ExtractionResult) | null {
    for (const extractor of extractors) {
        if (extractor.canHandle(path)) {
            return extractor.extract;
        }
    }
    return null;
}

/**
 * Check if any extractor can handle this file
 */
export function canExtract(path: string): boolean {
    return extractors.some(e => e.canHandle(path));
}

/**
 * Extract entity using appropriate extractor
 * Returns null if no suitable extractor found
 */
export function extractEntity(input: ExtractionInput): ExtractionResult | null {
    const extractor = findExtractor(input.path);
    if (!extractor) {
        return null;
    }
    return extractor(input);
}
