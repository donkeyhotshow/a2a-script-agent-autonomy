/**
 * Auto-AI action definitions index tests
 */

import {describe, it, expect} from 'vitest';
import {
    AUTO_AI_CATEGORIES,
    AUTO_AI_ACTION_IDS,
    getActionIdsByCategory,
    getCategories,
    isAutoAiAction,
    getCategoryForAction,
} from '../../../packages/actions/src/definitions/auto-ai-index';

describe('auto-ai-index', () => {
    it('exports categories with expected action IDs', () => {
        expect(AUTO_AI_CATEGORIES.context).toContain('context-scan');
        expect(AUTO_AI_CATEGORIES.context).toContain('context-query');
        expect(AUTO_AI_CATEGORIES.analysis).toContain('analyze-full');
        expect(AUTO_AI_CATEGORIES.hybrid).toContain('hybrid-fix');
        expect(AUTO_AI_CATEGORIES.fix).toContain('fix-vue-imports');
        expect(AUTO_AI_CATEGORIES.fix).toContain('fix-vue-imports-alternatives');
        expect(AUTO_AI_CATEGORIES.fallback).toContain('ai-fallback');
    });

    it('getActionIdsByCategory returns ids for category', () => {
        const contextIds = getActionIdsByCategory('context');
        expect(contextIds).toHaveLength(5);
        expect(contextIds).toContain('context-format');
    });

    it('getCategories returns all category keys', () => {
        const cats = getCategories();
        expect(cats).toContain('context');
        expect(cats).toContain('analysis');
        expect(cats).toContain('graph');
        expect(cats).toContain('generation');
        expect(cats).toContain('hybrid');
        expect(cats).toContain('fix');
        expect(cats).toContain('fallback');
        expect(cats).toHaveLength(7);
    });

    it('isAutoAiAction returns true for indexed ids', () => {
        expect(isAutoAiAction('context-query')).toBe(true);
        expect(isAutoAiAction('analyze-full')).toBe(true);
        expect(isAutoAiAction('fix-vue-imports')).toBe(true);
        expect(isAutoAiAction('unknown-action-id')).toBe(false);
    });

    it('getCategoryForAction returns category or null', () => {
        expect(getCategoryForAction('context-scan')).toBe('context');
        expect(getCategoryForAction('generate-crud')).toBe('generation');
        expect(getCategoryForAction('fix-vue-imports')).toBe('fix');
        expect(getCategoryForAction('unknown-action')).toBe(null);
    });

    it('AUTO_AI_ACTION_IDS is flat and includes all', () => {
        expect(Array.isArray(AUTO_AI_ACTION_IDS)).toBe(true);
        expect(AUTO_AI_ACTION_IDS).toContain('hybrid-refactor');
        const fromCategories = (Object.values(AUTO_AI_CATEGORIES) as string[][]).flat();
        expect(AUTO_AI_ACTION_IDS).toHaveLength(fromCategories.length);
    });
});
