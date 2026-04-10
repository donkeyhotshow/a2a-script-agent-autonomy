import { describe, expect, it } from 'vitest';
import { buildSessionGetQuery } from './session-manager.js';

describe('buildSessionGetQuery', () => {
    it('returns empty string when no flags', () => {
        expect(buildSessionGetQuery()).toBe('');
        expect(buildSessionGetQuery({})).toBe('');
    });

    it('adds unwrap and includeContext', () => {
        expect(buildSessionGetQuery({ unwrap: true })).toBe('?unwrap=1');
        expect(buildSessionGetQuery({ includeContext: true })).toBe('?includeContext=1');
        const q = buildSessionGetQuery({ unwrap: true, includeContext: true });
        expect(q.startsWith('?')).toBe(true);
        expect(q).toContain('unwrap=1');
        expect(q).toContain('includeContext=1');
    });
});
