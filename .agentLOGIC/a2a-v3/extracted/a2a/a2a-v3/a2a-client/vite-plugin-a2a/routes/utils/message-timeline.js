import * as stepHandlers from '../handlers/step-handlers.js';

function toText(value) {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    return String(value);
}

function getExecuteMessage(execute) {
    if (!execute || typeof execute !== 'object') return '';
    if (typeof execute.message === 'string') return execute.message;
    if (execute.message && typeof execute.message === 'object') {
        return toText(execute.message.content || execute.message.text || '');
    }
    return '';
}

function sourcePriority(source) {
    switch (source) {
        case 'history':
            return 1;
        case 'execute':
            return 2;
        case 'step-messages':
            return 3;
        case 'client-result':
            return 4;
        default:
            return 10;
    }
}

/**
 * Detect system role based on item metadata.
 * @param {Object} item - Message item with optional metadata
 * @returns {string} - 'system' or 'assistant' (fallback)
 */
function detectSystemRole(item) {
    if (item?.metadata?.source === 'system-prompt') return 'system';
    if (item?.metadata?.type === 'system') return 'system';
    return 'assistant';  // fallback
}

/**
 * Canonical timeline derived from persisted step artifacts.
 * Source precedence per step:
 * history -> execute -> step-messages -> client-result
 */
export function collectCanonicalTimeline(cwd, sessionId) {
    const steps = stepHandlers.listNewSteps(cwd, sessionId);
    const out = [];
    const seen = new Set();

    for (const stepNum of steps) {
        const stepData = stepHandlers.loadNewStep(cwd, sessionId, stepNum);
        const entries = [];

        if (Array.isArray(stepData?.context?.history)) {
            for (const item of stepData.context.history) {
                const content = toText(item?.message || item?.content || '').trim();
                if (!content) continue;
                entries.push({
                    source: 'history',
                    role: item?.role || detectSystemRole(item),
                    content,
                    step: stepNum,
                });
            }
        }

        const executeMessage = getExecuteMessage(stepData?.execute).trim();
        if (executeMessage) {
            entries.push({
                source: 'execute',
                role: 'assistant',
                content: executeMessage,
                step: stepNum,
            });
        }

        if (Array.isArray(stepData?.messages)) {
            for (const msg of stepData.messages) {
                const content = toText(msg?.content).trim();
                if (!content) continue;
                entries.push({
                    source: 'step-messages',
                    role: msg?.role || detectSystemRole(msg),
                    content,
                    step: stepNum,
                });
            }
        }

        const clientResult = stepHandlers.loadStepFile(cwd, sessionId, stepNum, 'client-result.json');
        const clientMessage = toText(clientResult?.result?.message).trim();
        if (clientMessage) {
            entries.push({
                source: 'client-result',
                role: clientResult?.metadata?.source === 'system' ? 'system' : 'user',
                content: clientMessage,
                step: stepNum,
            });
        }

        entries.sort((a, b) => sourcePriority(a.source) - sourcePriority(b.source));
        for (const entry of entries) {
            const slot = `${entry.step}|${entry.role}|${entry.content}`;
            if (seen.has(slot)) continue;
            seen.add(slot);
            out.push(entry);
        }
    }

    return out;
}

export function collectSessionMessagesFlat(cwd, sessionId) {
    const timeline = collectCanonicalTimeline(cwd, sessionId);
    const messages = timeline.map((item, idx) => ({
        role: item.role,
        content: item.content,
        step: item.step,
        source: item.source,
        seq: idx + 1,
    }));
    const lastSeq = messages.length ? messages.length : 0;
    return { messages, lastSeq };
}
