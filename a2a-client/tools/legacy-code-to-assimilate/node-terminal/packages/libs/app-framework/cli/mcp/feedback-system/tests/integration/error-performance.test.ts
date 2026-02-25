import * as fs from 'fs';
import { FeedbackPlugin } from '../../src/FeedbackPlugin';
import { SuggestionManager } from '../../src/SuggestionManager';
import { FeedbackAnalytics } from '../../src/FeedbackAnalytics';
import { SuggestionFilterUtils } from '../../src/SuggestionFilterUtils';

// Mock the debugSystem
const mockRegisterProblem = jest.fn();
jest.mock('C:/apps/root/mcp/node-terminal/mcp/DebugSystem.cjs', () => ({
    debugSystem: {
        registerProblem: mockRegisterProblem,
        DEBUG_CATEGORIES: {
            USER_FEEDBACK: 'USER_FEEDBACK',
            FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
            DOCUMENT_GENERATION: 'DOCUMENT_GENERATION',
        },
    },
}));

// Mock fs module
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    existsSync: jest.fn(() => false),
}));

describe('Error Handling and Performance Integration Tests', () => {
    let feedbackPlugin: FeedbackPlugin;
    let filterUtils: SuggestionFilterUtils;

    const testProjectRoot = 'c:/test/project';

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset static properties
        SuggestionManager.MAX_SUGGESTIONS_PER_USER = 50;
        SuggestionManager.MAX_SUGGESTION_LENGTH = 5000;

        // Mock file system operations
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
        (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
        (fs.readFileSync as jest.Mock).mockReturnValue('{"suggestions":[],"metadata":{"total":0}}');

        feedbackPlugin = new FeedbackPlugin();
        filterUtils = new SuggestionFilterUtils();
    });

    describe('Error Handling Integration', () => {
        it('should handle cascading errors gracefully', async () => {
            // Mock file system to fail
            (fs.mkdirSync as jest.Mock).mockImplementation(() => {
                throw new Error('Directory creation failed');
            });

            // Initialize should fail
            const initResult = feedbackPlugin.initialize();
            expect(initResult.success).toBe(false);

            // But plugin should still be usable for other operations
            const pluginInfo = feedbackPlugin.getPluginInfo();
            expect(pluginInfo.name).toBe('project-feedback-system');
            expect(pluginInfo.isInitialized).toBe(false);
        });

        it('should handle suggestion limit errors', async () => {
            feedbackPlugin.initialize();

            // Mock user with max suggestions
            const maxSuggestions = Array(SuggestionManager.MAX_SUGGESTIONS_PER_USER).fill({
                user: 'testuser',
                suggestion: 'existing suggestion',
            });

            // Mock dataStore to return max suggestions
            const mockDataStore = feedbackPlugin['suggestionManager']['dataStore'];
            mockDataStore.loadSuggestions = jest.fn().mockReturnValue({
                suggestions: maxSuggestions,
                metadata: { total: maxSuggestions.length }
            });

            const result = feedbackPlugin.addSuggestion('New suggestion', 'testuser');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Suggestion limit');
        });

        it('should handle suggestion length errors', async () => {
            feedbackPlugin.initialize();

            const longSuggestion = 'a'.repeat(SuggestionManager.MAX_SUGGESTION_LENGTH + 1);
            const result = feedbackPlugin.addSuggestion(longSuggestion);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Suggestion too long');
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle large numbers of suggestions efficiently', () => {
            const largeSuggestions = Array(1000).fill(null).map((_, index) => ({
                id: `s${index}`,
                suggestion: `Test suggestion ${index}`,
                user: `user${index % 10}`,
                category: ['general', 'ui', 'performance'][index % 3],
                type: ['feedback', 'idea', 'bug'][index % 3],
                status: ['new', 'reviewing', 'approved'][index % 3],
                priority: ['low', 'medium', 'high'][index % 3],
                createdAt: new Date(Date.now() - index * 1000).toISOString(),
                updatedAt: new Date(Date.now() - index * 1000).toISOString(),
                votes: index % 20,
                tags: [`tag${index % 5}`],
                targetService: 'project-feedback',
                pluginName: 'test-plugin',
                projectPath: testProjectRoot,
            }));

            // Test grouping performance
            const startTime = Date.now();
            const categoryGroups = FeedbackAnalytics.groupSuggestions(largeSuggestions, 'category');
            const groupingTime = Date.now() - startTime;

            expect(categoryGroups).toHaveLength(3);
            expect(groupingTime).toBeLessThan(1000); // Should complete within 1 second

            // Test aggregate calculation performance
            const aggregateStartTime = Date.now();
            const aggregates = FeedbackAnalytics.calculateAggregates(largeSuggestions);
            const aggregateTime = Date.now() - aggregateStartTime;

            expect(aggregates).toBeDefined();
            expect(aggregateTime).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should handle complex filtering efficiently', () => {
            const complexSuggestions = Array(500).fill(null).map((_, index) => ({
                id: `s${index}`,
                suggestion: `Test suggestion ${index}`,
                user: `user${index % 20}`,
                category: ['general', 'ui', 'performance', 'security'][index % 4],
                type: ['feedback', 'idea', 'bug', 'feature'][index % 4],
                status: ['new', 'reviewing', 'approved', 'rejected'][index % 4],
                priority: ['low', 'medium', 'high', 'critical'][index % 4],
                createdAt: new Date(Date.now() - index * 1000).toISOString(),
                updatedAt: new Date(Date.now() - index * 1000).toISOString(),
                votes: index % 50,
                tags: [`tag${index % 10}`],
                targetService: 'project-feedback',
                pluginName: 'test-plugin',
                projectPath: testProjectRoot,
                metadata: {
                    priority: ['low', 'medium', 'high'][index % 3],
                    category: ['frontend', 'backend'][index % 2],
                    nested: {
                        deep: {
                            value: `value${index % 5}`,
                            number: index % 100,
                        },
                    },
                },
            }));

            // Test complex nested filtering
            const startTime = Date.now();
            const filteredSuggestions = complexSuggestions.filter(s => {
                const nestedValue = filterUtils.getNestedValue(s, 'metadata.nested.deep.value');
                return filterUtils.matchesExtendedCriteria(
                    nestedValue,
                    'value1',
                    undefined,
                    '^value[0-9]+$',
                    true,
                    'string'
                );
            });
            const filteringTime = Date.now() - startTime;

            expect(filteredSuggestions.length).toBeGreaterThan(0);
            expect(filteringTime).toBeLessThan(500); // Should complete within 500ms
        });
    });
});
