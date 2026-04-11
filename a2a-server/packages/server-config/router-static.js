/**
 * Static router UI + LLM routing config (shared/router-static-choices.json).
 * Single source for action-request-processor, dialog schema map.
 */
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, '../../../shared/router-static-choices.json');
export const routerStatic = JSON.parse(readFileSync(jsonPath, 'utf-8'));
export const LLM_PIPELINE_ACTIONS = routerStatic.llmPipelineActions;
/** action → transformSchema (dialog pipeline). */
export const ACTION_TO_SCHEMA = routerStatic.actionToSchema;
/** Router configuration for auto-selection behavior */
export const ROUTER_CONFIG = routerStatic.routerConfig;
/** Ranked/registry picks first; remaining modes from static tail (deduped by id). */
function mergeRouterChoices(ranked) {
    const tail = routerStatic.staticTailChoices;
    const seen = new Set();
    const out = [];
    for (const c of ranked) {
        if (seen.has(c.id))
            continue;
        seen.add(c.id);
        const desc = typeof c.description === 'string' && c.description.trim()
            ? c.description.trim()
            : c.label;
        out.push({ id: c.id, label: c.label, description: desc });
    }
    for (const c of tail) {
        if (seen.has(c.id))
            continue;
        seen.add(c.id);
        out.push({ id: c.id, label: c.label, description: c.description });
    }
    return out;
}
/**
 * Single `form.choices` list: ranked subset (may be empty) + static modes not already listed.
 */
export function buildRouterForm(rankedChoices) {
    return {
        title: routerStatic.formTitle,
        choices: mergeRouterChoices(rankedChoices),
    };
}
