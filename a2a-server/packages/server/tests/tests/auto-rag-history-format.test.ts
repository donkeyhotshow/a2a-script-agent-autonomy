import {describe, expect, it} from 'vitest';
import {formatRagHitsForHistory} from '../src/services/rag/auto-rag-page-server';

describe('formatRagHitsForHistory', () => {
    it('formats paths and scores', () => {
        const s = formatRagHitsForHistory(
            [
                {path: 'a.ts', score: 0.91},
                {file: 'b.ts', score: 0.5},
            ],
            'foo query',
            10
        );
        expect(s).toContain('RAG (foo query):');
        expect(s).toContain('1. a.ts score=0.910');
        expect(s).toContain('2. b.ts score=0.500');
    });

    it('handles empty hits', () => {
        expect(formatRagHitsForHistory([], 'q')).toMatch(/no hits/);
    });
});
