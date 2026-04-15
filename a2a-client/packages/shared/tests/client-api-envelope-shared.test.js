import { describe, it, expect } from 'vitest';
import {
    unwrapEnvelope,
    unwrapA2aInvokeBody,
    parseA2aInvokeResponse,
    validateClientResultPayload,
    normalizePromisePollStatus,
} from '../client-api-envelope.mjs';

describe('shared client-api-envelope helpers', () => {
    it('validates next payload shape', () => {
        expect(validateClientResultPayload(null)).toBe('result is required');
        expect(validateClientResultPayload({})).toBe('result.message or result.choice is required');
        expect(validateClientResultPayload({ message: 'hello' })).toBeNull();
        expect(validateClientResultPayload({ choice: 'route_1' })).toBeNull();
    });

    it('normalizes async promise status fields', () => {
        expect(normalizePromisePollStatus({ status: 'pending' })).toEqual({
            status: 'pending',
            completed: false,
            failed: false,
            asyncPending: true,
            requestPhase: null,
            retryAfter: null,
        });

        expect(normalizePromisePollStatus({ status: 'completed' })).toEqual({
            status: 'completed',
            completed: true,
            failed: false,
            asyncPending: false,
            requestPhase: null,
            retryAfter: null,
        });

        expect(
            normalizePromisePollStatus({
                status: 'processing',
                requestPhase: 'llm_waiting',
                retryAfter: '2099-01-01T00:00:00.000Z',
            })
        ).toMatchObject({
            status: 'processing',
            requestPhase: 'llm_waiting',
            retryAfter: '2099-01-01T00:00:00.000Z',
        });

        expect(
            normalizePromisePollStatus({
                status: 'failed',
                requestPhase: 'llm_error',
                retryAfter: '2099-01-01T00:00:00.000Z',
            })
        ).toEqual({
            status: 'failed',
            completed: false,
            failed: false,
            asyncPending: true,
            requestPhase: 'llm_error',
            retryAfter: '2099-01-01T00:00:00.000Z',
        });

        expect(
            normalizePromisePollStatus({
                status: 'completed',
                requestPhase: 'llm_error',
                execute: { form: { title: 'x' } },
            })
        ).toMatchObject({
            status: 'completed',
            requestPhase: null,
            completed: true,
        });
    });

    it('unwrapEnvelope: data then session; null data + session fallback', () => {
        expect(unwrapEnvelope({ success: true, data: { id: 1 } })).toEqual({ id: 1 });
        expect(unwrapEnvelope({ success: true, session: { id: 2 } })).toEqual({ id: 2 });
        expect(unwrapEnvelope({ raw: true })).toEqual({ raw: true });
        expect(
            unwrapEnvelope({
                success: true,
                data: null,
                session: { id: 'sess_fallback' },
            })
        ).toEqual({ id: 'sess_fallback' });
        expect(unwrapEnvelope({ success: true, data: null })).toBeNull();
    });

    it('unwrapA2aInvokeBody: success+data vs passthrough', () => {
        expect(unwrapA2aInvokeBody({ success: true, data: { execute: { form: {} } } })).toEqual({
            execute: { form: {} },
        });
        expect(unwrapA2aInvokeBody(null)).toBeNull();
        const bare = { execute: { message: 'x' } };
        expect(unwrapA2aInvokeBody(bare)).toBe(bare);
    });

    it('parseA2aInvokeResponse: promiseId prefers data over top-level', () => {
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
        expect(u.context?.task).toBe('t');

        const dual = {
            promiseId: 'transport',
            data: { promiseId: 'canonical_server', execute: { form: {} } },
        };
        expect(parseA2aInvokeResponse(dual).promiseId).toBe('canonical_server');
    });
});
