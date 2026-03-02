/** Questions handler: collect and resolve questions from context. */

export interface PendingQuestion {
    id: string;
    text: string;
    sessionId: string;
}

export function extractPendingQuestions(context: { questions?: unknown[] }): PendingQuestion[] {
    const q = context.questions;
    if (!Array.isArray(q)) return [];
    return q.filter((x): x is PendingQuestion => {
        if (typeof x !== 'object' || x === null) return false;
        const o = x as Record<string, unknown>;
        return typeof o.id === 'string' && typeof o.text === 'string' && typeof o.sessionId === 'string';
    });
}

export function hasPendingQuestions(context: { questions?: unknown[] }): boolean {
    return extractPendingQuestions(context).length > 0;
}
