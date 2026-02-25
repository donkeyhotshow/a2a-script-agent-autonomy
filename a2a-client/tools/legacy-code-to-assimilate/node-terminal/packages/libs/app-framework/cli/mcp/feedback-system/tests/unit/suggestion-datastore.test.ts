import * as fs from 'fs';
import * as path from 'path';
import { SuggestionDataStore } from '../../src/SuggestionDataStore';

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
    readFileSync: jest.fn(),
    writeFileSync: jest.fn().mockImplementation(() => {}), // Mock to not throw error
    existsSync: jest.fn(),
}));

jest.mock('path', () => ({
    ...jest.requireActual('path'),
    join: jest.fn((...args) => args.join('/')),
}));

describe('SuggestionDataStore', () => {
    let dataStore: SuggestionDataStore;
    let mockFilePath: string;
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
        ],
        metadata: {
            total: 1,
            lastUpdated: '2025-01-01T00:00:00.000Z',
            version: '2.0.0',
            pluginName: 'project-feedback-system',
            targetService: 'project-feedback',
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockFilePath = 'c:/test/feedback/suggestions.json';
        
        // Get the mock function
        const debugSystem = require('../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs');
        mockRegisterProblem = debugSystem.debugSystem.registerProblem;
        mockRegisterProblem.mockClear();
        
        dataStore = new SuggestionDataStore(
            'c:/test/feedback',
            'suggestions.json',
            'test-plugin',
            '1.0.0'
        );

        // Mock path.join to return our mock file path
        (path.join as jest.Mock).mockReturnValue(mockFilePath);
    });

    describe('constructor', () => {
        it('should initialize with correct parameters', () => {
            expect(dataStore['feedbackPath']).toBe('c:/test/feedback');
            expect(dataStore['feedbackFile']).toBe('suggestions.json');
            expect(dataStore['pluginName']).toBe('test-plugin');
            expect(dataStore['pluginVersion']).toBe('1.0.0');
        });
    });

    describe('loadSuggestions', () => {
        it('should load suggestions from existing file', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockSuggestionsData));

            const result = dataStore.loadSuggestions();

            expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
            expect(fs.readFileSync).toHaveBeenCalledWith(mockFilePath, 'utf8');
            expect(result).toEqual(mockSuggestionsData);
        });

        it('should return default data when file does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = dataStore.loadSuggestions();

            expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
            expect(fs.readFileSync).not.toHaveBeenCalled();
            expect(result).toEqual({
                suggestions: [],
                metadata: {
                    total: 0,
                    lastUpdated: expect.any(String),
                    version: '1.0.0',
                    pluginName: 'test-plugin',
                    targetService: 'project-feedback',
                },
            });
        });

        it('should return default data when file read fails', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('File read error');
            });

            const result = dataStore.loadSuggestions();

            expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
            expect(fs.readFileSync).toHaveBeenCalledWith(mockFilePath, 'utf8');
            expect(mockRegisterProblem).toHaveBeenCalledWith({
                category: 'FILE_SYSTEM_ERROR',
                title: 'Error loading suggestions',
                description: `Failed to load suggestions file: ${mockFilePath}`,
                errorDetails: 'File read error',
                context: { filePath: mockFilePath },
            });
            expect(result).toEqual({
                suggestions: [],
                metadata: {
                    total: 0,
                    lastUpdated: expect.any(String),
                    version: '1.0.0',
                    pluginName: 'test-plugin',
                    targetService: 'project-feedback',
                },
            });
        });

        it('should return default data when JSON parsing fails', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

            const result = dataStore.loadSuggestions();

            expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
            expect(fs.readFileSync).toHaveBeenCalledWith(mockFilePath, 'utf8');
            expect(mockRegisterProblem).toHaveBeenCalledWith({
                category: 'FILE_SYSTEM_ERROR',
                title: 'Error loading suggestions',
                description: `Failed to load suggestions file: ${mockFilePath}`,
                errorDetails: expect.any(String),
                context: { filePath: mockFilePath },
            });
            expect(result).toEqual({
                suggestions: [],
                metadata: {
                    total: 0,
                    lastUpdated: expect.any(String),
                    version: '1.0.0',
                    pluginName: 'test-plugin',
                    targetService: 'project-feedback',
                },
            });
        });
    });

    describe('saveSuggestions', () => {
        it('should successfully save suggestions', () => {
            const result = dataStore.saveSuggestions(mockSuggestionsData);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                mockFilePath,
                expect.stringContaining('"suggestions"'),
                'utf8'
            );
            expect(result).toBe(true);

            // Verify the saved data structure
            const savedData = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(savedData.suggestions).toEqual(mockSuggestionsData.suggestions);
            expect(savedData.metadata.total).toBe(mockSuggestionsData.suggestions.length);
            expect(savedData.metadata.lastUpdated).toBeDefined();
            expect(savedData.metadata.pluginName).toBe('test-plugin');
            expect(savedData.metadata.targetService).toBe('project-feedback');
        });

        it('should update metadata when saving', () => {
            const testData = {
                ...mockSuggestionsData,
                suggestions: [...mockSuggestionsData.suggestions, {
                    id: 's2',
                    suggestion: 'Test suggestion 2',
                    user: 'user2',
                    category: 'ui',
                    type: 'idea',
                    status: 'new',
                    priority: 'high',
                    createdAt: '2025-01-02T00:00:00.000Z',
                    updatedAt: '2025-01-02T00:00:00.000Z',
                    votes: 0,
                    tags: [],
                    targetService: 'project-feedback',
                    pluginName: 'project-feedback-system',
                    projectPath: 'c:/test/project',
                }],
            };

            const result = dataStore.saveSuggestions(testData);

            expect(result).toBe(true);
            const savedData = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(savedData.metadata.total).toBe(2);
            expect(savedData.metadata.lastUpdated).toBeDefined();
            expect(savedData.metadata.pluginName).toBe('test-plugin');
            expect(savedData.metadata.targetService).toBe('project-feedback');
        });

        it('should handle save failure', () => {
            (fs.writeFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('Write error');
            });

            const result = dataStore.saveSuggestions(mockSuggestionsData);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                mockFilePath,
                expect.any(String),
                'utf8'
            );
            expect(mockRegisterProblem).toHaveBeenCalledWith({
                category: 'FILE_SYSTEM_ERROR',
                title: 'Error saving suggestions',
                description: `Failed to save suggestions: ${mockFilePath}`,
                errorDetails: 'Write error',
                context: { filePath: mockFilePath },
            });
            expect(result).toBe(false);
        });

        it('should preserve existing metadata fields', () => {
            // Mock fs.writeFileSync to not throw error
            (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
            
            const testData = {
                ...mockSuggestionsData,
                metadata: {
                    ...mockSuggestionsData.metadata,
                    customField: 'custom-value',
                    anotherField: 123,
                },
            };

            const result = dataStore.saveSuggestions(testData);

            expect(result).toBe(true);
            const savedData = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(savedData.metadata.customField).toBe('custom-value');
            expect(savedData.metadata.anotherField).toBe(123);
            expect(savedData.metadata.pluginName).toBe('test-plugin');
            expect(savedData.metadata.targetService).toBe('project-feedback');
        });
    });

    describe('file path handling', () => {
        it('should use correct file path', () => {
            dataStore.loadSuggestions();

            expect(path.join).toHaveBeenCalledWith('c:/test/feedback', 'suggestions.json');
            expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
        });

        it('should handle different file names', () => {
            const customDataStore = new SuggestionDataStore(
                'c:/test/feedback',
                'custom-suggestions.json',
                'test-plugin',
                '1.0.0'
            );

            customDataStore.loadSuggestions();

            expect(path.join).toHaveBeenCalledWith('c:/test/feedback', 'custom-suggestions.json');
        });

        it('should handle different feedback paths', () => {
            const customDataStore = new SuggestionDataStore(
                'c:/different/path',
                'suggestions.json',
                'test-plugin',
                '1.0.0'
            );

            customDataStore.loadSuggestions();

            expect(path.join).toHaveBeenCalledWith('c:/different/path', 'suggestions.json');
        });
    });

    describe('error handling', () => {
        it('should handle multiple consecutive errors gracefully', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('Persistent read error');
            });

            // Multiple calls should all return default data
            const result1 = dataStore.loadSuggestions();
            const result2 = dataStore.loadSuggestions();

            expect(result1.metadata.lastUpdated).toBeDefined();
            expect(result2.metadata.lastUpdated).toBeDefined();
            expect(mockRegisterProblem).toHaveBeenCalledTimes(2);
        });

        it('should handle save errors after successful loads', () => {
            // First load successfully
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockSuggestionsData));
            const loadResult = dataStore.loadSuggestions();
            expect(loadResult).toEqual(mockSuggestionsData);

            // Then fail to save
            (fs.writeFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('Save error');
            });
            const saveResult = dataStore.saveSuggestions(mockSuggestionsData);
            expect(saveResult).toBe(false);
        });
    });
});
