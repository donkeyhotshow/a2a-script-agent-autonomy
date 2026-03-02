/**
 * A2A Protocol - context and file block handling
 */

const VERSION = '1.0';

export interface FileBlockLike {
    path: string;
    content: string;
    startLine?: number;
    endLine?: number;
}

export function buildNewTaskContext(
    sessionId: string,
    newTask: string[],
    architecturalFeatures?: string[]
): Record<string, unknown> {
    const ctx: Record<string, unknown> = {version: VERSION, session_id: sessionId, new_task: newTask};
    if (architecturalFeatures?.length) ctx.architectural_features = architecturalFeatures;
    return ctx;
}

export function buildContinueContext(sessionId: string): Record<string, unknown> {
    return {version: VERSION, session_id: sessionId, continue: true};
}

export function buildConfirmContext(sessionId: string): Record<string, unknown> {
    return {version: VERSION, session_id: sessionId, confirm: true};
}

export function buildFileResponseContext(sessionId: string): Record<string, unknown> {
    return {version: VERSION, session_id: sessionId};
}

export function serializeFileBlock(
    path: string,
    content: string,
    startLine?: number,
    endLine?: number
): string {
    const sig = endLine != null ? `${path}:${startLine}-${endLine}` : path;
    return `\`\`\`file:${sig}\n${content}\n\`\`\``;
}

export function parseFileBlock(
    text: string
): { path: string; content: string; startLine?: number; endLine?: number } | null {
    const m = text.match(/^```file:([^\n]+)\n([\s\S]*?)```$/m);
    if (!m) return null;
    const [, sig, content] = m;
    const rangeMatch = sig?.match(/^(.+):(\d+)-(\d+)$/);
    if (rangeMatch) {
        return {
            path: rangeMatch[1],
            content: content.trim(),
            startLine: +rangeMatch[2],
            endLine: +rangeMatch[3],
        };
    }
    return {path: sig ?? '', content: content.trim()};
}

export function serializeMessage(
    context: Record<string, unknown>,
    files: FileBlockLike[] = []
): string {
    const parts = [`\`\`\`context\n${JSON.stringify(context, null, 0)}\n\`\`\``];
    for (const f of files) {
        parts.push(serializeFileBlock(f.path, f.content, f.startLine, f.endLine));
    }
    return parts.join('\n\n');
}

export function parseMessage(text: string): { context: Record<string, unknown>; files: FileBlockLike[] } | null {
    const contextMatch = text.match(/```context\n([\s\S]*?)```/);
    if (!contextMatch) return null;
    let context: Record<string, unknown>;
    try {
        context = JSON.parse(contextMatch[1].trim());
    } catch {
        return null;
    }
    const files: FileBlockLike[] = [];
    const fileRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    while ((match = fileRegex.exec(text)) !== null) {
        const sig = match[1];
        const content = match[2].trim();
        const rangeMatch = sig.match(/^(.+):(\d+)-(\d+)$/);
        if (rangeMatch) {
            files.push({
                path: rangeMatch[1],
                content,
                startLine: +rangeMatch[2],
                endLine: +rangeMatch[3],
            });
        } else {
            files.push({path: sig, content});
        }
    }
    return {context, files};
}

export {VERSION};
