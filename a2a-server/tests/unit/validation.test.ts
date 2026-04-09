/**
 * Validation Utility Tests
 */

import {describe, it, expect} from 'vitest';

// Simple validation functions to test (simulating the validation logic)
const validators = {
    isValidEmail: (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    isValidApiKey: (apiKey: string): boolean => {
        return apiKey.startsWith('sk_a2a_') && apiKey.length >= 20;
    },

    isValidSessionId: (sessionId: string): boolean => {
        return /^[a-zA-Z0-9_-]+$/.test(sessionId) && sessionId.length <= 100;
    },

    isValidPromiseId: (promiseId: string): boolean => {
        return /^prm_[a-zA-Z0-9_-]+$/.test(promiseId);
    },

    isValidProjectId: (projectId: string): boolean => {
        return /^[a-zA-Z0-9_-]+$/.test(projectId) && projectId.length <= 50;
    },

    sanitizeInput: (input: string): string => {
        return input.replace(/[<>]/g, '');
    },

    isValidTaskType: (type: string): boolean => {
        const validTypes = ['analyze', 'refactor', 'test', 'document', 'fix', 'create', 'delete'];
        return validTypes.includes(type);
    },

    isValidTaskStatus: (status: string): boolean => {
        const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'cancelled'];
        return validStatuses.includes(status);
    },
};

describe('Validation Utilities', () => {
    describe('Email Validation', () => {
        it('should validate correct email addresses', () => {
            expect(validators.isValidEmail('test@example.com')).toBe(true);
            expect(validators.isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(validators.isValidEmail('user+tag@example.org')).toBe(true);
        });

        it('should reject invalid email addresses', () => {
            expect(validators.isValidEmail('invalid')).toBe(false);
            expect(validators.isValidEmail('@example.com')).toBe(false);
            expect(validators.isValidEmail('test@')).toBe(false);
            expect(validators.isValidEmail('test@.com')).toBe(false);
        });
    });

    describe('API Key Validation', () => {
        it('should validate correct API keys', () => {
            expect(validators.isValidApiKey('sk_a2a_12345678901234567890')).toBe(true);
            expect(validators.isValidApiKey('sk_a2a_testkey1234567890')).toBe(true);
        });

        it('should reject invalid API keys', () => {
            expect(validators.isValidApiKey('invalid')).toBe(false);
            expect(validators.isValidApiKey('sk_wrong_123')).toBe(false);
            expect(validators.isValidApiKey('sk_a2a_')).toBe(false);
        });
    });

    describe('Session ID Validation', () => {
        it('should validate correct session IDs', () => {
            expect(validators.isValidSessionId('session-123')).toBe(true);
            expect(validators.isValidSessionId('session_123')).toBe(true);
            expect(validators.isValidSessionId('ABC123')).toBe(true);
        });

        it('should reject invalid session IDs', () => {
            expect(validators.isValidSessionId('')).toBe(false);
            expect(validators.isValidSessionId('session with spaces')).toBe(false);
            expect(validators.isValidSessionId('<script>')).toBe(false);
        });
    });

    describe('Promise ID Validation', () => {
        it('should validate correct promise IDs', () => {
            expect(validators.isValidPromiseId('prm_123')).toBe(true);
            expect(validators.isValidPromiseId('prm_abc123')).toBe(true);
        });

        it('should reject invalid promise IDs', () => {
            expect(validators.isValidPromiseId('req_123')).toBe(false);
            expect(validators.isValidPromiseId('invalid')).toBe(false);
            expect(validators.isValidPromiseId('prm_')).toBe(false);
        });
    });

    describe('Project ID Validation', () => {
        it('should validate correct project IDs', () => {
            expect(validators.isValidProjectId('project-123')).toBe(true);
            expect(validators.isValidProjectId('my_project')).toBe(true);
            expect(validators.isValidProjectId('ABC123')).toBe(true);
        });

        it('should reject invalid project IDs', () => {
            expect(validators.isValidProjectId('')).toBe(false);
            expect(validators.isValidProjectId('project with spaces')).toBe(false);
        });
    });

    describe('Input Sanitization', () => {
        it('should sanitize dangerous characters', () => {
            expect(validators.sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
            expect(validators.sanitizeInput('test<value>')).toBe('testvalue');
        });

        it('should preserve safe characters', () => {
            expect(validators.sanitizeInput('hello world')).toBe('hello world');
            expect(validators.sanitizeInput('test@domain.com')).toBe('test@domain.com');
        });
    });

    describe('Task Type Validation', () => {
        it('should validate correct task types', () => {
            expect(validators.isValidTaskType('analyze')).toBe(true);
            expect(validators.isValidTaskType('refactor')).toBe(true);
            expect(validators.isValidTaskType('test')).toBe(true);
            expect(validators.isValidTaskType('fix')).toBe(true);
        });

        it('should reject invalid task types', () => {
            expect(validators.isValidTaskType('invalid')).toBe(false);
            expect(validators.isValidTaskType('')).toBe(false);
        });
    });

    describe('Task Status Validation', () => {
        it('should validate correct task statuses', () => {
            expect(validators.isValidTaskStatus('pending')).toBe(true);
            expect(validators.isValidTaskStatus('in_progress')).toBe(true);
            expect(validators.isValidTaskStatus('completed')).toBe(true);
            expect(validators.isValidTaskStatus('failed')).toBe(true);
        });

        it('should reject invalid task statuses', () => {
            expect(validators.isValidTaskStatus('invalid')).toBe(false);
            expect(validators.isValidTaskStatus('')).toBe(false);
        });
    });
});

describe('Type Guards', () => {
    const isString = (val: unknown): val is string => typeof val === 'string';
    const isObject = (val: unknown): val is object => typeof val === 'object' && val !== null;
    const isArray = (val: unknown): val is unknown[] => Array.isArray(val);

    it('should identify strings', () => {
        expect(isString('hello')).toBe(true);
        expect(isString(123)).toBe(false);
        expect(isString(null)).toBe(false);
    });

    it('should identify objects', () => {
        expect(isObject({})).toBe(true);
        expect(isObject({key: 'value'})).toBe(true);
        expect(isObject('string')).toBe(false);
        expect(isObject(null)).toBe(false);
    });

    it('should identify arrays', () => {
        expect(isArray([])).toBe(true);
        expect(isArray([1, 2, 3])).toBe(true);
        expect(isArray({})).toBe(false);
        expect(isArray('string')).toBe(false);
    });
});
