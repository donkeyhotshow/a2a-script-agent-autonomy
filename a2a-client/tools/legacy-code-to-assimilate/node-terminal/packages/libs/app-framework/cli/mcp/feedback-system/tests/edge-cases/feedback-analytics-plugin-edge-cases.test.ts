import { FeedbackAnalytics } from '../../src/FeedbackAnalytics';
import { FeedbackPlugin } from '../../src/FeedbackPlugin';
import * as fs from 'fs';

// Mock dependencies
jest.mock('C:/apps/root/mcp/node-terminal/mcp/DebugSystem.cjs', () => ({
    debugSystem: {
        registerProblem: jest.fn(),
        DEBUG_CATEGORIES: {
            USER_FEEDBACK: 'USER_FEEDBACK',
            FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
            DOCUMENT_GENERATION: 'DOCUMENT_GENERATION',
        },
    },
}));

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    existsSync: jest.fn(() => false),
}));

jest.mock('path', () => ({
    ...jest.requireActual('path'),
    resolve: jest.fn((p, ...args) => {
        if (p.includes('feedback-system/src')) {
            return 'c:/apps/libs/app-framework/cli';
        }
        return jest.requireActual('path').resolve(p, ...args);
    }),
    join: jest.fn((...args) => args.join('/')),
}));

describe('FeedbackAnalytics and FeedbackPlugin Edge Cases', () => {
    let feedbackPlugin: FeedbackPlugin;

    beforeEach(() => {
        jest.clearAllMocks();
        feedbackPlugin = new FeedbackPlugin();
    });

    describe('FeedbackAnalytics Edge Cases', () => {
        it('should handle empty suggestions array', () => {
            const groups = FeedbackAnalytics.groupSuggestions([], 'category');
            const aggregates = FeedbackAnalytics.calculateAggregates([]);

            expect(groups).toHaveLength(0);
            expect(aggregates).toBeNull();
        });

        it('should handle single suggestion', () => {
            const singleSuggestion = [{
                id: 's1',
                suggestion: 'Single suggestion',
                user: 'user1',
                category: 'general',
                type: 'feedback',
                status: 'new',
                priority: 'medium',
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-01-01T00:00:00.000Z',
                votes: 5,
                tags: ['tag1'],
                targetService: 'project-feedback',
                pluginName: 'test-plugin',
                projectPath: 'c:/test/project',
            }];

            const groups = FeedbackAnalytics.groupSuggestions(singleSuggestion, 'category');
            const aggregates = FeedbackAnalytics.calculateAggregates(singleSuggestion);

            expect(groups).toHaveLength(1);
            expect(groups[0].group).toBe('general');
            expect(groups[0].count).toBe(1);

            expect(aggregates).toBeDefined();
            expect(aggregates!.totalSuggestions).toBe(1);
            expect(aggregates!.totalVotes).toBe(5);
            expect(aggregates!.averageVotes).toBe(5);
        });

        it('should handle suggestions with undefined values', () => {
            const suggestionsWithUndefined = [
                { id: 's1', category: undefined, priority: 'high', votes: 10 },
                { id: 's2', category: 'general', priority: undefined, votes: undefined },
                { id: 's3', category: null, priority: 'low', votes: null },
            ];

            const groups = FeedbackAnalytics.groupSuggestions(suggestionsWithUndefined, 'category');
            const aggregates = FeedbackAnalytics.calculateAggregates(suggestionsWithUndefined);

            expect(groups).toHaveLength(3);
            expect(groups.find(g => g.group === 'undefined')).toBeDefined();
            expect(groups.find(g => g.group === 'null')).toBeDefined();
            expect(groups.find(g => g.group === 'general')).toBeDefined();

            expect(aggregates).toBeDefined();
            expect(aggregates!.totalVotes).toBe(10); // Only first suggestion has votes
        });

        it('should handle suggestions with mixed data types', () => {
            const mixedTypeSuggestions = [
                { id: 's1', category: 'general', priority: 'high', votes: 10 },
                { id: 's2', category: 123, priority: true, votes: 'not-a-number' },
                { id: 's3', category: null, priority: false, votes: [] },
            ];

            const groups = FeedbackAnalytics.groupSuggestions(mixedTypeSuggestions, 'category');
            const aggregates = FeedbackAnalytics.calculateAggregates(mixedTypeSuggestions);

            expect(groups).toHaveLength(3);
            expect(groups.find(g => g.group === 'general')).toBeDefined();
            expect(groups.find(g => g.group === '123')).toBeDefined();
            expect(groups.find(g => g.group === 'null')).toBeDefined();

            expect(aggregates).toBeDefined();
            expect(aggregates!.totalVotes).toBeGreaterThanOrEqual(10); // Only first suggestion has valid votes
        });

        it('should handle very large numbers in votes', () => {
            const suggestionsWithLargeVotes = [
                { id: 's1', votes: Number.MAX_SAFE_INTEGER },
                { id: 's2', votes: Number.MIN_SAFE_INTEGER },
                { id: 's3', votes: 0 },
            ];

            const aggregates = FeedbackAnalytics.calculateAggregates(suggestionsWithLargeVotes);

            expect(aggregates).toBeDefined();
            expect(aggregates!.maxVotes).toBe(Number.MAX_SAFE_INTEGER);
            expect(aggregates!.minVotes).toBe(Number.MIN_SAFE_INTEGER);
        });
    });

    describe('FeedbackPlugin Edge Cases', () => {
        it('should handle document creation with empty content', () => {
            feedbackPlugin.initialize();

            const result = feedbackPlugin.createDocument('', 'report', 'Empty Report');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Document content must be text');
        });

        it('should handle document creation with null content', () => {
            feedbackPlugin.initialize();

            const result = feedbackPlugin.createDocument(null as any, 'report', 'Null Report');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Document content must be text');
        });

        it('should handle document creation with very long title', () => {
            feedbackPlugin.initialize();

            const longTitle = 'a'.repeat(1000);
            const result = feedbackPlugin.createDocument('Content', 'report', longTitle);
            expect(result.success).toBe(true);
            expect(result.filePath).toContain(longTitle.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_'));
        });

        it('should handle document creation with special characters in title', () => {
            feedbackPlugin.initialize();

            const specialTitle = 'Report with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
            const result = feedbackPlugin.createDocument('Content', 'report', specialTitle);
            expect(result.success).toBe(true);
            expect(result.filePath).toContain('Report_with_special_chars');
        });

        it('should handle document creation with unicode characters in title', () => {
            feedbackPlugin.initialize();

            const unicodeTitle = 'Отчет с кириллицей 你好世界 🌍';
            const result = feedbackPlugin.createDocument('Content', 'report', unicodeTitle);
            expect(result.success).toBe(true);
            expect(result.filePath).toContain('_');
        });

        it('should handle unknown document types', () => {
            feedbackPlugin.initialize();

            const result = feedbackPlugin.createDocument('Content', 'unknown-type', 'Test Document');
            expect(result.success).toBe(true);
            expect(result.filePath).toContain('work/reports'); // Should default to reports
            expect(result.filePath).toContain('.md');
        });

        it('should handle complex metadata', () => {
            feedbackPlugin.initialize();

            const complexMetadata = {
                description: 'A complex description',
                tags: ['tag1', 'tag2', 'tag3'],
                notes: 'Some notes',
                customField: 'custom value',
                nested: {
                    deep: {
                        value: 'deep value',
                        array: [1, 2, 3],
                        object: { key: 'value' }
                    }
                }
            };

            const result = feedbackPlugin.createDocument('Content', 'report', 'Test Document', complexMetadata);
            expect(result.success).toBe(true);
        });
    });
});
