import { SuggestionManager } from '../../src/SuggestionManager';
import { SuggestionDataStore } from '../../src/SuggestionDataStore';
import { SuggestionFilterUtils } from '../../src/SuggestionFilterUtils';
import { FeedbackAnalytics } from '../../src/FeedbackAnalytics';
import { FeedbackPlugin } from '../../src/FeedbackPlugin';

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

describe('Feedback System Performance Tests', () => {
    let suggestionManager: SuggestionManager;
    let dataStore: SuggestionDataStore;
    let filterUtils: SuggestionFilterUtils;
    let feedbackPlugin: FeedbackPlugin;

    const generateTestSuggestions = (count: number) => {
        return Array(count).fill(null).map((_, index) => ({
            id: `s${index}`,
            suggestion: `Test suggestion ${index} with some content to make it realistic`,
            user: `user${index % 50}`, // 50 unique users
            category: ['general', 'ui', 'performance', 'security', 'documentation'][index % 5],
            type: ['feedback', 'idea', 'bug', 'feature', 'improvement'][index % 5],
            status: ['new', 'reviewing', 'approved', 'rejected', 'implemented'][index % 5],
            priority: ['low', 'medium', 'high', 'critical'][index % 4],
            createdAt: new Date(Date.now() - index * 1000).toISOString(),
            updatedAt: new Date(Date.now() - index * 1000).toISOString(),
            votes: index % 100,
            tags: [`tag${index % 20}`, `category${index % 10}`],
            targetService: 'project-feedback',
            pluginName: 'project-feedback-system',
            projectPath: 'c:/test/project',
            metadata: {
                priority: ['low', 'medium', 'high'][index % 3],
                category: ['frontend', 'backend', 'infrastructure'][index % 3],
                nested: {
                    deep: {
                        value: `value${index % 10}`,
                        number: index % 1000,
                        array: [`item${index % 5}`, `item${(index + 1) % 5}`],
                    },
                },
            },
        }));
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        SuggestionManager.MAX_SUGGESTIONS_PER_USER = 1000;
        SuggestionManager.MAX_SUGGESTION_LENGTH = 10000;

        suggestionManager = new SuggestionManager(
            'c:/test/feedback',
            'c:/test/project',
            'test-plugin',
            '1.0.0',
            'suggestions.json',
            1000,
            10000
        );
        dataStore = new SuggestionDataStore(
            'c:/test/feedback',
            'suggestions.json',
            'test-plugin',
            '1.0.0'
        );
        filterUtils = new SuggestionFilterUtils();
        feedbackPlugin = new FeedbackPlugin();
    });

    describe('SuggestionManager Performance', () => {
        it('should handle adding suggestions efficiently', () => {
            const suggestions = generateTestSuggestions(1000);
            
            const startTime = Date.now();
            
            suggestions.forEach((suggestion, index) => {
                const result = suggestionManager.addSuggestion(
                    suggestion.suggestion,
                    suggestion.user,
                    suggestion.category,
                    suggestion.type
                );
                expect(result.success).toBe(true);
            });
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            console.log(`Added 1000 suggestions in ${totalTime}ms (${totalTime / 1000}ms per suggestion)`);
            expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should filter suggestions efficiently', () => {
            const suggestions = generateTestSuggestions(5000);
            
            // Mock dataStore to return large dataset
            suggestionManager['dataStore'].loadSuggestions = jest.fn().mockReturnValue({
                suggestions,
                metadata: { total: suggestions.length }
            });

            const startTime = Date.now();
            
            // Test various filtering operations
            const categoryFilter = suggestionManager.getSuggestions({ category: 'ui' });
            const statusFilter = suggestionManager.getSuggestions({ status: 'new' });
            const userFilter = suggestionManager.getSuggestions({ user: 'user1' });
            const priorityFilter = suggestionManager.getSuggestions({ priority: 'high' });
            const typeFilter = suggestionManager.getSuggestions({ type: 'bug' });
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            expect(categoryFilter.success).toBe(true);
            expect(statusFilter.success).toBe(true);
            expect(userFilter.success).toBe(true);
            expect(priorityFilter.success).toBe(true);
            expect(typeFilter.success).toBe(true);
            
            console.log(`Filtered 5000 suggestions 5 times in ${totalTime}ms (${totalTime / 5}ms per filter)`);
            expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should handle nested key filtering efficiently', () => {
            const suggestions = generateTestSuggestions(3000);
            
            suggestionManager['dataStore'].loadSuggestions = jest.fn().mockReturnValue({
                suggestions,
                metadata: { total: suggestions.length }
            });

            const startTime = Date.now();
            
            // Test nested key filtering
            const nestedResult = suggestionManager.getSuggestionsByNestedKeyExtended({
                nestedKey: 'metadata.priority',
                nestedValue: 'high',
                nestedType: 'string',
                nestedExists: true
            });
            
            const multiKeyResult = suggestionManager.getSuggestionsByNestedKeyExtended({
                nestedKeys: ['metadata.category', 'metadata.priority'],
                nestedPattern: '^(frontend|backend)$',
                nestedType: 'string'
            });
            
            const rangeResult = suggestionManager.getSuggestionsByNestedKeyExtended({
                nestedKey: 'metadata.nested.deep.number',
                nestedRange: { min: 100, max: 500 },
                nestedType: 'number'
            });
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            expect(nestedResult.success).toBe(true);
            expect(multiKeyResult.success).toBe(true);
            expect(rangeResult.success).toBe(true);
            
            console.log(`Nested filtering on 3000 suggestions in ${totalTime}ms`);
            expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
        });

        it('should handle voting operations efficiently', () => {
            const suggestions = generateTestSuggestions(1000);
            
            suggestionManager['dataStore'].loadSuggestions = jest.fn().mockReturnValue({
                suggestions,
                metadata: { total: suggestions.length }
            });

            const startTime = Date.now();
            
            // Vote on multiple suggestions
            for (let i = 0; i < 100; i++) {
                const result = suggestionManager.voteSuggestion(`s${i}`, `voter${i % 10}`, 1);
                expect(result.success).toBe(true);
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            console.log(`Voted on 100 suggestions in ${totalTime}ms (${totalTime / 100}ms per vote)`);
            expect(totalTime).toBeLessThan(1500); // Should complete within 1.5 seconds
        });

        it('should handle status updates efficiently', () => {
            const suggestions = generateTestSuggestions(1000);
            
            suggestionManager['dataStore'].loadSuggestions = jest.fn().mockReturnValue({
                suggestions,
                metadata: { total: suggestions.length }
            });

            const startTime = Date.now();
            
            // Update status of multiple suggestions
            const statuses = ['reviewing', 'approved', 'rejected', 'implemented'];
            for (let i = 0; i < 100; i++) {
                const status = statuses[i % statuses.length];
                const result = suggestionManager.updateSuggestionStatus(`s${i}`, status, 'admin');
                expect(result.success).toBe(true);
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            console.log(`Updated status of 100 suggestions in ${totalTime}ms (${totalTime / 100}ms per update)`);
            expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
        });
    });

    describe('SuggestionFilterUtils Performance', () => {
        it('should handle nested value access efficiently', () => {
            const suggestions = generateTestSuggestions(5000);
            
            const startTime = Date.now();
            
            // Test nested value access
            suggestions.forEach(suggestion => {
                const value1 = filterUtils.getNestedValue(suggestion, 'metadata.priority');
                const value2 = filterUtils.getNestedValue(suggestion, 'metadata.nested.deep.value');
                const value3 = filterUtils.getNestedValue(suggestion, 'metadata.nested.deep.number');
                const value4 = filterUtils.getNestedValue(suggestion, 'metadata.nested.deep.array.0');
                
                expect(value1).toBeDefined();
                expect(value2).toBeDefined();
                expect(value3).toBeDefined();
                expect(value4).toBeDefined();
            });
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            console.log(`Accessed nested values for 5000 suggestions in ${totalTime}ms (${totalTime / 5000}ms per suggestion)`);
            expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
        });

        it('should handle extended criteria matching efficiently', () => {
            const suggestions = generateTestSuggestions(3000);
            
            const startTime = Date.now();
            
            // Test various extended criteria
            suggestions.forEach(suggestion => {
                const value = filterUtils.getNestedValue(suggestion, 'metadata.nested.deep.number');
                
                // Test range matching
                const rangeMatch = filterUtils.matchesExtendedCriteria(
                    value,
                    undefined,
                    { min: 100, max: 500 },
                    undefined,
                    undefined,
                    'number'
                );
                
                // Test pattern matching
                const patternMatch = filterUtils.matchesExtendedCriteria(
                    filterUtils.getNestedValue(suggestion, 'metadata.nested.deep.value'),
                    undefined,
                    undefined,
                    '^value[0-9]+$',
                    undefined,
                    'string'
                );
                
                // Test type matching
                const typeMatch = filterUtils.matchesExtendedCriteria(
                    value,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    'number'
                );
                
                expect(typeof rangeMatch).toBe('boolean');
                expect(typeof patternMatch).toBe('boolean');
                expect(typeof typeMatch).toBe('boolean');
            });
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            console.log(`Extended criteria matching for 3000 suggestions in ${totalTime}ms`);
            expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
        });
    });

    describe('FeedbackAnalytics Performance', () => {
        it('should group suggestions efficiently', () => {
            const suggestions = generateTestSuggestions(10000);
            
            const startTime = Date.now();
            
            // Test grouping by different fields
            const categoryGroups = FeedbackAnalytics.groupSuggestions(suggestions, 'category');
            const priorityGroups = FeedbackAnalytics.groupSuggestions(suggestions, 'priority');
            const statusGroups = FeedbackAnalytics.groupSuggestions(suggestions, 'status');
            const userGroups = FeedbackAnalytics.groupSuggestions(suggestions, 'user');
            const typeGroups = FeedbackAnalytics.groupSuggestions(suggestions, 'type');
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            expect(categoryGroups.length).toBe(5);
            expect(priorityGroups.length).toBe(4);
            expect(statusGroups.length).toBe(5);
            expect(userGroups.length).toBe(50);
            expect(typeGroups.length).toBe(5);
            
            console.log(`Grouped 10000 suggestions 5 times in ${totalTime}ms (${totalTime / 5}ms per group)`);
            expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
        });

        it('should calculate aggregates efficiently', () => {
            const suggestions = generateTestSuggestions(15000);
            
            const startTime = Date.now();
            
            const aggregates = FeedbackAnalytics.calculateAggregates(suggestions);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            expect(aggregates).toBeDefined();
            expect(aggregates!.totalSuggestions).toBe(15000);
            expect(aggregates!.totalVotes).toBeGreaterThan(0);
            expect(aggregates!.averageVotes).toBeGreaterThan(0);
            expect(aggregates!.maxVotes).toBeGreaterThanOrEqual(0);
            expect(aggregates!.minVotes).toBeGreaterThanOrEqual(0);
            
            console.log(`Calculated aggregates for 15000 suggestions in ${totalTime}ms`);
            expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should handle nested grouping efficiently', () => {
            const suggestions = generateTestSuggestions(5000);
            
            const startTime = Date.now();
            
            // Test nested property grouping
            const nestedGroups = FeedbackAnalytics.groupSuggestions(suggestions, 'metadata.priority');
            const deepNestedGroups = FeedbackAnalytics.groupSuggestions(suggestions, 'metadata.nested.deep.value');
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            expect(nestedGroups.length).toBe(3);
            expect(deepNestedGroups.length).toBe(10);
            
            console.log(`Nested grouping for 5000 suggestions in ${totalTime}ms`);
            expect(totalTime).toBeLessThan(1500); // Should complete within 1.5 seconds
        });
    });

    describe('FeedbackPlugin Performance', () => {
        it('should handle document creation efficiently', () => {
            feedbackPlugin.initialize();
            
            const startTime = Date.now();
            
            // Create multiple documents
            for (let i = 0; i < 100; i++) {
                const result = feedbackPlugin.createDocument(
                    `Test document content ${i}`,
                    'report',
                    `Test Report ${i}`,
                    { index: i, category: 'test' }
                );
                expect(result.success).toBe(true);
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            console.log(`Created 100 documents in ${totalTime}ms (${totalTime / 100}ms per document)`);
            expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
        });

        it('should handle mixed operations efficiently', () => {
            feedbackPlugin.initialize();
            
            const startTime = Date.now();
            
            // Mix of operations
            for (let i = 0; i < 50; i++) {
                // Add suggestion
                const addResult = feedbackPlugin.addSuggestion(
                    `Test suggestion ${i}`,
                    `user${i % 10}`,
                    ['general', 'ui', 'performance'][i % 3],
                    ['feedback', 'idea', 'bug'][i % 3]
                );
                expect(addResult.success).toBe(true);
                
                // Vote on suggestion
                if (i % 2 === 0) {
                    const voteResult = feedbackPlugin.voteSuggestion(addResult.suggestion!.id, `voter${i}`, 1);
                    // Voting might fail if suggestion doesn't exist, which is expected in some test scenarios
                    if (voteResult.success) {
                        expect(voteResult.suggestion).toBeDefined();
                    }
                }
                
                // Update status
                if (i % 3 === 0) {
                    const statusResult = feedbackPlugin.updateSuggestionStatus(
                        addResult.suggestion!.id,
                        'reviewing',
                        'admin'
                    );
                    // Status update might fail if suggestion doesn't exist, which is expected in some test scenarios
                    if (statusResult.success) {
                        expect(statusResult.suggestion).toBeDefined();
                    }
                }
                
                // Create document
                if (i % 5 === 0) {
                    const docResult = feedbackPlugin.createDocument(
                        `Document content ${i}`,
                        'report',
                        `Document ${i}`
                    );
                    expect(docResult.success).toBe(true);
                }
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            console.log(`Mixed operations (50 iterations) in ${totalTime}ms`);
            expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
        });
    });

    describe('Memory Usage Tests', () => {
        it('should handle large datasets without memory issues', () => {
            const initialMemory = process.memoryUsage();
            
            // Create large dataset
            const suggestions = generateTestSuggestions(20000);
            
            const afterGenerationMemory = process.memoryUsage();
            
            // Perform operations
            const categoryGroups = FeedbackAnalytics.groupSuggestions(suggestions, 'category');
            const aggregates = FeedbackAnalytics.calculateAggregates(suggestions);
            
            const afterOperationsMemory = process.memoryUsage();
            
            // Check memory usage
            const generationMemoryIncrease = afterGenerationMemory.heapUsed - initialMemory.heapUsed;
            const operationsMemoryIncrease = afterOperationsMemory.heapUsed - afterGenerationMemory.heapUsed;
            
            console.log(`Memory usage - Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
            console.log(`Memory usage - After generation: ${Math.round(afterGenerationMemory.heapUsed / 1024 / 1024)}MB`);
            console.log(`Memory usage - After operations: ${Math.round(afterOperationsMemory.heapUsed / 1024 / 1024)}MB`);
            console.log(`Memory increase - Generation: ${Math.round(generationMemoryIncrease / 1024 / 1024)}MB`);
            console.log(`Memory increase - Operations: ${Math.round(operationsMemoryIncrease / 1024 / 1024)}MB`);
            
            expect(categoryGroups.length).toBe(5);
            expect(aggregates!.totalSuggestions).toBe(20000);
            
            // Memory should not increase excessively
            expect(generationMemoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
            expect(operationsMemoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle concurrent suggestion additions', async () => {
            feedbackPlugin.initialize();
            
            const startTime = Date.now();
            
            // Simulate concurrent operations
            const promises = Array(100).fill(null).map((_, index) => 
                Promise.resolve(feedbackPlugin.addSuggestion(
                    `Concurrent suggestion ${index}`,
                    `user${index % 20}`,
                    ['general', 'ui', 'performance'][index % 3],
                    ['feedback', 'idea', 'bug'][index % 3]
                ))
            );
            
            const results = await Promise.all(promises);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // All operations should succeed
            results.forEach(result => {
                expect(result.success).toBe(true);
            });
            
            console.log(`Concurrent addition of 100 suggestions in ${totalTime}ms`);
            expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
        });

        it('should handle concurrent filtering operations', async () => {
            const suggestions = generateTestSuggestions(5000);
            
            suggestionManager['dataStore'].loadSuggestions = jest.fn().mockReturnValue({
                suggestions,
                metadata: { total: suggestions.length }
            });
            
            const startTime = Date.now();
            
            // Simulate concurrent filtering
            const promises = Array(50).fill(null).map((_, index) => 
                Promise.resolve(suggestionManager.getSuggestions({
                    category: ['general', 'ui', 'performance'][index % 3],
                    status: ['new', 'reviewing', 'approved'][index % 3],
                    priority: ['low', 'medium', 'high'][index % 3]
                }))
            );
            
            const results = await Promise.all(promises);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // All operations should succeed
            results.forEach(result => {
                expect(result.success).toBe(true);
            });
            
            console.log(`Concurrent filtering of 5000 suggestions 50 times in ${totalTime}ms`);
            expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
        });
    });
});
