import { SuggestionFilterUtils } from '../../src/SuggestionFilterUtils';

describe('SuggestionFilterUtils', () => {
    let filterUtils: SuggestionFilterUtils;

    const mockSuggestion = {
        id: 's1',
        suggestion: 'Test suggestion',
        user: 'user1',
        category: 'general',
        type: 'feedback',
        status: 'new',
        priority: 'medium',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        votes: 5,
        tags: ['tag1', 'tag2'],
        targetService: 'project-feedback',
        pluginName: 'project-feedback-system',
        projectPath: 'c:/test/project',
        metadata: {
            priority: 'high',
            category: 'ui',
            customField: 'custom-value',
            nested: {
                deep: {
                    value: 'deep-value',
                    number: 42,
                },
            },
        },
    };

    beforeEach(() => {
        filterUtils = new SuggestionFilterUtils();
    });

    describe('getNestedValue', () => {
        it('should return undefined for null or undefined object', () => {
            expect(filterUtils.getNestedValue(null, 'any.path')).toBeUndefined();
            expect(filterUtils.getNestedValue(undefined, 'any.path')).toBeUndefined();
        });

        it('should return undefined for empty path', () => {
            expect(filterUtils.getNestedValue(mockSuggestion, '')).toBeUndefined();
            expect(filterUtils.getNestedValue(mockSuggestion, null as any)).toBeUndefined();
        });

        it('should return direct property value', () => {
            expect(filterUtils.getNestedValue(mockSuggestion, 'id')).toBe('s1');
            expect(filterUtils.getNestedValue(mockSuggestion, 'user')).toBe('user1');
            expect(filterUtils.getNestedValue(mockSuggestion, 'votes')).toBe(5);
        });

        it('should return nested property value using dot notation', () => {
            expect(filterUtils.getNestedValue(mockSuggestion, 'metadata.priority')).toBe('high');
            expect(filterUtils.getNestedValue(mockSuggestion, 'metadata.category')).toBe('ui');
            expect(filterUtils.getNestedValue(mockSuggestion, 'metadata.customField')).toBe('custom-value');
        });

        it('should return deeply nested property value', () => {
            expect(filterUtils.getNestedValue(mockSuggestion, 'metadata.nested.deep.value')).toBe('deep-value');
            expect(filterUtils.getNestedValue(mockSuggestion, 'metadata.nested.deep.number')).toBe(42);
        });

        it('should return array element by index', () => {
            expect(filterUtils.getNestedValue(mockSuggestion, 'tags.0')).toBe('tag1');
            expect(filterUtils.getNestedValue(mockSuggestion, 'tags.1')).toBe('tag2');
        });

        it('should return undefined for non-existent properties', () => {
            expect(filterUtils.getNestedValue(mockSuggestion, 'nonexistent')).toBeUndefined();
            expect(filterUtils.getNestedValue(mockSuggestion, 'metadata.nonexistent')).toBeUndefined();
            expect(filterUtils.getNestedValue(mockSuggestion, 'metadata.nested.nonexistent')).toBeUndefined();
        });

        it('should return undefined for invalid array indices', () => {
            expect(filterUtils.getNestedValue(mockSuggestion, 'tags.5')).toBeUndefined();
            expect(filterUtils.getNestedValue(mockSuggestion, 'tags.-1')).toBeUndefined();
            expect(filterUtils.getNestedValue(mockSuggestion, 'tags.invalid')).toBeUndefined();
        });

        it('should return undefined when accessing property of null/undefined', () => {
            const objWithNull = { metadata: null };
            expect(filterUtils.getNestedValue(objWithNull, 'metadata.priority')).toBeUndefined();

            const objWithUndefined = { metadata: undefined };
            expect(filterUtils.getNestedValue(objWithUndefined, 'metadata.priority')).toBeUndefined();
        });

        it('should handle mixed array and object access', () => {
            const complexObject = {
                items: [
                    { name: 'item1', value: 10 },
                    { name: 'item2', value: 20 },
                ],
            };
            expect(filterUtils.getNestedValue(complexObject, 'items.0.name')).toBe('item1');
            expect(filterUtils.getNestedValue(complexObject, 'items.1.value')).toBe(20);
        });
    });

    describe('matchesType', () => {
        it('should correctly identify string types', () => {
            expect(filterUtils.matchesType('test', 'string')).toBe(true);
            expect(filterUtils.matchesType('', 'string')).toBe(true);
            expect(filterUtils.matchesType(123, 'string')).toBe(false);
            expect(filterUtils.matchesType(null, 'string')).toBe(false);
            expect(filterUtils.matchesType(undefined, 'string')).toBe(false);
        });

        it('should correctly identify number types', () => {
            expect(filterUtils.matchesType(123, 'number')).toBe(true);
            expect(filterUtils.matchesType(0, 'number')).toBe(true);
            expect(filterUtils.matchesType(-5.5, 'number')).toBe(true);
            expect(filterUtils.matchesType('123', 'number')).toBe(false);
            expect(filterUtils.matchesType(null, 'number')).toBe(false);
            expect(filterUtils.matchesType(undefined, 'number')).toBe(false);
        });

        it('should correctly identify boolean types', () => {
            expect(filterUtils.matchesType(true, 'boolean')).toBe(true);
            expect(filterUtils.matchesType(false, 'boolean')).toBe(true);
            expect(filterUtils.matchesType(1, 'boolean')).toBe(false);
            expect(filterUtils.matchesType('true', 'boolean')).toBe(false);
            expect(filterUtils.matchesType(null, 'boolean')).toBe(false);
            expect(filterUtils.matchesType(undefined, 'boolean')).toBe(false);
        });

        it('should correctly identify array types', () => {
            expect(filterUtils.matchesType([], 'array')).toBe(true);
            expect(filterUtils.matchesType([1, 2, 3], 'array')).toBe(true);
            expect(filterUtils.matchesType(['a', 'b'], 'array')).toBe(true);
            expect(filterUtils.matchesType({}, 'array')).toBe(false);
            expect(filterUtils.matchesType('array', 'array')).toBe(false);
            expect(filterUtils.matchesType(null, 'array')).toBe(false);
            expect(filterUtils.matchesType(undefined, 'array')).toBe(false);
        });

        it('should correctly identify object types', () => {
            expect(filterUtils.matchesType({}, 'object')).toBe(true);
            expect(filterUtils.matchesType({ key: 'value' }, 'object')).toBe(true);
            expect(filterUtils.matchesType([], 'object')).toBe(false);
            expect(filterUtils.matchesType(null, 'object')).toBe(false);
            expect(filterUtils.matchesType(undefined, 'object')).toBe(false);
            expect(filterUtils.matchesType('object', 'object')).toBe(false);
        });

        it('should return true for unknown types', () => {
            expect(filterUtils.matchesType('anything', 'unknown')).toBe(true);
            expect(filterUtils.matchesType(123, 'unknown')).toBe(true);
            expect(filterUtils.matchesType(null, 'unknown')).toBe(true);
        });
    });

    describe('matchesExtendedCriteria', () => {
        it('should check key existence', () => {
            expect(filterUtils.matchesExtendedCriteria('value', undefined, undefined, undefined, true)).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(null, undefined, undefined, undefined, false)).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(undefined, undefined, undefined, undefined, false)).toBe(true);
            expect(filterUtils.matchesExtendedCriteria('value', undefined, undefined, undefined, false)).toBe(false);
            expect(filterUtils.matchesExtendedCriteria(null, undefined, undefined, undefined, true)).toBe(false);
        });

        it('should check type matching', () => {
            expect(filterUtils.matchesExtendedCriteria('test', undefined, undefined, undefined, undefined, 'string')).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(123, undefined, undefined, undefined, undefined, 'number')).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(true, undefined, undefined, undefined, undefined, 'boolean')).toBe(true);
            expect(filterUtils.matchesExtendedCriteria([], undefined, undefined, undefined, undefined, 'array')).toBe(true);
            expect(filterUtils.matchesExtendedCriteria({}, undefined, undefined, undefined, undefined, 'object')).toBe(true);

            expect(filterUtils.matchesExtendedCriteria('test', undefined, undefined, undefined, undefined, 'number')).toBe(false);
            expect(filterUtils.matchesExtendedCriteria(123, undefined, undefined, undefined, undefined, 'string')).toBe(false);
        });

        it('should check range for numeric values', () => {
            expect(filterUtils.matchesExtendedCriteria(5, undefined, { min: 1, max: 10 })).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(5, undefined, { min: 5, max: 5 })).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(5, undefined, { min: 1 })).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(5, undefined, { max: 10 })).toBe(true);

            expect(filterUtils.matchesExtendedCriteria(5, undefined, { min: 6 })).toBe(false);
            expect(filterUtils.matchesExtendedCriteria(5, undefined, { max: 4 })).toBe(false);
            expect(filterUtils.matchesExtendedCriteria(5, undefined, { min: 6, max: 10 })).toBe(false);

            // Non-numeric values should fail range check
            expect(filterUtils.matchesExtendedCriteria('5', undefined, { min: 1, max: 10 })).toBe(false);
            expect(filterUtils.matchesExtendedCriteria(null, undefined, { min: 1, max: 10 })).toBe(false);
        });

        it('should check pattern for string values', () => {
            expect(filterUtils.matchesExtendedCriteria('test123', undefined, undefined, '\\d+')).toBe(true);
            expect(filterUtils.matchesExtendedCriteria('abc', undefined, undefined, '^[a-z]+$')).toBe(true);
            expect(filterUtils.matchesExtendedCriteria('Test123', undefined, undefined, '^[a-z]+$')).toBe(false);

            // Non-string values should fail pattern check
            expect(filterUtils.matchesExtendedCriteria(123, undefined, undefined, '\\d+')).toBe(false);
            expect(filterUtils.matchesExtendedCriteria(null, undefined, undefined, '\\d+')).toBe(false);
        });

        it('should handle invalid regex patterns gracefully', () => {
            expect(filterUtils.matchesExtendedCriteria('test', undefined, undefined, '[invalid')).toBe(false);
            expect(filterUtils.matchesExtendedCriteria('test', undefined, undefined, '\\')).toBe(false);
        });

        it('should check exact value match', () => {
            expect(filterUtils.matchesExtendedCriteria('test', 'test')).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(123, 123)).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(true, true)).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(null, null)).toBe(true);

            expect(filterUtils.matchesExtendedCriteria('test', 'different')).toBe(false);
            expect(filterUtils.matchesExtendedCriteria(123, 456)).toBe(false);
            expect(filterUtils.matchesExtendedCriteria(true, false)).toBe(false);
        });

        it('should return true when no criteria are specified', () => {
            expect(filterUtils.matchesExtendedCriteria('anything')).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(123)).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(null)).toBe(true);
        });

        it('should combine multiple criteria correctly', () => {
            // All criteria must pass
            expect(filterUtils.matchesExtendedCriteria(
                'test123',
                'test123',
                undefined,
                '\\d+',
                true,
                'string'
            )).toBe(true);

            expect(filterUtils.matchesExtendedCriteria(
                'test123',
                'different',
                undefined,
                '\\d+',
                true,
                'string'
            )).toBe(false);

            expect(filterUtils.matchesExtendedCriteria(
                'test123',
                'test123',
                undefined,
                '\\d+',
                true,
                'number'
            )).toBe(false);
        });

        it('should handle edge cases', () => {
            // Empty string
            expect(filterUtils.matchesExtendedCriteria('', '')).toBe(true);
            expect(filterUtils.matchesExtendedCriteria('', 'test')).toBe(false);

            // Zero values
            expect(filterUtils.matchesExtendedCriteria(0, 0)).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(0, undefined, { min: 0, max: 10 })).toBe(true);

            // False boolean
            expect(filterUtils.matchesExtendedCriteria(false, false)).toBe(true);
            expect(filterUtils.matchesExtendedCriteria(false, undefined, undefined, undefined, undefined, 'boolean')).toBe(true);
        });
    });

    describe('complex scenarios', () => {
        it('should handle real-world suggestion filtering', () => {
            const suggestions = [
                { ...mockSuggestion, votes: 10, metadata: { priority: 'high' } },
                { ...mockSuggestion, votes: 5, metadata: { priority: 'medium' } },
                { ...mockSuggestion, votes: 15, metadata: { priority: 'high' } },
            ];

            // Filter by high priority
            const highPrioritySuggestions = suggestions.filter(s => 
                filterUtils.matchesExtendedCriteria(
                    filterUtils.getNestedValue(s, 'metadata.priority'),
                    'high'
                )
            );
            expect(highPrioritySuggestions).toHaveLength(2);

            // Filter by vote range
            const highVoteSuggestions = suggestions.filter(s => 
                filterUtils.matchesExtendedCriteria(
                    filterUtils.getNestedValue(s, 'votes'),
                    undefined,
                    { min: 10 }
                )
            );
            expect(highVoteSuggestions).toHaveLength(2);

            // Filter by vote pattern (numbers >= 10)
            const numericVoteSuggestions = suggestions.filter(s => 
                filterUtils.matchesExtendedCriteria(
                    filterUtils.getNestedValue(s, 'votes'),
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    'number'
                )
            );
            expect(numericVoteSuggestions).toHaveLength(3);
        });

        it('should handle nested array filtering', () => {
            const suggestionWithArray = {
                ...mockSuggestion,
                tags: ['ui', 'improvement', 'bug'],
                metadata: {
                    categories: ['frontend', 'backend'],
                    scores: [8, 9, 7],
                },
            };

            expect(filterUtils.getNestedValue(suggestionWithArray, 'tags.0')).toBe('ui');
            expect(filterUtils.getNestedValue(suggestionWithArray, 'tags.2')).toBe('bug');
            expect(filterUtils.getNestedValue(suggestionWithArray, 'metadata.categories.1')).toBe('backend');
            expect(filterUtils.getNestedValue(suggestionWithArray, 'metadata.scores.0')).toBe(8);

            // Filter by first tag
            expect(filterUtils.matchesExtendedCriteria(
                filterUtils.getNestedValue(suggestionWithArray, 'tags.0'),
                'ui'
            )).toBe(true);

            // Filter by score range
            expect(filterUtils.matchesExtendedCriteria(
                filterUtils.getNestedValue(suggestionWithArray, 'metadata.scores.0'),
                undefined,
                { min: 5, max: 10 }
            )).toBe(true);
        });
    });
});
