import {describe, expect, it} from 'vitest';
import {validateContextBlock} from '../../src/protocol/context-parser.js';

/** Malformed `execution` (non-object) should fail validation before parseContextBlock. */
describe('human-review: validateContextBlock', () => {
    it('rejects execution that is not a plain object', () => {
        const v = validateContextBlock({
            session_id: 'srv_sess_test',
            execution: ['not', 'an', 'object'],
        });
        expect(v.valid).toBe(false);
    });
});
