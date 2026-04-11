import {describe, expect, it} from 'vitest';
import {collectSequenceWorkbenchWarnings} from '../../scripts/sim-validate/validators';

describe('collectSequenceWorkbenchWarnings', () => {
    it('accepts valid steps array', () => {
        const w = collectSequenceWorkbenchWarnings(
            [
                {id: 'a', title: 'T', status: 'pending'},
                {id: 'b', title: 'U', status: 'complete'},
            ],
            'response.json',
        );
        expect(w).toHaveLength(0);
    });

    it('warns on invalid object shape', () => {
        const w = collectSequenceWorkbenchWarnings({foo: 1}, 'response.json');
        expect(w.length).toBeGreaterThan(0);
    });
});
