/**
 * Static router UI + LLM routing config (shared/router-static-choices.json).
 * Single source for action-request-processor, dialog schema map.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, '../../../shared/router-static-choices.json');

export interface RouterStaticChoice {
    id: string;
    label: string;
    description: string;
}

export interface RouterStaticConfig {
    formTitle: string;
    llmPipelineActions: string[];
    actionToSchema: Record<string, string>;
    staticTailChoices: RouterStaticChoice[];
}

export const routerStatic = JSON.parse(readFileSync(jsonPath, 'utf-8')) as RouterStaticConfig;

export const LLM_PIPELINE_ACTIONS = routerStatic.llmPipelineActions as readonly string[];

/** Union of `llmPipelineActions` entries in shared/router-static-choices.json */
export type LlmPipelineAction = (typeof LLM_PIPELINE_ACTIONS)[number];

/** action → transformSchema (dialog pipeline). */
export const ACTION_TO_SCHEMA: Record<string, string> = routerStatic.actionToSchema;

/** Ranked/registry picks first; remaining modes from static tail (deduped by id). */
function mergeRouterChoices(
    ranked: Array<{ id: string; label: string; description?: string }>
): Array<{ id: string; label: string; description: string }> {
    const tail = routerStatic.staticTailChoices;
    const seen = new Set<string>();
    const out: Array<{ id: string; label: string; description: string }> = [];
    for (const c of ranked) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        const desc =
            typeof c.description === 'string' && c.description.trim()
                ? c.description.trim()
                : c.label;
        out.push({ id: c.id, label: c.label, description: desc });
    }
    for (const c of tail) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        out.push({ id: c.id, label: c.label, description: c.description });
    }
    return out;
}

/**
 * Single `form.choices` list: ranked subset (may be empty) + static modes not already listed.
 */
export function buildRouterForm(
    rankedChoices: Array<{ id: string; label: string; description?: string }>
): Record<string, unknown> {
    return {
        title: routerStatic.formTitle,
        choices: mergeRouterChoices(rankedChoices),
    };
}
