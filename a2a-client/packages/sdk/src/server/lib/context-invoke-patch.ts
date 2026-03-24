/**
 * Whitelist context fields merged from A2A invoke responses (Issue 09 §5).
 * Drops accidental LLM/tool blobs from result.context / data.context.
 */

export function pickInvokeContextPatch(src: unknown): Record<string, unknown> {
    if (!src || typeof src !== 'object' || Array.isArray(src)) {
        return {};
    }
    const o = src as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    if (typeof o.task === 'string' && o.task.length > 0) {
        out.task = o.task;
    }
    if (o.execution && typeof o.execution === 'object' && !Array.isArray(o.execution)) {
        out.execution = o.execution;
    }
    if (Array.isArray(o.history)) {
        out.history = o.history;
    }
    if (o.files && typeof o.files === 'object' && !Array.isArray(o.files)) {
        out.files = o.files;
    }
    if (o.scratchpad && typeof o.scratchpad === 'object' && !Array.isArray(o.scratchpad)) {
        out.scratchpad = o.scratchpad;
    }
    if (o.workbench !== undefined) {
        out.workbench = o.workbench;
    }
    if (o.ragResults !== undefined) {
        out.ragResults = o.ragResults;
    }
    if (typeof o.version === 'string') {
        out.version = o.version;
    }
    if (o.vite_config && typeof o.vite_config === 'object' && !Array.isArray(o.vite_config)) {
        out.vite_config = o.vite_config;
    }
    if (o.aliases && typeof o.aliases === 'object' && !Array.isArray(o.aliases)) {
        out.aliases = o.aliases;
    }

    return out;
}
