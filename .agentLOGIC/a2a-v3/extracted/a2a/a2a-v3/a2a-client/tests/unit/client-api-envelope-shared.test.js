import { describe, it, expect } from 'vitest';
import {
    validateClientResultPayload,
    normalizePromisePollStatus,
} from '../../../shared/client-api-envelope.mjs';

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
        });

        expect(normalizePromisePollStatus({ status: 'completed' })).toEqual({
            status: 'completed',
            completed: true,
            failed: false,
            asyncPending: false,
        });
    });
});
