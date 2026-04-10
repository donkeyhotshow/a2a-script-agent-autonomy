export function deriveSessionStage(params) {
    const execute = params?.execute || null;
    if (!execute || typeof execute !== 'object' || Array.isArray(execute)) return null;
    // derive logic
    return 'idle'; // placeholder
}