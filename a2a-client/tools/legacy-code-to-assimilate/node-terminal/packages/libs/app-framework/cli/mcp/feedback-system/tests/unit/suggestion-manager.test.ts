import * as fs from 'fs';
import * as path from 'path';
import { SuggestionManager } from '../../src/SuggestionManager';
import { SuggestionDataStore } from '../../src/SuggestionDataStore';
import { SuggestionFilterUtils } from '../../src/SuggestionFilterUtils';

// Mock the debugSystem
jest.mock('../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs', () => {
    const mockRegisterProblem = jest.fn();
    const DEBUG_CATEGORIES = {
        USER_FEEDBACK: 'USER_FEEDBACK',
        FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
        DOCUMENT_GENERATION: 'DOCUMENT_GENERATION',
    };
    return {
        debugSystem: {
            registerProblem: mockRegisterProblem,
            DEBUG_CATEGORIES,
        },
        DEBUG_CATEGORIES,
    };
});

// Mock fs and path modules
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

// Mock SuggestionDataStore
jest.mock('../../src/SuggestionDataStore', () => ({
    SuggestionDataStore: jest.fn().mockImplementation(() => ({
        loadSuggestions: jest.fn(),
        saveSuggestions: jest.fn(),
    })),
}));

// Mock SuggestionFilterUtils
jest.mock('../../src/SuggestionFilterUtils', () => ({
    SuggestionFilterUtils: jest.fn().mockImplementation(() => ({
        getNestedValue: jest.fn(),
        matchesExtendedCriteria: jest.fn(),
    })),
}));

describe('SuggestionManager', () => {
    let suggestionManager: SuggestionManager;
    let mockDataStore: jest.Mocked<SuggestionDataStore>;
    let mockFilterUtils: jest.Mocked<SuggestionFilterUtils>;
    let mockRegisterProblem: jest.Mock;

    const mockSuggestionsData = {
        suggestions: [
            {
                id: 's1',
                suggestion: 'Test suggestion 1',
                user: 'user1',
                category: 'general',
                type: 'feedback',
                status: 'new',
                priority: 'medium',
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-01-01T00:00:00.000Z',
                votes: 0,
                tags: [],
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
                priority: 'high',
                createdAt: '2025-01-02T00:00:00.000Z',
                updatedAt: '2025-01-02T00:00:00.000Z',
                votes: 5,
                tags: ['ui', 'improvement'],
                targetService: 'project-feedback',
                pluginName: 'project-feedback-system',
                projectPath: 'c:/test/project',
            },
        ],
        metadata: {
            total: 2,
            lastUpdated: '2025-01-02T00:00:00.000Z',
            version: '2.0.0',
            pluginName: 'project-feedback-system',
            targetService: 'project-feedback',
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Get the mock function
        const debugSystem = require('../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs');
        mockRegisterProblem = debugSystem.debugSystem.registerProblem;
        mockRegisterProblem.mockClear();
        
        // Reset static properties
        SuggestionManager.MAX_SUGGESTIONS_PER_USER = 50;
        SuggestionManager.MAX_SUGGESTION_LENGTH = 5000;

        // Create mock instances
        mockDataStore = {
            loadSuggestions: jest.fn().mockReturnValue(mockSuggestionsData),
            saveSuggestions: jest.fn().mockReturnValue(true),
        } as any;

        mockFilterUtils = {
            getNestedValue: jest.fn(),
            matchesExtendedCriteria: jest.fn(),
        } as any;

        // Mock constructor returns
        (SuggestionDataStore as jest.MockedClass<typeof SuggestionDataStore>).mockImplementation(() => mockDataStore);
        (SuggestionFilterUtils as jest.MockedClass<typeof SuggestionFilterUtils>).mockImplementation(() => mockFilterUtils);

        suggestionManager = new SuggestionManager(
            'c:/test/feedback',
            'c:/test/project',
            'test-plugin',
            '1.0.0',
            'suggestions.json',
            50,
            5000
        );
    });

    describe('constructor', () => {
        it('should initialize with correct parameters', () => {
            expect(SuggestionDataStore).toHaveBeenCalledWith(
                'c:/test/feedback',
                'suggestions.json',
                'test-plugin',
                '1.0.0'
            );
            expect(SuggestionFilterUtils).toHaveBeenCalled();
        });

        it('should set static properties correctly', () => {
            expect(SuggestionManager.MAX_SUGGESTIONS_PER_USER).toBe(50);
            expect(SuggestionManager.MAX_SUGGESTION_LENGTH).toBe(5000);
        });
    });

    describe('addSuggestion', () => {
        it('should successfully add a valid suggestion', () => {
            const result = suggestionManager.addSuggestion(
                'New suggestion',
                'testuser',
                'general',
                'feedback'
            );

            expect(result.success).toBe(true);
            expect(result.suggestion).toBeDefined();
            expect(result.suggestion.suggestion).toBe('New suggestion');
            expect(result.suggestion.user).toBe('testuser');
            expect(result.suggestion.category).toBe('general');
            expect(result.suggestion.type).toBe('feedback');
            expect(result.suggestion.status).toBe('new');
            expect(result.suggestion.priority).toBe('medium');
            expect(result.suggestion.id).toBeDefined();
            expect(result.suggestion.createdAt).toBeDefined();
            expect(result.suggestion.updatedAt).toBeDefined();

            expect(mockDataStore.loadSuggestions).toHaveBeenCalled();
            expect(mockDataStore.saveSuggestions).toHaveBeenCalled();
            expect(mockRegisterProblem).toHaveBeenCalledWith({
                category: 'USER_FEEDBACK',
                title: 'New project suggestion',
                description: 'Suggestion added by user testuser for project',
                context: {
                    suggestionId: result.suggestion.id,
                    category: 'general',
                    type: 'feedback',
                    user: 'testuser',
                    targetService: 'project-feedback',
                },
            });
        });

        it('should use default values when parameters are not provided', () => {
            const result = suggestionManager.addSuggestion('Test suggestion');

            expect(result.success).toBe(true);
            expect(result.suggestion.user).toBe('anonymous');
            expect(result.suggestion.category).toBe('general');
            expect(result.suggestion.type).toBe('feedback');
        });

        it('should return error for empty suggestion', () => {
            const result = suggestionManager.addSuggestion('');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Suggestion must be text');
            expect(mockDataStore.saveSuggestions).not.toHaveBeenCalled();
        });

        it('should return error for non-string suggestion', () => {
            const result = suggestionManager.addSuggestion(null as any);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Suggestion must be text');
        });

        it('should return error for suggestion exceeding length limit', () => {
            const longSuggestion = 'a'.repeat(SuggestionManager.MAX_SUGGESTION_LENGTH + 1);
            const result = suggestionManager.addSuggestion(longSuggestion);

            expect(result.success).toBe(false);
            expect(result.error).toBe(`Suggestion too long (maximum ${SuggestionManager.MAX_SUGGESTION_LENGTH} characters)`);
        });

        it('should return error when user exceeds suggestion limit', () => {
            // Mock user with max suggestions
            const userSuggestions = Array(SuggestionManager.MAX_SUGGESTIONS_PER_USER).fill({
                user: 'testuser',
                suggestion: 'existing suggestion',
            });
            mockDataStore.loadSuggestions.mockReturnValue({
                suggestions: userSuggestions,
                metadata: { total: userSuggestions.length },
            });

            const result = suggestionManager.addSuggestion('New suggestion', 'testuser');

            expect(result.success).toBe(false);
            expect(result.error).toBe(`Suggestion limit (${SuggestionManager.MAX_SUGGESTIONS_PER_USER}) reached for user testuser`);
        });

        it('should handle save failure', () => {
            mockDataStore.saveSuggestions.mockReturnValue(false);

            const result = suggestionManager.addSuggestion('Test suggestion');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to save suggestion');
        });
    });

    describe('getSuggestions', () => {
        it('should return all suggestions when no filters applied', () => {
            const result = suggestionManager.getSuggestions();

            expect(result.success).toBe(true);
            expect(result.suggestions.length).toBeGreaterThanOrEqual(2);
            expect(result.total).toBeGreaterThanOrEqual(2);
            expect(result.metadata).toBeDefined();
        });

        it('should filter by category', () => {
            const result = suggestionManager.getSuggestions({ category: 'ui' });

            expect(result.success).toBe(true);
            expect(result.suggestions).toHaveLength(1);
            expect(result.suggestions[0].category).toBe('ui');
        });

        it('should filter by status', () => {
            const result = suggestionManager.getSuggestions({ status: 'new' });

            expect(result.success).toBe(true);
            expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
            expect(result.suggestions[0].status).toBe('new');
        });

        it('should filter by user', () => {
            const result = suggestionManager.getSuggestions({ user: 'user1' });

            expect(result.success).toBe(true);
            expect(result.suggestions).toHaveLength(1);
            expect(result.suggestions[0].user).toBe('user1');
        });

        it('should filter by priority', () => {
            const result = suggestionManager.getSuggestions({ priority: 'high' });

            expect(result.success).toBe(true);
            expect(result.suggestions).toHaveLength(1);
            expect(result.suggestions[0].priority).toBe('high');
        });

        it('should filter by type', () => {
            const result = suggestionManager.getSuggestions({ type: 'idea' });

            expect(result.success).toBe(true);
            expect(result.suggestions).toHaveLength(1);
            expect(result.suggestions[0].type).toBe('idea');
        });

        it('should filter by nested key', () => {
            mockFilterUtils.getNestedValue.mockReturnValue('test-value');
            const result = suggestionManager.getSuggestions({
                nestedKey: 'metadata.priority',
                nestedValue: 'high',
            });

            expect(mockFilterUtils.getNestedValue).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should sort by votes', () => {
            const result = suggestionManager.getSuggestions({ sortBy: 'votes' });

            expect(result.success).toBe(true);
            expect(result.suggestions[0].votes).toBeGreaterThanOrEqual(result.suggestions[1].votes);
        });

        it('should sort by date (default)', () => {
            const result = suggestionManager.getSuggestions({ sortBy: 'date' });

            expect(result.success).toBe(true);
            // Should be sorted by createdAt descending
            const dates = result.suggestions.map(s => new Date(s.createdAt).getTime());
            expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
        });
    });

    describe('getSuggestionsByNestedKey', () => {
        it('should return error when nestedKey is not provided', () => {
            const result = suggestionManager.getSuggestionsByNestedKey('');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Nested key must be specified');
        });

        it('should filter by nested key with value', () => {
            mockFilterUtils.getNestedValue.mockReturnValue('test-value');
            const result = suggestionManager.getSuggestionsByNestedKey('metadata.priority', 'high');

            expect(mockFilterUtils.getNestedValue).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.metadata.nestedKey).toBe('metadata.priority');
            expect(result.metadata.nestedValue).toBe('high');
            expect(result.metadata.filteredBy).toBe('nested_key');
        });

        it('should filter by nested key without value (existence check)', () => {
            mockFilterUtils.getNestedValue.mockReturnValue('some-value');
            const result = suggestionManager.getSuggestionsByNestedKey('metadata.priority');

            expect(result.success).toBe(true);
            expect(result.metadata.nestedKey).toBe('metadata.priority');
            expect(result.metadata.nestedValue).toBeUndefined();
        });

        it('should apply additional filters', () => {
            mockFilterUtils.getNestedValue.mockReturnValue('test-value');
            const result = suggestionManager.getSuggestionsByNestedKey(
                'metadata.priority',
                'high',
                { category: 'ui', status: 'reviewing' }
            );

            expect(result.success).toBe(true);
            expect(result.suggestions.every(s => s.category === 'ui')).toBe(true);
            expect(result.suggestions.every(s => s.status === 'reviewing')).toBe(true);
        });
    });

    describe('getSuggestionsByNestedKeyExtended', () => {
        it('should return error when no nested keys provided', () => {
            const result = suggestionManager.getSuggestionsByNestedKeyExtended({});

            expect(result.success).toBe(false);
            expect(result.error).toBe('At least one nested key must be specified');
        });

        it('should filter by single nested key', () => {
            mockFilterUtils.getNestedValue.mockReturnValue('test-value');
            mockFilterUtils.matchesExtendedCriteria.mockReturnValue(true);

            const result = suggestionManager.getSuggestionsByNestedKeyExtended({
                nestedKey: 'metadata.priority',
                nestedValue: 'high',
            });

            expect(mockFilterUtils.getNestedValue).toHaveBeenCalled();
            expect(mockFilterUtils.matchesExtendedCriteria).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.metadata.filteredBy).toBe('nested_key_extended');
        });

        it('should filter by multiple nested keys (OR logic)', () => {
            mockFilterUtils.getNestedValue.mockReturnValue('test-value');
            mockFilterUtils.matchesExtendedCriteria.mockReturnValue(true);

            const result = suggestionManager.getSuggestionsByNestedKeyExtended({
                nestedKeys: ['metadata.priority', 'metadata.category'],
                nestedValue: 'high',
            });

            expect(mockFilterUtils.matchesExtendedCriteria).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should apply extended criteria (range, pattern, type, exists)', () => {
            mockFilterUtils.getNestedValue.mockReturnValue(5);
            mockFilterUtils.matchesExtendedCriteria.mockReturnValue(true);

            const result = suggestionManager.getSuggestionsByNestedKeyExtended({
                nestedKey: 'votes',
                nestedRange: { min: 1, max: 10 },
                nestedPattern: '\\d+',
                nestedType: 'number',
                nestedExists: true,
            });

            expect(mockFilterUtils.matchesExtendedCriteria).toHaveBeenCalledWith(
                5,
                undefined,
                { min: 1, max: 10 },
                '\\d+',
                true,
                'number'
            );
            expect(result.success).toBe(true);
        });

        it('should apply additional filters', () => {
            mockFilterUtils.getNestedValue.mockReturnValue('test-value');
            mockFilterUtils.matchesExtendedCriteria.mockReturnValue(true);

            const result = suggestionManager.getSuggestionsByNestedKeyExtended({
                nestedKey: 'metadata.priority',
                category: 'ui',
                status: 'reviewing',
                user: 'user2',
            });

            expect(result.success).toBe(true);
            expect(result.suggestions.every(s => s.category === 'ui')).toBe(true);
            expect(result.suggestions.every(s => s.status === 'reviewing')).toBe(true);
            expect(result.suggestions.every(s => s.user === 'user2')).toBe(true);
        });
    });

    describe('voteSuggestion', () => {
        it('should successfully vote for existing suggestion', () => {
            const result = suggestionManager.voteSuggestion('s1', 'voter1', 1);

            expect(result.success).toBe(true);
            expect(result.suggestion.votes).toBe(1);
            expect(result.suggestion.updatedAt).toBeDefined();
            expect(mockDataStore.saveSuggestions).toHaveBeenCalled();
        });

        it('should use default vote value of 1', () => {
            const result = suggestionManager.voteSuggestion('s1', 'voter1');

            expect(result.success).toBe(true);
            expect(result.suggestion.votes).toBeGreaterThanOrEqual(1);
        });

        it('should return error for non-existent suggestion', () => {
            const result = suggestionManager.voteSuggestion('nonexistent', 'voter1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Suggestion not found');
            expect(mockDataStore.saveSuggestions).not.toHaveBeenCalled();
        });

        it('should handle save failure', () => {
            mockDataStore.saveSuggestions.mockReturnValue(false);

            const result = suggestionManager.voteSuggestion('s1', 'voter1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to save vote');
        });
    });

    describe('updateSuggestionStatus', () => {
        it('should successfully update status for existing suggestion', () => {
            const result = suggestionManager.updateSuggestionStatus('s1', 'approved', 'admin');

            expect(result.success).toBe(true);
            expect(result.suggestion.status).toBe('approved');
            expect(result.suggestion.updatedBy).toBe('admin');
            expect(result.suggestion.updatedAt).toBeDefined();
            expect(mockDataStore.saveSuggestions).toHaveBeenCalled();
        });

        it('should use default admin user', () => {
            const result = suggestionManager.updateSuggestionStatus('s1', 'approved');

            expect(result.success).toBe(true);
            expect(result.suggestion.updatedBy).toBe('admin');
        });

        it('should return error for non-existent suggestion', () => {
            const result = suggestionManager.updateSuggestionStatus('nonexistent', 'approved');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Suggestion not found');
        });

        it('should return error for invalid status', () => {
            const result = suggestionManager.updateSuggestionStatus('s1', 'invalid-status');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid status');
            expect(result.error).toContain('new, reviewing, approved, rejected, implemented, in-progress');
        });

        it('should handle save failure', () => {
            mockDataStore.saveSuggestions.mockReturnValue(false);

            const result = suggestionManager.updateSuggestionStatus('s1', 'approved');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to update status');
        });
    });

    describe('exportSuggestions', () => {
        it('should export suggestions in JSON format', () => {
            const result = suggestionManager.exportSuggestions('json');

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.filename).toContain('project-suggestions_');
            expect(result.filename).toContain('.json');

            const exportedData = JSON.parse(result.data!);
            expect(exportedData.suggestions.length).toBeGreaterThanOrEqual(2);
            expect(exportedData.metadata).toBeDefined();
        });

        it('should export suggestions in CSV format', () => {
            const result = suggestionManager.exportSuggestions('csv');

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.filename).toContain('project-suggestions_');
            expect(result.filename).toContain('.csv');

            const csvLines = result.data!.split('\n');
            expect(csvLines[0]).toContain('ID,Suggestion,User,Category,Type,Status,Priority,Votes,Created At,Project');
            expect(csvLines.length).toBeGreaterThanOrEqual(3); // Header + data rows
        });

        it('should use JSON format by default', () => {
            const result = suggestionManager.exportSuggestions();

            expect(result.success).toBe(true);
            expect(result.filename).toContain('.json');
        });

        it('should return error for unsupported format', () => {
            const result = suggestionManager.exportSuggestions('xml');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unsupported export format');
        });
    });

    describe('getStatistics', () => {
        it('should return comprehensive statistics', () => {
            const result = suggestionManager.getStatistics();

            expect(result.success).toBe(true);
            expect(result.statistics).toBeDefined();
            expect(result.statistics.total).toBeGreaterThanOrEqual(2);
            expect(result.statistics.byStatus).toBeDefined();
            expect(result.statistics.byCategory).toBeDefined();
            expect(result.statistics.byType).toBeDefined();
            expect(result.statistics.byPriority).toBeDefined();
            expect(result.statistics.topVoted).toBeDefined();
            expect(result.statistics.recent).toBeDefined();
            expect(result.statistics.pluginInfo).toBeDefined();
            expect(result.statistics.directories).toBeDefined();
        });

        it('should calculate correct counts by status', () => {
            const result = suggestionManager.getStatistics();

            expect(result.statistics.byStatus.new).toBeGreaterThanOrEqual(1);
            expect(result.statistics.byStatus.reviewing).toBe(1);
        });

        it('should calculate correct counts by category', () => {
            const result = suggestionManager.getStatistics();

            expect(result.statistics.byCategory.general).toBeGreaterThanOrEqual(1);
            expect(result.statistics.byCategory.ui).toBe(1);
        });

        it('should return top voted suggestions', () => {
            const result = suggestionManager.getStatistics();

            expect(result.statistics.topVoted.length).toBeGreaterThanOrEqual(2);
            expect(result.statistics.topVoted[0].votes).toBeGreaterThanOrEqual(result.statistics.topVoted[1].votes);
        });

        it('should return recent suggestions', () => {
            const result = suggestionManager.getStatistics();

            expect(result.statistics.recent.length).toBeGreaterThanOrEqual(2);
            // Should be sorted by creation date descending
            const dates = result.statistics.recent.map(s => new Date(s.createdAt).getTime());
            expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
        });
    });

    describe('loadSuggestions and saveSuggestions', () => {
        it('should delegate loadSuggestions to dataStore', () => {
            const result = suggestionManager.loadSuggestions();

            expect(mockDataStore.loadSuggestions).toHaveBeenCalled();
            expect(result).toEqual(mockSuggestionsData);
        });

        it('should delegate saveSuggestions to dataStore', () => {
            const result = suggestionManager.saveSuggestions(mockSuggestionsData);

            expect(mockDataStore.saveSuggestions).toHaveBeenCalledWith(mockSuggestionsData);
            expect(result).toBe(true);
        });
    });
});
