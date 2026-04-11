import {describe, it, expect} from 'vitest';
import {validateExecutePayloadDetailed, validateInvokeEnvelopeResponse} from '../../src/actions/action-validator';

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

    it('accepts dialog execute key', () => {
        const r = validateExecutePayloadDetailed({
            dialog: {message: 'x'},
        });
        expect(r.success).toBe(true);
    });

    it('accepts file-exists execute key', () => {
        const r = validateExecutePayloadDetailed({
            'file-exists': {path: 'p'},
        });
        expect(r.success).toBe(true);
    });
});

describe('validateInvokeEnvelopeResponse', () => {
    it('accepts pending without execute/result', () => {
        const r = validateInvokeEnvelopeResponse({
            success: true,
            data: { status: 'pending', promiseId: 'p1' },
        });
        expect(r.success).toBe(true);
    });

    it('rejects missing data', () => {
        const r = validateInvokeEnvelopeResponse({ success: true });
        expect(r.success).toBe(false);
        expect(r.errors).toContain('Missing data field');
    });
});
