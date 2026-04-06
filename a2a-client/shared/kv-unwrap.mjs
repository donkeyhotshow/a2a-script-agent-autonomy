/**
 * KV files on disk often use `{ value: T }`; unwrap for callers.
 * @param {unknown} parsed
 * @returns {unknown}
 */
export function unwrapKvStoredValue(parsed) {
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'value' in parsed) {
        return parsed.value;
    }
    return parsed;
}
