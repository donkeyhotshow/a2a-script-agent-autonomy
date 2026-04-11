import {describe, expect, it, vi} from 'vitest';
import type {Graph} from '../../src/services/core/graph-store.service';
import {FrontendAssembler} from '../../src/services/core/frontend-assembler';

vi.mock('../../src/utils/logger', () => ({
    logger: {info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn()},
}));

function graphChain(): Graph {
    return {
        entities: [
            {id: 'a', type: 'VUE_COMPONENT', name: 'A', path: '/a.vue'},
            {id: 'b', type: 'VUE_COMPONENT', name: 'B', path: '/b.vue'},
        ],
        relations: [
            {
                id: 'r1',
                type: 'IMPORTS',
                fromPath: '/a.vue',
                fromId: 'a',
                toId: 'b',
            },
        ],
    };
}

describe('FrontendAssembler', () => {
    it('plan returns order covering all entity ids and fixed recommendations', () => {
        const asm = new FrontendAssembler();
        const g = graphChain();
        const plan = asm.plan(g);
        expect(plan.order.sort()).toEqual(['a', 'b'].sort());
        expect(plan.recommendations.length).toBeGreaterThan(0);
    });

    it('handles empty graph', () => {
        const asm = new FrontendAssembler();
        const plan = asm.plan({entities: [], relations: []});
        expect(plan.order).toEqual([]);
    });
});
