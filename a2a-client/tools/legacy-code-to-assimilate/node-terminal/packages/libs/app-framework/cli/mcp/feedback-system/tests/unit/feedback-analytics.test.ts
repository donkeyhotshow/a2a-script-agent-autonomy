import { FeedbackAnalytics } from '../../src/FeedbackAnalytics';
import { Suggestion } from '../../src/SuggestionDataStore';

describe('FeedbackAnalytics', () => {
    const mockSuggestions: Suggestion[] = [
        {
            id: 's1',
            suggestion: 'Test suggestion 1',
            user: 'user1',
            category: 'general',
            type: 'feedback',
            status: 'new',
            priority: 'high',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
            votes: 10,
            tags: ['tag1'],
            targetService: 'project-feedback',
            pluginName: 'project-feedback-system',
            projectPath: 'c:/test/project',
        },
        {
            id: 's2',
            suggestion: 'Test suggestion 2',
            user: 'user2',
            category: 'ui',
            type: 'idea',
            status: 'reviewing',
            priority: 'medium',
            createdAt: '2025-01-02T00:00:00.000Z',
            updatedAt: '2025-01-02T00:00:00.000Z',
            votes: 5,
            tags: ['tag2', 'tag3'],
            targetService: 'project-feedback',
            pluginName: 'project-feedback-system',
            projectPath: 'c:/test/project',
        },
        {
            id: 's3',
            suggestion: 'Test suggestion 3',
            user: 'user1',
            category: 'general',
            type: 'bug',
            status: 'approved',
            priority: 'low',
            createdAt: '2025-01-03T00:00:00.000Z',
            updatedAt: '2025-01-03T00:00:00.000Z',
            votes: 15,
            tags: ['tag1', 'tag4'],
            targetService: 'project-feedback',
            pluginName: 'project-feedback-system',
            projectPath: 'c:/test/project',
        },
        {
            id: 's4',
            suggestion: 'Test suggestion 4',
            user: 'user3',
            category: 'performance',
            type: 'feature',
            status: 'implemented',
            priority: 'high',
            createdAt: '2025-01-04T00:00:00.000Z',
            updatedAt: '2025-01-04T00:00:00.000Z',
            votes: 0,
            tags: [],
            targetService: 'project-feedback',
            pluginName: 'project-feedback-system',
            projectPath: 'c:/test/project',
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('groupSuggestions', () => {
        it('should group suggestions by category', () => {
            const result = FeedbackAnalytics.groupSuggestions(mockSuggestions, 'category');

            expect(result).toHaveLength(3);
            
            const generalGroup = result.find(g => g.group === 'general');
            expect(generalGroup).toBeDefined();
            expect(generalGroup!.count).toBe(2);
            expect(generalGroup!.items).toHaveLength(2);

            const uiGroup = result.find(g => g.group === 'ui');
            expect(uiGroup).toBeDefined();
            expect(uiGroup!.count).toBe(1);
            expect(uiGroup!.items).toHaveLength(1);

            const performanceGroup = result.find(g => g.group === 'performance');
            expect(performanceGroup).toBeDefined();
            expect(performanceGroup!.count).toBe(1);
            expect(performanceGroup!.items).toHaveLength(1);
        });

        it('should group suggestions by priority', () => {
            const result = FeedbackAnalytics.groupSuggestions(mockSuggestions, 'priority');

            expect(result).toHaveLength(3);
            
            const highGroup = result.find(g => g.group === 'high');
            expect(highGroup).toBeDefined();
            expect(highGroup!.count).toBe(2);

            const mediumGroup = result.find(g => g.group === 'medium');
            expect(mediumGroup).toBeDefined();
            expect(mediumGroup!.count).toBe(1);

            const lowGroup = result.find(g => g.group === 'low');
            expect(lowGroup).toBeDefined();
            expect(lowGroup!.count).toBe(1);
        });

        it('should group suggestions by status', () => {
            const result = FeedbackAnalytics.groupSuggestions(mockSuggestions, 'status');

            expect(result).toHaveLength(4);
            
            const newGroup = result.find(g => g.group === 'new');
            expect(newGroup).toBeDefined();
            expect(newGroup!.count).toBe(1);

            const reviewingGroup = result.find(g => g.group === 'reviewing');
            expect(reviewingGroup).toBeDefined();
            expect(reviewingGroup!.count).toBe(1);

            const approvedGroup = result.find(g => g.group === 'approved');
            expect(approvedGroup).toBeDefined();
            expect(approvedGroup!.count).toBe(1);

            const implementedGroup = result.find(g => g.group === 'implemented');
            expect(implementedGroup).toBeDefined();
            expect(implementedGroup!.count).toBe(1);
        });

        it('should group suggestions by user', () => {
            const result = FeedbackAnalytics.groupSuggestions(mockSuggestions, 'user');

            expect(result).toHaveLength(3);
            
            const user1Group = result.find(g => g.group === 'user1');
            expect(user1Group).toBeDefined();
            expect(user1Group!.count).toBe(2);

            const user2Group = result.find(g => g.group === 'user2');
            expect(user2Group).toBeDefined();
            expect(user2Group!.count).toBe(1);

            const user3Group = result.find(g => g.group === 'user3');
            expect(user3Group).toBeDefined();
            expect(user3Group!.count).toBe(1);
        });

        it('should group suggestions by type', () => {
            const result = FeedbackAnalytics.groupSuggestions(mockSuggestions, 'type');

            expect(result).toHaveLength(4);
            
            const feedbackGroup = result.find(g => g.group === 'feedback');
            expect(feedbackGroup).toBeDefined();
            expect(feedbackGroup!.count).toBe(1);

            const ideaGroup = result.find(g => g.group === 'idea');
            expect(ideaGroup).toBeDefined();
            expect(ideaGroup!.count).toBe(1);

            const bugGroup = result.find(g => g.group === 'bug');
            expect(bugGroup).toBeDefined();
            expect(bugGroup!.count).toBe(1);

            const featureGroup = result.find(g => g.group === 'feature');
            expect(featureGroup).toBeDefined();
            expect(featureGroup!.count).toBe(1);
        });

        it('should handle nested property grouping', () => {
            const suggestionsWithNested = [
                {
                    ...mockSuggestions[0],
                    metadata: { priority: 'high' },
                },
                {
                    ...mockSuggestions[1],
                    metadata: { priority: 'medium' },
                },
            ];

            const mockFilterUtils = {
                getNestedValue: jest.fn((obj, path) => {
                    if (path === 'metadata.priority') {
                        return obj.metadata?.priority;
                    }
                    return obj[path];
                }),
            };

            // Use real implementation

            const result = FeedbackAnalytics.groupSuggestions(suggestionsWithNested, 'metadata.priority');

            expect(result).toHaveLength(2);
            
            const highGroup = result.find(g => g.group === 'high');
            expect(highGroup).toBeDefined();
            expect(highGroup!.count).toBe(1);

            const mediumGroup = result.find(g => g.group === 'medium');
            expect(mediumGroup).toBeDefined();
            expect(mediumGroup!.count).toBe(1);
        });

        it('should handle undefined values in grouping', () => {
            const suggestionsWithUndefined = [
                { ...mockSuggestions[0], category: 'general' },
                { ...mockSuggestions[1], category: undefined },
                { ...mockSuggestions[2], category: null },
            ];

            const result = FeedbackAnalytics.groupSuggestions(suggestionsWithUndefined, 'category');

            expect(result).toHaveLength(3);
            
            const generalGroup = result.find(g => g.group === 'general');
            expect(generalGroup).toBeDefined();
            expect(generalGroup!.count).toBe(1);

            const undefinedGroup = result.find(g => g.group === 'undefined');
            expect(undefinedGroup).toBeDefined();
            expect(undefinedGroup!.count).toBe(1);

            const nullGroup = result.find(g => g.group === 'null');
            expect(nullGroup).toBeDefined();
            expect(nullGroup!.count).toBe(1);
        });

        it('should handle empty suggestions array', () => {
            const result = FeedbackAnalytics.groupSuggestions([], 'category');

            expect(result).toHaveLength(0);
        });

        it('should handle single suggestion', () => {
            const result = FeedbackAnalytics.groupSuggestions([mockSuggestions[0]], 'category');

            expect(result).toHaveLength(1);
            expect(result[0].group).toBe('general');
            expect(result[0].count).toBe(1);
            expect(result[0].items).toHaveLength(1);
        });
    });

    describe('calculateAggregates', () => {
        it('should calculate correct aggregates for multiple suggestions', () => {
            const result = FeedbackAnalytics.calculateAggregates(mockSuggestions);

            expect(result).toBeDefined();
            expect(result.totalVotes).toBe(30); // 10 + 5 + 15 + 0
            expect(result.averageVotes).toBe(7.5); // 30 / 4
            expect(result.maxVotes).toBe(15);
            expect(result.minVotes).toBe(0);
            expect(result.totalSuggestions).toBe(4);

            expect(result.priorityDistribution).toEqual({
                high: 2,
                medium: 1,
                low: 1,
            });

            expect(result.categoryDistribution).toEqual({
                general: 2,
                ui: 1,
                performance: 1,
            });
        });

        it('should handle empty suggestions array', () => {
            const result = FeedbackAnalytics.calculateAggregates([]);

            expect(result).toBeNull();
        });

        it('should handle single suggestion', () => {
            const result = FeedbackAnalytics.calculateAggregates([mockSuggestions[0]]);

            expect(result).toBeDefined();
            expect(result.totalVotes).toBe(10);
            expect(result.averageVotes).toBe(10);
            expect(result.maxVotes).toBe(10);
            expect(result.minVotes).toBe(10);
            expect(result.totalSuggestions).toBe(1);

            expect(result.priorityDistribution).toEqual({
                high: 1,
            });

            expect(result.categoryDistribution).toEqual({
                general: 1,
            });
        });

        it('should handle suggestions with zero votes', () => {
            const suggestionsWithZeros = [
                { ...mockSuggestions[0], votes: 0 },
                { ...mockSuggestions[1], votes: 0 },
            ];

            const result = FeedbackAnalytics.calculateAggregates(suggestionsWithZeros);

            expect(result.totalVotes).toBe(0);
            expect(result.averageVotes).toBe(0);
            expect(result.maxVotes).toBe(0);
            expect(result.minVotes).toBe(0);
        });

        it('should handle suggestions with undefined votes', () => {
            const suggestionsWithUndefinedVotes = [
                { ...mockSuggestions[0], votes: undefined },
                { ...mockSuggestions[1], votes: 5 },
            ];

            const result = FeedbackAnalytics.calculateAggregates(suggestionsWithUndefinedVotes);

            expect(result.totalVotes).toBe(5); // 0 + 5
            expect(result.averageVotes).toBe(2.5); // 5 / 2
            expect(result.maxVotes).toBe(5);
            expect(result.minVotes).toBe(0);
        });

        it('should handle suggestions with null votes', () => {
            const suggestionsWithNullVotes = [
                { ...mockSuggestions[0], votes: null },
                { ...mockSuggestions[1], votes: 5 },
            ];

            const result = FeedbackAnalytics.calculateAggregates(suggestionsWithNullVotes);

            expect(result.totalVotes).toBe(5); // 0 + 5
            expect(result.averageVotes).toBe(2.5); // 5 / 2
            expect(result.maxVotes).toBe(5);
            expect(result.minVotes).toBe(0);
        });

        it('should handle suggestions with undefined priorities and categories', () => {
            const suggestionsWithUndefined = [
                { ...mockSuggestions[0], priority: undefined, category: undefined },
                { ...mockSuggestions[1], priority: 'medium', category: 'ui' },
            ];

            const result = FeedbackAnalytics.calculateAggregates(suggestionsWithUndefined);

            expect(result.priorityDistribution).toEqual({
                undefined: 1,
                medium: 1,
            });

            expect(result.categoryDistribution).toEqual({
                undefined: 1,
                ui: 1,
            });
        });

        it('should handle mixed data types in priorities and categories', () => {
            const suggestionsWithMixedTypes = [
                { ...mockSuggestions[0], priority: 'high', category: 'general' },
                { ...mockSuggestions[1], priority: 123, category: null },
                { ...mockSuggestions[2], priority: true, category: 'ui' },
            ];

            const result = FeedbackAnalytics.calculateAggregates(suggestionsWithMixedTypes);

            expect(result.priorityDistribution).toEqual({
                high: 1,
                123: 1,
                true: 1,
            });

            expect(result.categoryDistribution).toEqual({
                general: 1,
                null: 1,
                ui: 1,
            });
        });
    });

    describe('integration scenarios', () => {
        it('should work together for comprehensive analysis', () => {
            // Group by category
            const categoryGroups = FeedbackAnalytics.groupSuggestions(mockSuggestions, 'category');
            
            // Calculate aggregates
            const aggregates = FeedbackAnalytics.calculateAggregates(mockSuggestions);

            // Verify consistency
            expect(categoryGroups.length).toBeGreaterThan(0);
            expect(aggregates).toBeDefined();
            expect(aggregates!.totalSuggestions).toBe(mockSuggestions.length);

            // Verify that group counts match aggregate distribution
            const categoryDistribution = aggregates!.categoryDistribution;
            categoryGroups.forEach(group => {
                expect(group.count).toBe(categoryDistribution[group.group]);
            });
        });

        it('should handle real-world filtering scenarios', () => {
            // Filter high priority suggestions
            const highPrioritySuggestions = mockSuggestions.filter(s => s.priority === 'high');
            
            // Group filtered suggestions by status
            const statusGroups = FeedbackAnalytics.groupSuggestions(highPrioritySuggestions, 'status');
            
            // Calculate aggregates for filtered suggestions
            const aggregates = FeedbackAnalytics.calculateAggregates(highPrioritySuggestions);

            expect(statusGroups).toHaveLength(2); // 'new' and 'implemented'
            expect(aggregates!.totalSuggestions).toBe(2);
            expect(aggregates!.totalVotes).toBe(10); // 10 + 0
        });

        it('should handle complex nested grouping', () => {
            const suggestionsWithComplexNested = [
                {
                    ...mockSuggestions[0],
                    metadata: {
                        nested: {
                            deep: {
                                value: 'A',
                                category: 'type1',
                            },
                        },
                    },
                },
                {
                    ...mockSuggestions[1],
                    metadata: {
                        nested: {
                            deep: {
                                value: 'B',
                                category: 'type2',
                            },
                        },
                    },
                },
            ];

            const mockFilterUtils = {
                getNestedValue: jest.fn((obj, path) => {
                    const keys = path.split('.');
                    let current = obj;
                    for (const key of keys) {
                        current = current?.[key];
                    }
                    return current;
                }),
            };

            // Use real implementation

            const result = FeedbackAnalytics.groupSuggestions(
                suggestionsWithComplexNested, 
                'metadata.nested.deep.category'
            );

            expect(result).toHaveLength(2);
            expect(result.find(g => g.group === 'type1')).toBeDefined();
            expect(result.find(g => g.group === 'type2')).toBeDefined();
        });
    });
});
