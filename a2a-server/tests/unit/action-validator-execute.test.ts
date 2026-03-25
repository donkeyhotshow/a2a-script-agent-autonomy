import {describe, it, expect} from 'vitest';
import {validateExecutePayloadDetailed} from '../../src/actions/action-validator.js';

describe('validateExecutePayloadDetailed', () => {
    it('accepts rag-search execute', () => {
        const r = validateExecutePayloadDetailed({
            'rag-search': {query: 'x'},
        });
        expect(r.success).toBe(true);
    });

    it('accepts message as object with content', () => {
        const r = validateExecutePayloadDetailed({
            message: {content: 'hello', role: 'assistant'},
        });
        expect(r.success).toBe(true);
    });
});
