/**
 * Deep clone via JSON round-trip. Does not preserve Date, Map, Set, undefined,
 * functions, symbols, or circular references.
 */
export function deepCloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
