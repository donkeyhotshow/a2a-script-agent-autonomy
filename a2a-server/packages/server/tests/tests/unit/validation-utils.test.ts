/**
 * Validation Utils Tests
 * Tests for src/utils/validation.ts functions
 */

import {describe, it, expect} from 'vitest';
import {
    isValidJson,
    sanitizeString,
    isValidFileExtension,
    isValidMimeType,
    validateInput,
    uuidSchema,
    emailSchema,
    passwordSchema,
    gitUrlSchema,
    branchNameSchema,
    filePathSchema,
    paginationSchema,
} from '../../src/utils/validation';

describe('validation utils', () => {
    describe('isValidJson', () => {
        it('should return true for valid JSON strings', () => {
            expect(isValidJson('{"key": "value"}')).toBe(true);
            expect(isValidJson('{"num": 123}')).toBe(true);
            expect(isValidJson('["item1", "item2"]')).toBe(true);
            expect(isValidJson('null')).toBe(true);
            expect(isValidJson('"string"')).toBe(true);
            expect(isValidJson('123')).toBe(true);
        });

        it('should return false for invalid JSON strings', () => {
            expect(isValidJson('{key: value}')).toBe(false);
            expect(isValidJson('{key: "value"}')).toBe(false);
            expect(isValidJson('undefined')).toBe(false);
            expect(isValidJson('')).toBe(false);
        });
    });

    describe('sanitizeString', () => {
        it('should remove HTML tags', () => {
            expect(sanitizeString('<p>Hello</p>')).toBe('Hello');
            expect(sanitizeString('<script>alert(1)</script>')).toBe('alert(1)');
        });

        it('should trim whitespace', () => {
            expect(sanitizeString('  hello  ')).toBe('hello');
        });

        it('should preserve safe strings', () => {
            expect(sanitizeString('Hello World')).toBe('Hello World');
            expect(sanitizeString('test@domain.com')).toBe('test@domain.com');
        });
    });

    describe('isValidFileExtension', () => {
        it('should validate correct extensions', () => {
            expect(isValidFileExtension('file.ts', ['ts', 'js'])).toBe(true);
            expect(isValidFileExtension('file.JS', ['ts', 'js'])).toBe(true);
            expect(isValidFileExtension('path/to/file.vue', ['vue', 'ts'])).toBe(true);
        });

        it('should reject invalid extensions', () => {
            expect(isValidFileExtension('file.txt', ['ts', 'js'])).toBe(false);
            expect(isValidFileExtension('file', ['ts'])).toBe(false);
        });
    });

    describe('isValidMimeType', () => {
        it('should validate correct MIME types', () => {
            expect(isValidMimeType('text/plain', ['text/plain', 'application/json'])).toBe(true);
            expect(isValidMimeType('TEXT/PLAIN', ['text/plain'])).toBe(true);
            expect(isValidMimeType('application/json', ['application/json'])).toBe(true);
        });

        it('should reject invalid MIME types', () => {
            expect(isValidMimeType('text/html', ['text/plain'])).toBe(false);
            expect(isValidMimeType('', ['text/plain'])).toBe(false);
        });
    });

    describe('Zod schemas', () => {
        it('uuidSchema should validate UUIDs', () => {
            expect(() => uuidSchema.parse('123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
            expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
        });

        it('emailSchema should validate emails', () => {
            expect(() => emailSchema.parse('test@example.com')).not.toThrow();
            expect(() => emailSchema.parse('invalid')).toThrow();
        });

        it('passwordSchema should validate passwords', () => {
            expect(() => passwordSchema.parse('Password1')).not.toThrow();
            expect(() => passwordSchema.parse('weak')).toThrow();
        });

        it('gitUrlSchema should validate Git URLs', () => {
            expect(() => gitUrlSchema.parse('https://github.com/user/repo.git')).not.toThrow();
            expect(() => gitUrlSchema.parse('http://github.com/user/repo.git')).not.toThrow();
            expect(() => gitUrlSchema.parse('not-a-url')).toThrow();
        });

        it('branchNameSchema should validate branch names', () => {
            expect(() => branchNameSchema.parse('main')).not.toThrow();
            expect(() => branchNameSchema.parse('feature/my-branch')).not.toThrow();
            expect(() => branchNameSchema.parse('feature branch')).toThrow();
        });

        it('filePathSchema should validate file paths', () => {
            expect(() => filePathSchema.parse('src/index.ts')).not.toThrow();
            expect(() => filePathSchema.parse('path/to/file')).not.toThrow();
            expect(() => filePathSchema.parse('path with spaces')).toThrow();
        });

        it('paginationSchema should parse pagination params', () => {
            const result = paginationSchema.parse({page: '2', limit: '10'});
            expect(result.page).toBe(2);
            expect(result.limit).toBe(10);
        });

        it('paginationSchema should use defaults', () => {
            const result = paginationSchema.parse({});
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20);
        });
    });

    describe('validateInput', () => {
        it('should validate and return data', () => {
            const data = 'test@example.com';
            const result = validateInput(emailSchema, data);
            expect(result).toBe('test@example.com');
        });

        it('should throw on invalid data', () => {
            expect(() => validateInput(emailSchema, 'invalid')).toThrow();
        });
    });
});
