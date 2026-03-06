/**
 * Legacy to Canonical Converter Unit Tests
 */

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
    convertLegacyRequestToCanonical,
    convertLegacyResponseToCanonical,
    convertToCanonicalFormat,
    needsConversion
} from '../../src/protocol/converters/legacy-to-canonical.converter.js';
import {isLegacyFormat} from '../../src/protocol/versioning/backwards-compat.js';

describe('Legacy to Canonical Converter', () => {
    describe('convertLegacyExecute', () => {
        it('should convert legacy execute with generic action to action-key shape', () => {
            const legacyExecute = {
                action: 'read-file',
                data: {path: '/path/to/file.ts'}
            };

            const result = convertLegacyRequestToCanonical({
                execute: legacyExecute
            });

            expect(result).toBeDefined();
            expect((result as any).execute).toBeDefined();
        });
    });

    describe('convertLegacyResult', () => {
        it('should convert legacy result with flat content to action-key shape', () => {
            const legacyResult = {
                content: 'File content here',
                action: 'read-file',
                data: {path: '/test.ts'}
            };

            const result = convertLegacyRequestToCanonical({
                result: legacyResult
            });

            expect(result).toBeDefined();
            expect((result as any).result).toBeDefined();
        });

        it('should preserve already canonical format', () => {
            const canonicalResult = {
                'read-file': {path: '/test.ts', content: 'test'}
            };

            const result = convertLegacyRequestToCanonical({
                result: canonicalResult
            });

            expect(result).toBeDefined();
        });
    });

    describe('convertLegacyContext', () => {
        it('should convert legacy context to canonical format', () => {
            const legacyContext = {
                actions: [{name: 'action1'}],
                executingAction: 'current-action',
                dslScript: 'some script',
                history: [],
                execution: {
                    step: 'plan',
                    action: 'test',
                    progress: 50
                }
            };

            const result = convertLegacyRequestToCanonical({
                context: legacyContext
            });

            expect(result).toBeDefined();
            expect((result as any).context).toBeDefined();
            expect((result as any).context.execution).toBeDefined();
        });

        // Note: proposedActions and subActions removed - use canonical format

        it('should handle minimal context', () => {
            const minimalContext = {
                history: [],
                execution: {step: 'start'}
            };

            const result = convertLegacyRequestToCanonical({
                context: minimalContext
            });

            expect(result).toBeDefined();
            expect((result as any).context).toBeDefined();
        });
    });

    describe('convertLegacyRequestToCanonical', () => {
        it('should convert complete legacy request', () => {
            const legacyRequest = {
                context: {
                    actions: [],
                    history: [],
                    execution: {step: 'start'}
                },
                result: {
                    content: 'Previous result',
                    action: 'test'
                },
                execute: {
                    action: 'message',
                    data: {content: 'Hello'}
                }
            };

            const result = convertLegacyRequestToCanonical(legacyRequest);

            expect(result).toBeDefined();
            expect((result as any).context).toBeDefined();
            expect((result as any).execute).toBeDefined();
        });

        it('should handle empty request', () => {
            const result = convertLegacyRequestToCanonical({});
            expect(result).toBeDefined();
        });

        it('should handle null/undefined', () => {
            expect(convertLegacyRequestToCanonical(null)).toBe(null);
            expect(convertLegacyRequestToCanonical(undefined)).toBe(undefined);
        });

        it('should handle non-object input', () => {
            expect(convertLegacyRequestToCanonical('string')).toBe('string');
            expect(convertLegacyRequestToCanonical(123)).toBe(123);
        });
    });

    describe('convertLegacyResponseToCanonical', () => {
        it('should convert legacy response format', () => {
            const legacyResponse = {
                context: {
                    history: [{role: 'user', message: 'test'}],
                    execution: {step: 'plan'}
                },
                result: {
                    content: 'Response content'
                },
                execute: {
                    action: 'form',
                    data: {choices: [{id: 'yes', label: 'Yes'}]}
                }
            };

            const result = convertLegacyResponseToCanonical(legacyResponse);

            expect(result).toBeDefined();
            expect((result as any).execute).toBeDefined();
        });
    });

    describe('isLegacyFormat', () => {
        it('should detect legacy format by actions array', () => {
            const legacyData = {
                actions: [{name: 'test'}]
            };
            expect(isLegacyFormat(legacyData)).toBe(true);
        });

        // Note: proposedActions detection removed - use canonical format

        it('should detect legacy format by executingAction', () => {
            const legacyData = {
                executingAction: 'test-action'
            };
            expect(isLegacyFormat(legacyData)).toBe(true);
        });

        it('should detect legacy format by flat content in result (top-level)', () => {
            // isLegacyFormat checks at top level only
            const legacyData = {
                content: 'test content'
            };
            expect(isLegacyFormat(legacyData)).toBe(true);
        });

        it('should return false for canonical format', () => {
            const canonicalData = {
                context: {
                    execution: {step: 'plan'},
                    history: []
                },
                execute: {
                    'read-file': {path: '/test.ts'}
                }
            };
            expect(isLegacyFormat(canonicalData)).toBe(false);
        });
    });

    describe('detectAndConvertFormat', () => {
        it('should convert legacy request when detected', () => {
            const legacyRequest = {
                actions: [],
                context: {history: []},
                result: {content: 'test'}
            };

            const result = convertToCanonicalFormat(legacyRequest);
            expect(result).toBeDefined();
        });

        it('should return original data when canonical format detected', () => {
            const canonicalData = {
                context: {execution: {step: 'plan'}, history: []},
                execute: {'message': {content: 'test'}}
            };

            const result = convertToCanonicalFormat(canonicalData);
            expect(result).toBe(canonicalData);
        });
    });

    describe('needsConversion', () => {
        it('should return true for legacy format', () => {
            const legacyData = {
                actions: []
            };
            expect(needsConversion(legacyData)).toBe(true);
        });

        it('should return false for canonical format', () => {
            const canonicalData = {
                context: {execution: {step: 'plan'}, history: []}
            };
            expect(needsConversion(canonicalData)).toBe(false);
        });
    });
});
