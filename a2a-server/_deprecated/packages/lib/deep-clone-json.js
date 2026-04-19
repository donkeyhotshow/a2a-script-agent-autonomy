/**
 * Deep clone via JSON round-trip. Does not preserve Date, Map, Set, undefined,
 * functions, symbols, or circular references.
 */
export function deepCloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}
//# sourceMappingURL=deep-clone-json.js.map