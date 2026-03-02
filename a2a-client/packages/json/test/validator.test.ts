/**
 * @a2a/json - Validator Unit Tests
 */

import {describe, it, expect} from 'vitest';
import {validateResponse, getResponseType, isUnifiedResponse, validateResponseType} from '../dist/validator.js';

describe('validateResponse', () => {
    it('should validate a valid action_proposal response', () => {
        const data = {
            success: true,
            timestamp: '2026-02-25T10:00:00Z',
            type: 'action_proposal',
            result: {
                context: {
                    version: '1.0' as const,
                    session_id: 'test-session-123'
                },
                proposedActions: [
                    {
                        id: 'action-1',
                        name: 'Fix imports',
                        description: 'Update import statements'
                    }
                ]
            }
        };

        const result = validateResponse(data);

        expect(result.valid).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.type).toBe('action_proposal');
    });

    it('should reject invalid response with missing required fields', () => {
        const data = {
            success: true
        };

        const result = validateResponse(data);

        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should reject response with invalid type', () => {
        const data = {
            success: true,
            timestamp: '2026-02-25T10:00:00Z',
            type: 'invalid_type',
            result: {}
        };

        const result = validateResponse(data);

        expect(result.valid).toBe(false);
    });
});

describe('getResponseType', () => {
    it('should return response type for valid response', () => {
        const data = {
            success: true,
            timestamp: '2026-02-25T10:00:00Z',
            type: 'action_proposal',
            result: {
                context: {version: '1.0' as const, session_id: 'test'},
                proposedActions: []
            }
        };

        const type = getResponseType(data);

        expect(type).toBe('action_proposal');
    });

    it('should return undefined for invalid response', () => {
        const type = getResponseType({invalid: true});

        expect(type).toBeUndefined();
    });
});

describe('isUnifiedResponse', () => {
    it('should return true for valid unified response', () => {
        const data = {
            success: true,
            timestamp: '2026-02-25T10:00:00Z',
            type: 'action_completed',
            result: {
                actionId: 'test-action',
                summary: 'Completed successfully'
            }
        };

        expect(isUnifiedResponse(data)).toBe(true);
    });

    it('should return false for invalid data', () => {
        expect(isUnifiedResponse(null)).toBe(false);
        expect(isUnifiedResponse(undefined)).toBe(false);
        expect(isUnifiedResponse('string')).toBe(false);
        expect(isUnifiedResponse(123)).toBe(false);
    });
});

describe('validateResponseType', () => {
    it('should validate specific response type', () => {
        const data = {
            success: true,
            timestamp: '2026-02-25T10:00:00Z',
            type: 'action_proposal',
            result: {
                context: {version: '1.0' as const, session_id: 'test'},
                proposedActions: []
            }
        };

        const result = validateResponseType(data, 'action_proposal');

        expect(result.valid).toBe(true);
    });

    it('should reject wrong response type', () => {
        const data = {
            success: true,
            timestamp: '2026-02-25T10:00:00Z',
            type: 'action_proposal',
            result: {
                context: {version: '1.0' as const, session_id: 'test'},
                proposedActions: []
            }
        };

        const result = validateResponseType(data, 'action_completed');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Expected response type 'action_completed', got 'action_proposal'");
    });
});
