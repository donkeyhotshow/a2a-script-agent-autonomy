/**
 * String normalization utilities for matching operations
 */

/**
 * Normalizes a string for keyword matching:
 * - Converts to lowercase
 * - Splits on whitespace
 * - Filters out words shorter than 3 characters
 *
 * Maintains exact behavior matching original implementation in action-registry.ts
 */
export function normalizeForMatching(input: string): string[] {
    return input
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2);
}
