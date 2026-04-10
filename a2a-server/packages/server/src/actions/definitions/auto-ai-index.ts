/**
 * Canonical list of Auto-AI action IDs (markdown under definitions/auto-ai plus fix-vue-imports).
 * Used by tests and tooling; keep in sync with files on disk.
 */

export const AUTO_AI_CATEGORIES = {
    context: ['context-scan', 'context-query', 'context-format', 'context-prune', 'context-summarize'],
    analysis: ['analyze-quick', 'analyze-full'],
    graph: ['graph-query', 'graph-build'],
    generation: ['generate-tests', 'generate-crud'],
    hybrid: ['hybrid-fix', 'hybrid-refactor'],
    fix: ['fix-vue-imports', 'fix-vue-imports-alternatives'],
    fallback: ['ai-fallback'],
} as const;

export type AutoAiCategory = keyof typeof AUTO_AI_CATEGORIES;

const FLAT: string[] = (
    Object.values(AUTO_AI_CATEGORIES) as readonly (readonly string[])[]
).flat();

export const AUTO_AI_ACTION_IDS = FLAT as readonly string[];

const ID_SET = new Set<string>(AUTO_AI_ACTION_IDS);

export function getCategories(): AutoAiCategory[] {
    return Object.keys(AUTO_AI_CATEGORIES) as AutoAiCategory[];
}

export function getActionIdsByCategory(cat: AutoAiCategory): readonly string[] {
    return AUTO_AI_CATEGORIES[cat];
}

export function isAutoAiAction(id: string): boolean {
    return ID_SET.has(id);
}

export function getCategoryForAction(id: string): AutoAiCategory | null {
    for (const entry of Object.entries(AUTO_AI_CATEGORIES) as [AutoAiCategory, readonly string[]][]) {
        if (entry[1].includes(id)) return entry[0];
    }
    return null;
}
