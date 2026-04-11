import {describe, expect, it} from 'vitest';
import {
    createEmptyGraph,
    getGraphStats,
    isGraphComplete,
    mergeGraphs,
    parseGraphFromContext,
} from '../../src/services/core/graph-store.service';

const e1 = {
    id: 'm1',
    type: 'MODEL' as const,
    name: 'User',
    path: '/m.ts',
};
const e2 = {
    id: 'm2',
    type: 'MODEL' as const,
    name: 'Post',
    path: '/p.ts',
};

describe('mergeGraphs', () => {
    it('merges entities by id and deep-merges metadata', () => {
        const a = {
            entities: [
                {...e1, metadata: {tableName: 'users'}},
            ],
            relations: [],
        };
        const b = {
            entities: [{...e1, metadata: {lineStart: 1}}],
            relations: [],
        };
        const g = mergeGraphs(a, b);
        expect(g.entities).toHaveLength(1);
        expect(g.entities[0].metadata).toEqual({
            tableName: 'users',
            lineStart: 1,
        });
    });

    it('merges relations by id', () => {
        const r = {
            id: 'r1',
            type: 'USES' as const,
            fromPath: '/a',
        };
        const g = mergeGraphs(
            {entities: [], relations: [r]},
            {entities: [], relations: [{...r, toPath: '/b'}]}
        );
        expect(g.relations).toHaveLength(1);
        expect(g.relations[0].toPath).toBe('/b');
    });
});

describe('parseGraphFromContext', () => {
    it('returns empty graph for missing or invalid graph', () => {
        expect(parseGraphFromContext({})).toEqual(createEmptyGraph());
        expect(parseGraphFromContext({graph: null})).toEqual(createEmptyGraph());
        expect(parseGraphFromContext({graph: 'x'})).toEqual(createEmptyGraph());
    });

    it('filters entities and relations to well-shaped objects only', () => {
        const g = parseGraphFromContext({
            graph: {
                entities: [e1, {bad: true}, null],
                relations: [
                    {id: 'x', type: 'CALLS', fromPath: '/a'},
                    {id: 'y'},
                ],
            },
        });
        expect(g.entities).toHaveLength(1);
        expect(g.relations).toHaveLength(1);
    });
});

describe('getGraphStats', () => {
    it('counts entity and relation types', () => {
        const s = getGraphStats({
            entities: [e1, e2],
            relations: [
                {id: 'r1', type: 'USES', fromPath: '/a'},
                {id: 'r2', type: 'USES', fromPath: '/b'},
            ],
        });
        expect(s.entityCount).toBe(2);
        expect(s.relationCount).toBe(2);
        expect(s.entityTypes.MODEL).toBe(2);
        expect(s.relationTypes.USES).toBe(2);
    });
});

describe('isGraphComplete', () => {
    it('false when no entities', () => {
        const r = isGraphComplete({entities: [], relations: []});
        expect(r.complete).toBe(false);
        expect(r.missing).toContain('No entities recognized');
    });

    it('requires types when requiredTypes set', () => {
        const r = isGraphComplete(
            {entities: [e1], relations: []},
            {requiredTypes: ['CONTROLLER']}
        );
        expect(r.complete).toBe(false);
        expect(r.missing.some((m) => m.includes('CONTROLLER'))).toBe(true);
    });

    it('CRUD task requires controller and model', () => {
        const r = isGraphComplete(
            {entities: [e1], relations: []},
            {taskText: 'add CRUD'}
        );
        expect(r.complete).toBe(false);
    });
});
