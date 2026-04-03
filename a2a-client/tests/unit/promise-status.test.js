import { describe, expect, it } from 'vitest';
import {
    isActivePromiseStatus,
    isPromisePollComplete,
    isRemovablePromiseBesideResponse,
} from '../../packages/vite-plugin/storage/promise-status.js';

describe('promise-status', () => {
    it('isActivePromiseStatus', () => {
        expect(isActivePromiseStatus('pending')).toBe(true);
        expect(isActivePromiseStatus('processing')).toBe(true);
        expect(isActivePromiseStatus('completed')).toBe(false);
        expect(isActivePromiseStatus(undefined)).toBe(false);
    });

    it('isPromisePollComplete', () => {
        expect(isPromisePollComplete({ status: 'completed' })).toBe(true);
        expect(isPromisePollComplete({ execute: { message: 'x' } })).toBe(true);
        expect(isPromisePollComplete({ status: 'pending' })).toBe(false);
    });

    it('isRemovablePromiseBesideResponse', () => {
        expect(isRemovablePromiseBesideResponse(null)).toBe(true);
        expect(isRemovablePromiseBesideResponse({ status: 'pending' })).toBe(false);
        expect(isRemovablePromiseBesideResponse({ status: 'processing' })).toBe(false);
        expect(isRemovablePromiseBesideResponse({ status: 'completed' })).toBe(true);
        expect(isRemovablePromiseBesideResponse({ execute: {} })).toBe(true);
    });
});
