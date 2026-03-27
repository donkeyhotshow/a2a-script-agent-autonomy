import { describe, it, expect } from 'vitest';
import { unwrapEnvelope, unwrapA2aInvokeBody, parseA2aInvokeResponse } from './client-api-envelope.js';

describe('client-api-envelope (T013)', () => {
    it('unwrapEnvelope: data then session', () => {
        expect(unwrapEnvelope({ success: true, data: { id: 1 } })).toEqual({ id: 1 });
        expect(unwrapEnvelope({ success: true, session: { id: 2 } })).toEqual({ id: 2 });
        expect(unwrapEnvelope({ raw: true })).toEqual({ raw: true });
    });

    it('unwrapA2aInvokeBody: success+data vs passthrough', () => {
        expect(unwrapA2aInvokeBody({ success: true, data: { execute: { form: {} } } })).toEqual({
            execute: { form: {} },
        });
        expect(unwrapA2aInvokeBody(null)).toBeNull();
        const bare = { execute: { message: 'x' } };
        expect(unwrapA2aInvokeBody(bare)).toBe(bare);
    });

    it('parseA2aInvokeResponse: promiseId, data, merged execute/context', () => {
        expect(parseA2aInvokeResponse(null).promiseId).toBeNull();
        const wrapped = {
            success: true,
            promiseId: 'p1',
            data: { status: 'pending', execute: { form: {} }, context: { task: 't' } },
        };
        const u = parseA2aInvokeResponse(wrapped);
        expect(u.promiseId).toBe('p1');
        expect(u.data?.execute).toEqual({ form: {} });
        expect(u.execute).toEqual({ form: {} });
        expect((u.context as { task: string }).task).toBe('t');
    });
});
