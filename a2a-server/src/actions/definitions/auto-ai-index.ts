/**
 * Auto-AI action definitions index per plans/actions-definitions-for-auto-ai.md.
 * Maps use-case categories to action IDs for discovery and fallback.
 */

export const AUTO_AI_CATEGORIES = {
    context: [
        'context-scan',
        'context-index',
        'context-query',
        'context-rank',
        'context-format',
    ],
    analysis: [
        'analyze-full',
        'analyze-performance',
        'analyze-security',
        'analyze',
        'analyze-test',
        'analyze-typescript',
        'analyze-laravel',
        'analyze-vue',
    ],
    graph: ['graph-build', 'graph-query', 'graph-impact', 'graph-extract-entities', 'graph-extract-relations', 'graph-visualize'],
    generation: ['generate-crud', 'generate-model', 'generate-controller', 'generate-method', 'generate-migration', 'generate-view', 'generate-test'],
    hybrid: ['hybrid-fix', 'hybrid-refactor', 'hybrid-improve', 'hybrid-explain'],
    fix: [
        'fix-vue-imports',
        'fix-vue-imports-alternatives',
        'fix-vue-imports-batch',
        'fix-vue-imports-improvements',
    ],
    fallback: ['ai-fallback', 'ai-analyze', 'ai-generate'],
    conversation: ['dialog', 'ai-session-context'],
} as const;

export type AutoAiCategory = keyof typeof AUTO_AI_CATEGORIES;

/** All action IDs in the Auto-AI index (flat). */
export const AUTO_AI_ACTION_IDS: string[] = getCategories().flatMap((c) => [
    ...AUTO_AI_CATEGORIES[c],
]);

/**
 * Get action IDs for a category.
 */
export function getActionIdsByCategory(category: AutoAiCategory): readonly string[] {
    return AUTO_AI_CATEGORIES[category];
}

/**
 * Get all category names.
 */
export function getCategories(): AutoAiCategory[] {
    return Object.keys(AUTO_AI_CATEGORIES) as AutoAiCategory[];
}

/**
 * Check if an action ID is in the Auto-AI index.
 */
export function isAutoAiAction(actionId: string): boolean {
    return AUTO_AI_ACTION_IDS.includes(actionId);
}

/**
 * Get category for an action ID, or null if not in index.
 */
export function getCategoryForAction(actionId: string): AutoAiCategory | null {
    for (const cat of getCategories()) {
        if ((AUTO_AI_CATEGORIES[cat] as readonly string[]).includes(actionId)) {
            return cat;
        }
    }
    return null;
}
