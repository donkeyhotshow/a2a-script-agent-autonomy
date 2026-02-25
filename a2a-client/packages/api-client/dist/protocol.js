"use strict";
/**
 * A2A Protocol - context and file block handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = void 0;
exports.buildNewTaskContext = buildNewTaskContext;
exports.buildContinueContext = buildContinueContext;
exports.buildConfirmContext = buildConfirmContext;
exports.buildFileResponseContext = buildFileResponseContext;
exports.serializeFileBlock = serializeFileBlock;
exports.parseFileBlock = parseFileBlock;
exports.serializeMessage = serializeMessage;
exports.parseMessage = parseMessage;
const VERSION = '1.0';
exports.VERSION = VERSION;
function buildNewTaskContext(sessionId, newTask, architecturalFeatures) {
    const ctx = { version: VERSION, session_id: sessionId, new_task: newTask };
    if (architecturalFeatures?.length)
        ctx.architectural_features = architecturalFeatures;
    return ctx;
}
function buildContinueContext(sessionId) {
    return { version: VERSION, session_id: sessionId, continue: true };
}
function buildConfirmContext(sessionId) {
    return { version: VERSION, session_id: sessionId, confirm: true };
}
function buildFileResponseContext(sessionId) {
    return { version: VERSION, session_id: sessionId };
}
function serializeFileBlock(path, content, startLine, endLine) {
    const sig = endLine != null ? `${path}:${startLine}-${endLine}` : path;
    return `\`\`\`file:${sig}\n${content}\n\`\`\``;
}
function parseFileBlock(text) {
    const m = text.match(/^```file:([^\n]+)\n([\s\S]*?)```$/m);
    if (!m)
        return null;
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
    return { path: sig ?? '', content: content.trim() };
}
function serializeMessage(context, files = []) {
    const parts = [`\`\`\`context\n${JSON.stringify(context, null, 0)}\n\`\`\``];
    for (const f of files) {
        parts.push(serializeFileBlock(f.path, f.content, f.startLine, f.endLine));
    }
    return parts.join('\n\n');
}
function parseMessage(text) {
    const contextMatch = text.match(/```context\n([\s\S]*?)```/);
    if (!contextMatch)
        return null;
    let context;
    try {
        context = JSON.parse(contextMatch[1].trim());
    }
    catch {
        return null;
    }
    const files = [];
    const fileRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
    let match;
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
        }
        else {
            files.push({ path: sig, content });
        }
    }
    return { context, files };
}
