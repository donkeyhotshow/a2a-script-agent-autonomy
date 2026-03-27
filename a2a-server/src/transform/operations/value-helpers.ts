/**
 * Value Helper Functions for Transform Operations
 * 
 * Helper functions for working with values in transform operations
 */

/**
 * Check if we should skip duplicate user history append
 * Prevents adding duplicate user messages to history
 */
export function shouldSkipDuplicateUserHistoryAppend(existing: unknown[] | undefined, entry: unknown): boolean {
  if (!existing?.length || !entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return false;
  }
  const e = entry as Record<string, unknown>;
  if (e.role !== 'user' || typeof e.message !== 'string') {
    return false;
  }
  const last = existing[existing.length - 1];
  if (!last || typeof last !== 'object' || Array.isArray(last)) {
    return false;
  }
  const le = last as Record<string, unknown>;
  return le.role === 'user' && le.message === e.message;
}

/**
 * Truncate text to maximum characters with suffix
 */
export function truncateToMaxChars(text: string, maxChars: number, suffix: string): string {
  if (text.length <= maxChars) return text;
  const suf = suffix;
  if (suf.length >= maxChars) return text.slice(0, maxChars);
  return text.slice(0, maxChars - suf.length) + suf;
}

/**
 * Stringify value for template rendering
 */
export function stringifyForTemplate(value: unknown): string {
  if (value === undefined) {
    return 'null';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(sortKeys(value), null, 2);
}

/**
 * Sort keys in an object recursively
 */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (typeof value === 'object' && value !== null) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}