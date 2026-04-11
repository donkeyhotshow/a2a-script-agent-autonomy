import { describe, it, expect } from 'vitest';
import { routerStatic, LLM_PIPELINE_ACTIONS, ACTION_TO_SCHEMA, buildRouterForm } from '../../src/config/router-static';

describe('router-static-choices.json (T007)', () => {
    it('exposes llm pipeline actions and descriptions on static tail', () => {
        expect(LLM_PIPELINE_ACTIONS.length).toBeGreaterThan(0);
        for (const c of routerStatic.staticTailChoices) {
            expect(c.description?.trim().length).toBeGreaterThan(0);
        }
    });

    it('buildRouterForm merges ranked + static into one choices array', () => {
        const f = buildRouterForm([{ id: 'x', label: 'X', description: 'dx' }]) as {
            choices?: Array<{ id: string; description?: string }>;
        };
        expect(f.choices?.some((c) => c.id === 'x' && c.description === 'dx')).toBe(true);
        expect(f.choices?.length).toBeGreaterThan(1);
    });

    it('ACTION_TO_SCHEMA covers each llmPipelineActions entry', () => {
        for (const a of routerStatic.llmPipelineActions) {
            expect(ACTION_TO_SCHEMA[a]).toBeDefined();
        }
    });
});
