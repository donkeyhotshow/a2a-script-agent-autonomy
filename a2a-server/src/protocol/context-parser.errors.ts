/** Context error parsing and formatting. */

export interface ContextError {
    code: string;
    message: string;
    file?: string;
    line?: number;
}

export function parseContextErrors(block: { errors?: unknown[] }): ContextError[] {
    const errors = block.errors;
    if (!Array.isArray(errors)) return [];
    return errors.filter((e): e is ContextError => {
        if (typeof e !== 'object' || e === null) return false;
        const o = e as Record<string, unknown>;
        return typeof o.code === 'string' && typeof o.message === 'string';
    });
}

export function formatContextError(e: ContextError): string {
    const loc = e.file != null ? ` at ${e.file}${e.line != null ? `:${e.line}` : ''}` : '';
    return `[${e.code}] ${e.message}${loc}`;
}
