export const AUTO_AI_CATEGORIES = {
    context: [
        'context-scan',
        'context-query',
        'context-format',
        'context-summarize',
        'context-prune',
    ],
    analysis: [
        'analyze-full',
        'analyze-quick',
    ],
    graph: [
        'graph-build',
        'graph-query',
    ],
    generation: [
        'generate-crud',
        'generate-tests',
    ],
    hybrid: [
        'hybrid-fix',
        'hybrid-refactor',
    ],
    fix: [
        'fix-vue-imports',
        'fix-vue-imports-alternatives',
    ],
    fallback: [
        'ai-fallback',
    ],
} as const;

export type AutoAiCategory = keyof typeof AUTO_AI_CATEGORIES;

export const AUTO_AI_ACTION_IDS: string[] = (Object.values(AUTO_AI_CATEGORIES) as readonly string[][]).flat();

const autoAiActionIdSet = new Set(AUTO_AI_ACTION_IDS);

export function getActionIdsByCategory(category: AutoAiCategory): string[] {
    return [...AUTO_AI_CATEGORIES[category]];
}

export function getCategories(): AutoAiCategory[] {
    return Object.keys(AUTO_AI_CATEGORIES) as AutoAiCategory[];
}

export function isAutoAiAction(actionId: string): boolean {
    return autoAiActionIdSet.has(actionId);
}

export function getCategoryForAction(actionId: string): AutoAiCategory | null {
    for (const category of getCategories()) {
        if (AUTO_AI_CATEGORIES[category].includes(actionId)) {
            return category;
        }
    }
    return null;
}

