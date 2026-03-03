/**
 * Entity Recognition Utilities
 *
 * Shared helper functions for entity recognition.
 */

import type { EntityTypeName, RelationTypeName } from '../../types/entity.types.js';

/**
 * Generate unique entity ID
 * Format: {type}-{normalizedPath}-{name}
 */
export function generateEntityId(type: EntityTypeName, name: string, path: string): string {
    const normalizedPath = path.replace(/[\\/]/g, '-').replace(/\.[^.]+$/, '');
    return `${type.toLowerCase()}-${normalizedPath}-${name.toLowerCase()}`;
}

/**
 * Generate unique relation ID
 * Format: rel-{type}-{fromPath}-{toPath}
 */
export function generateRelationId(
    fromPath: string,
    toPath: string | undefined,
    type: RelationTypeName
): string {
    const normalizedFrom = fromPath.replace(/[\\/]/g, '-');
    const normalizedTo = toPath || 'unknown';
    return `rel-${type.toLowerCase()}-${normalizedFrom}-${normalizedTo}`;
}

/**
 * Get line number from content index
 * Used for reporting entity locations
 */
export function getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
}

/**
 * Normalize file path for consistent handling
 * Converts backslashes to forward slashes
 */
export function normalizePath(path: string): string {
    return path.replace(/\\/g, '/');
}

/**
 * Get file extension from path
 */
export function getFileExtension(path: string): string {
    return path.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if path matches a glob-like pattern
 * Simple implementation for common patterns like star-star-slash-star-dot-php
 */
export function matchesPattern(path: string, pattern: string): boolean {
    const normalizedPath = normalizePath(path);

    // Convert pattern to regex
    const regexPattern = pattern
        .replace(/\*\*/g, '{{GLOBSTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
        .replace(/\{\{GLOBSTAR\}\}/g, '.*');

    const regex = new RegExp(regexPattern);
    return regex.test(normalizedPath);
}
