/**
 * Tests for rag-improvements (plan 4.5 capability)
 */

const {
    RAG_IMPROVEMENTS_VERSION,
    SUPPORTED_CHUNK_TYPES,
    getImprovementsCapability,
} = require('../src/rag-improvements');

describe('rag-improvements', () => {
    test('exports version 4.5', () => {
        expect(RAG_IMPROVEMENTS_VERSION).toBe('4.5');
    });

    test('SUPPORTED_CHUNK_TYPES includes vue and interface', () => {
        expect(SUPPORTED_CHUNK_TYPES).toContain('vue-sfc');
        expect(SUPPORTED_CHUNK_TYPES).toContain('interface');
        expect(SUPPORTED_CHUNK_TYPES).toContain('laravel-routes');
    });

    test('getImprovementsCapability returns version and chunkTypes', () => {
        const cap = getImprovementsCapability();
        expect(cap.version).toBe('4.5');
        expect(Array.isArray(cap.chunkTypes)).toBe(true);
        expect(cap.chunkTypes).toEqual(SUPPORTED_CHUNK_TYPES);
    });
});
