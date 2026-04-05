/**
 * SearchSuggestionsEngine — deterministic symbol / prefix behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SearchSuggestionsEngine } from './suggestions.js';
import type { Chunk } from './chunk-manager.js';

describe('SearchSuggestionsEngine', () => {
    let engine: SearchSuggestionsEngine;

    beforeEach(() => {
        engine = new SearchSuggestionsEngine({ maxSuggestions: 5 });
        const chunks: Chunk[] = [
            {
                id: '1',
                filePath: 'src/UserService.ts',
                type: 'class',
                name: 'UserService',
                content: 'class UserService {}',
                startLine: 1,
                endLine: 3,
            },
            {
                id: '2',
                filePath: 'src/auth.ts',
                type: 'function',
                name: 'authenticateUser',
                content: 'function authenticateUser() {}',
                startLine: 10,
                endLine: 12,
            },
        ];
        engine.indexSymbols(chunks);
    });

    it('returns prefix-ranked suggestions for query', () => {
        const list = engine.getSuggestions('user', { limit: 10 });
        const texts = list.map((s) => s.text);
        expect(texts).toContain('UserService');
        expect(list.every((s) => s.filePath && s.type)).toBe(true);
    });

    it('clear removes indexed symbols', () => {
        expect(engine.getSuggestions('user', { limit: 5 }).length).toBeGreaterThan(0);
        engine.clear();
        expect(engine.getSuggestions('user', { limit: 5 }).length).toBe(0);
    });

    it('getByType filters suggestion type', () => {
        const fnOnly = engine.getByType('function', 10);
        expect(fnOnly.every((s) => s.type === 'function')).toBe(true);
        expect(fnOnly.some((s) => s.text === 'authenticateUser')).toBe(true);
    });
});
