export function unwrapKvStoredValue(parsed) {
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'value' in parsed) {
        return parsed.value;
    }
    return parsed;
}
