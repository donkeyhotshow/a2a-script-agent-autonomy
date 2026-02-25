import { FeedbackTools } from '../../src/FeedbackTools';
import { feedbackPlugin } from '../../src/FeedbackPlugin';
import { FeedbackAnalytics } from '../../src/FeedbackAnalytics';
import { SuggestionManager } from '../../src/SuggestionManager'; // Import SuggestionManager for its static properties

const normalizePath = (p: string) => p.replace(/\\/g, '/').toLowerCase();

// Mock feedbackPlugin
jest.mock('../../src/FeedbackPlugin', () => ({
    feedbackPlugin: {
        addSuggestion: jest.fn(),
        createDocument: jest.fn(),
        getSuggestions: jest.fn(),
        getSuggestionsByNestedKeyExtended: jest.fn(),
        voteSuggestion: jest.fn(),
        updateSuggestionStatus: jest.fn(),
        getStatistics: jest.fn(),
        exportSuggestions: jest.fn(),
        getPluginInfo: jest.fn(),
    },
}));

// Mock FeedbackAnalytics
jest.mock('../../src/FeedbackAnalytics', () => ({
    FeedbackAnalytics: {
        groupSuggestions: jest.fn(),
        calculateAggregates: jest.fn(),
    },
}));

describe('FeedbackTools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset isInitialized to false for each test to ensure initialize is called when expected
        (feedbackPlugin.getPluginInfo as jest.Mock).mockReturnValue({
            isInitialized: false,
            maxSuggestionsPerUser: SuggestionManager.MAX_SUGGESTIONS_PER_USER,
            maxSuggestionLength: SuggestionManager.MAX_SUGGESTION_LENGTH,
        });

    });

    describe('addSuggestionTool', () => {
        it('should successfully add a suggestion with default values', async () => {
            const mockSuggestion = {
                id: 's1',
                suggestion: 'Test suggestion',
                user: 'anonymous',
                category: 'general',
                type: 'feedback',
                status: 'new',
                createdAt: new Date().toISOString()
            };
            (feedbackPlugin.addSuggestion as jest.Mock).mockReturnValue({ success: true, suggestion: mockSuggestion });

            const result = await FeedbackTools.addSuggestionTool({ suggestion: 'Test suggestion' });

            expect(feedbackPlugin.addSuggestion).toHaveBeenCalledWith(
                'Test suggestion',
                'anonymous',
                'general',
                'feedback'
            );
            expect(result).toEqual({
                success: true,
                message: 'Предложение успешно добавлено',
                data: mockSuggestion,
            });
        });

        it('should successfully add a suggestion with provided values', async () => {
            const mockSuggestion = {
                id: 's2',
                suggestion: 'Another suggestion',
                user: 'testuser',
                category: 'ui',
                type: 'idea',
                status: 'new',
                createdAt: new Date().toISOString()
            };
            (feedbackPlugin.addSuggestion as jest.Mock).mockReturnValue({ success: true, suggestion: mockSuggestion });

            const result = await FeedbackTools.addSuggestionTool({
                suggestion: 'Another suggestion',
                user: 'testuser',
                category: 'ui',
                type: 'idea',
            });

            expect(feedbackPlugin.addSuggestion).toHaveBeenCalledWith(
                'Another suggestion',
                'testuser',
                'ui',
                'idea'
            );
            expect(result).toEqual({
                success: true,
                message: 'Предложение успешно добавлено',
                data: mockSuggestion,
            });
        });

        it('should return an error if suggestion is missing', async () => {
            const result = await FeedbackTools.addSuggestionTool({ suggestion: '' });

            expect(feedbackPlugin.addSuggestion).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: 'Необходимо указать предложение',
            });
        });

        it('should return an error if feedbackPlugin.addSuggestion fails', async () => {
            const errorMessage = 'Failed to add suggestion';
            (feedbackPlugin.addSuggestion as jest.Mock).mockReturnValue({ success: false, error: errorMessage });

            const result = await FeedbackTools.addSuggestionTool({ suggestion: 'Bad suggestion' });

            expect(feedbackPlugin.addSuggestion).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                success: false,
                error: errorMessage,
            });
        });

        it('should handle unexpected errors during suggestion addition', async () => {
            const errorMessage = 'Unexpected error';
            (feedbackPlugin.addSuggestion as jest.Mock).mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const result = await FeedbackTools.addSuggestionTool({ suggestion: 'Error inducing suggestion' });

            expect(result).toEqual({
                success: false,
                error: `Ошибка добавления предложения: ${errorMessage}`,
            });
        });
    });

    describe('createDocumentTool', () => {
        it('should successfully create a document', async () => {
            const mockFilePath = normalizePath('c:/temp/test-doc.md');
            (feedbackPlugin.createDocument as jest.Mock).mockReturnValue({
                success: true,
                filePath: mockFilePath,
                message: 'Document created',
            });

            const result = await FeedbackTools.createDocumentTool({
                content: 'Doc Content',
                documentType: 'report',
                title: 'Report Title',
                metadata: { author: 'test' },
            });

            expect(feedbackPlugin.createDocument).toHaveBeenCalledWith(
                'Doc Content',
                'report',
                'Report Title',
                { author: 'test' }
            );
            expect(result).toEqual({
                success: true,
                message: 'Документ успешно создан',
                data: {
                    filePath: mockFilePath,
                    documentType: 'report',
                    title: 'Report Title',
                },
            });
        });

        it('should return an error if content, documentType or title is missing', async () => {
            let result = await FeedbackTools.createDocumentTool({ content: '', documentType: 'report', title: 'Title' });
            expect(result).toEqual({ success: false, error: 'Необходимо указать содержимое, тип документа и заголовок' });

            result = await FeedbackTools.createDocumentTool({ content: 'Content', documentType: '', title: 'Title' });
            expect(result).toEqual({ success: false, error: 'Необходимо указать содержимое, тип документа и заголовок' });

            result = await FeedbackTools.createDocumentTool({ content: 'Content', documentType: 'report', title: '' });
            expect(result).toEqual({ success: false, error: 'Необходимо указать содержимое, тип документа и заголовок' });

            expect(feedbackPlugin.createDocument).not.toHaveBeenCalled();
        });

        it('should return an error if feedbackPlugin.createDocument fails', async () => {
            const errorMessage = 'Failed to create document';
            (feedbackPlugin.createDocument as jest.Mock).mockReturnValue({ success: false, error: errorMessage });

            const result = await FeedbackTools.createDocumentTool({
                content: 'Content',
                documentType: 'report',
                title: 'Title',
            });

            expect(feedbackPlugin.createDocument).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                success: false,
                error: errorMessage,
            });
        });

        it('should handle unexpected errors during document creation', async () => {
            const errorMessage = 'Unexpected document error';
            (feedbackPlugin.createDocument as jest.Mock).mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const result = await FeedbackTools.createDocumentTool({
                content: 'Content',
                documentType: 'report',
                title: 'Title',
            });

            expect(result).toEqual({
                success: false,
                error: `Ошибка создания документа: ${errorMessage}`,
            });
        });
    });

    describe('getSuggestionsTool', () => {
        const mockSuggestions = [
            { id: 's1', suggestion: 'sug1', user: 'u1', category: 'general', status: 'new', priority: 'high', votes: 5, createdAt: '2025-01-01' },
            { id: 's2', suggestion: 'sug2', user: 'u2', category: 'ui', status: 'reviewing', priority: 'medium', votes: 3, createdAt: '2025-01-02' },
            { id: 's3', suggestion: 's3', user: 'u1', category: 'general', status: 'approved', priority: 'low', votes: 1, createdAt: '2025-01-03' },
            { id: 's4', suggestion: 's4', user: 'u3', category: 'performance', status: 'new', priority: 'high', votes: 7, createdAt: '2025-01-04' },
            { id: 's5', suggestion: 's5', user: 'u2', category: 'ui', status: 'rejected', priority: 'medium', votes: 2, createdAt: '2025-01-05' },
        ];

        it('should return suggestions with default limit and sort by date', async () => {
            (feedbackPlugin.getSuggestions as jest.Mock).mockReturnValue({
                success: true,
                suggestions: mockSuggestions,
                total: mockSuggestions.length,
            });

            const result = await FeedbackTools.getSuggestionsTool({});

            expect(feedbackPlugin.getSuggestions).toHaveBeenCalledWith({ sortBy: 'date' });
            expect(result.success).toBe(true);
            expect(result.message).toBe(`Найдено ${mockSuggestions.length} предложений`);
            expect(result.data.total).toBe(mockSuggestions.length);
            expect(result.data.shown).toBe(5); // Default limit is 20, but only 5 in mockSuggestions
            expect(result.data.suggestions.length).toBe(5);
            expect(result.data.suggestions[0].id).toBe('s1');
        });

        it('should return suggestions with specified filters and limit', async () => {
            const filteredSuggestions = [
                { id: 's1', suggestion: 'sug1', user: 'u1', category: 'general', status: 'new', priority: 'high', votes: 5, createdAt: '2025-01-01' },
                { id: 's4', suggestion: 's4', user: 'u3', category: 'performance', status: 'new', priority: 'high', votes: 7, createdAt: '2025-01-04' },
            ];
            (feedbackPlugin.getSuggestions as jest.Mock).mockReturnValue({
                success: true,
                suggestions: filteredSuggestions,
                total: filteredSuggestions.length,
            });

            const params = {
                status: 'new',
                category: 'general',
                limit: 1,
                sortBy: 'priority',
                user: 'u1',
            };
            const result = await FeedbackTools.getSuggestionsTool(params);

            expect(feedbackPlugin.getSuggestions).toHaveBeenCalledWith(expect.objectContaining({
                status: 'new',
                category: 'general',
                sortBy: 'priority',
                user: 'u1',
            }));
            expect(result.success).toBe(true);
            expect(result.data.total).toBe(2);
            expect(result.data.shown).toBe(1);
            expect(result.data.suggestions.length).toBe(1);
            expect(result.data.suggestions[0].id).toBe('s1'); // Assuming getSuggestions would return based on sortBy and limit
        });

        it('should handle empty suggestions result', async () => {
            (feedbackPlugin.getSuggestions as jest.Mock).mockReturnValue({
                success: true,
                suggestions: [],
                total: 0,
            });

            const result = await FeedbackTools.getSuggestionsTool({ category: 'nonexistent' });

            expect(result.success).toBe(true);
            expect(result.message).toBe(`Найдено 0 предложений`);
            expect(result.data.total).toBe(0);
            expect(result.data.shown).toBe(0);
            expect(result.data.suggestions.length).toBe(0);
        });

        it('should return an error if feedbackPlugin.getSuggestions fails', async () => {
            const errorMessage = 'Failed to retrieve suggestions';
            (feedbackPlugin.getSuggestions as jest.Mock).mockReturnValue({ success: false, error: errorMessage });

            const result = await FeedbackTools.getSuggestionsTool({});

            expect(result.success).toBe(false);
            expect(result.error).toBe(errorMessage);
        });

        it('should handle unexpected errors during suggestion retrieval', async () => {
            const errorMessage = 'Network error';
            (feedbackPlugin.getSuggestions as jest.Mock).mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const result = await FeedbackTools.getSuggestionsTool({});

            expect(result.success).toBe(false);
            expect(result.error).toBe(`Ошибка получения предложений: ${errorMessage}`);
        });
    });

    describe('getSuggestionsByNestedKeyTool', () => {
        const mockSuggestions = [
            { id: 's1', suggestion: 'sug1', metadata: { priority: 'high' }, category: 'general' },
            { id: 's2', suggestion: 'sug2', metadata: { priority: 'medium' }, category: 'ui' },
            { id: 's3', suggestion: 'sug3', metadata: { priority: 'high' }, category: 'general' },
        ];

        beforeEach(() => {
            (feedbackPlugin.getSuggestionsByNestedKeyExtended as jest.Mock).mockReturnValue({
                success: true,
                suggestions: mockSuggestions,
                total: mockSuggestions.length,
            });
            (FeedbackAnalytics.groupSuggestions as jest.Mock).mockImplementation((s, g) => [
                { group: 'high', count: 2, items: [mockSuggestions[0], mockSuggestions[2]] },
                { group: 'medium', count: 1, items: [mockSuggestions[1]] },
            ]);
            (FeedbackAnalytics.calculateAggregates as jest.Mock).mockReturnValue({ totalVotes: 10, averageVotes: 3.33 });
        });

        it('should return suggestions filtered by nested key', async () => {
            const params = { nestedKey: 'metadata.priority', nestedValue: 'high' };
            const result = await FeedbackTools.getSuggestionsByNestedKeyTool(params);

            expect(feedbackPlugin.getSuggestionsByNestedKeyExtended).toHaveBeenCalledWith(expect.objectContaining({
                nestedKey: 'metadata.priority',
                nestedValue: 'high',
            }));
            expect(result.success).toBe(true);
            expect(result.data.total).toBe(mockSuggestions.length);
            expect(result.data.suggestions.length).toBe(mockSuggestions.length);
            expect(result.data.filteredBy).toBe('nested_key_extended');
        });

        it('should apply pagination (offset and limit)', async () => {
            const params = { nestedKey: 'metadata.priority', limit: 1, offset: 1 };
            const result = await FeedbackTools.getSuggestionsByNestedKeyTool(params);

            expect(result.success).toBe(true);
            expect(result.data.shown).toBe(1);
            expect(result.data.suggestions.length).toBe(1);
            expect(result.data.suggestions[0].id).toBe('s2'); // Offset 1, limit 1
        });

        it('should return grouped data if groupBy and aggregate are true', async () => {
            const params = { nestedKey: 'category', groupBy: 'category', aggregate: true };
            const result = await FeedbackTools.getSuggestionsByNestedKeyTool(params);

            expect(FeedbackAnalytics.groupSuggestions).toHaveBeenCalledTimes(1);
            expect(FeedbackAnalytics.calculateAggregates).toHaveBeenCalledTimes(1);
            expect(result.data.grouped).toBeInstanceOf(Array);
            expect(result.data.aggregates).toEqual({ totalVotes: 10, averageVotes: 3.33 });
        });

        it('should return an error if nestedKey and nestedKeys are missing', async () => {
            const result = await FeedbackTools.getSuggestionsByNestedKeyTool({} as any);

            expect(result).toEqual({
                success: false,
                error: 'Необходимо указать хотя бы один ключ вложенности',
            });
            expect(feedbackPlugin.getSuggestionsByNestedKeyExtended).not.toHaveBeenCalled();
        });

        it('should return an error if feedbackPlugin.getSuggestionsByNestedKeyExtended fails', async () => {
            const errorMessage = 'Nested key retrieval failed';
            (feedbackPlugin.getSuggestionsByNestedKeyExtended as jest.Mock).mockReturnValue({ success: false, error: errorMessage });

            const result = await FeedbackTools.getSuggestionsByNestedKeyTool({ nestedKey: 'test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe(errorMessage);
        });

        it('should handle unexpected errors during nested key retrieval', async () => {
            const errorMessage = 'Unexpected nested key error';
            (feedbackPlugin.getSuggestionsByNestedKeyExtended as jest.Mock).mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const result = await FeedbackTools.getSuggestionsByNestedKeyTool({ nestedKey: 'test' });

            expect(result).toEqual({
                success: false,
                error: `Ошибка получения предложений по вложенному ключу: ${errorMessage}`,
            });
        });
    });

    describe('voteSuggestionTool', () => {
        it('should successfully vote for a suggestion', async () => {
            const mockSuggestion = { id: 's1', votes: 6 };
            (feedbackPlugin.voteSuggestion as jest.Mock).mockReturnValue({ success: true, suggestion: mockSuggestion });

            const result = await FeedbackTools.voteSuggestionTool({ suggestionId: 's1', user: 'testuser', vote: 1 });

            expect(feedbackPlugin.voteSuggestion).toHaveBeenCalledWith('s1', 'testuser', 1);
            expect(result).toEqual({
                success: true,
                message: 'Голос учтен',
                data: { id: 's1', votes: 6 },
            });
        });

        it('should return an error if suggestionId or user is missing', async () => {
            let result = await FeedbackTools.voteSuggestionTool({ suggestionId: '', user: 'testuser' });
            expect(result).toEqual({ success: false, error: 'Необходимо указать ID предложения и пользователя' });

            result = await FeedbackTools.voteSuggestionTool({ suggestionId: 's1', user: '' });
            expect(result).toEqual({ success: false, error: 'Необходимо указать ID предложения и пользователя' });

            expect(feedbackPlugin.voteSuggestion).not.toHaveBeenCalled();
        });

        it('should return an error if feedbackPlugin.voteSuggestion fails', async () => {
            const errorMessage = 'Voting failed';
            (feedbackPlugin.voteSuggestion as jest.Mock).mockReturnValue({ success: false, error: errorMessage });

            const result = await FeedbackTools.voteSuggestionTool({ suggestionId: 's1', user: 'testuser' });

            expect(result).toEqual({
                success: false,
                error: errorMessage,
            });
        });

        it('should handle unexpected errors during voting', async () => {
            const errorMessage = 'Unexpected voting error';
            (feedbackPlugin.voteSuggestion as jest.Mock).mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const result = await FeedbackTools.voteSuggestionTool({ suggestionId: 's1', user: 'testuser' });

            expect(result).toEqual({
                success: false,
                error: `Ошибка голосования: ${errorMessage}`,
            });
        });
    });

    describe('updateSuggestionStatusTool', () => {
        it('should successfully update suggestion status', async () => {
            const mockSuggestion = { id: 's1', status: 'approved', updatedBy: 'admin' };
            (feedbackPlugin.updateSuggestionStatus as jest.Mock).mockReturnValue({ success: true, suggestion: mockSuggestion });

            const result = await FeedbackTools.updateSuggestionStatusTool({ suggestionId: 's1', status: 'approved' });

            expect(feedbackPlugin.updateSuggestionStatus).toHaveBeenCalledWith('s1', 'approved', 'admin');
            expect(result).toEqual({
                success: true,
                message: 'Статус обновлен на: approved',
                data: { id: 's1', status: 'approved', updatedBy: 'admin' },
            });
        });

        it('should return an error if suggestionId or status is missing', async () => {
            let result = await FeedbackTools.updateSuggestionStatusTool({ suggestionId: '', status: 'approved' });
            expect(result).toEqual({ success: false, error: 'Необходимо указать ID предложения и статус' });

            result = await FeedbackTools.updateSuggestionStatusTool({ suggestionId: 's1', status: '' });
            expect(result).toEqual({ success: false, error: 'Необходимо указать ID предложения и статус' });

            expect(feedbackPlugin.updateSuggestionStatus).not.toHaveBeenCalled();
        });

        it('should return an error if feedbackPlugin.updateSuggestionStatus fails', async () => {
            const errorMessage = 'Status update failed';
            (feedbackPlugin.updateSuggestionStatus as jest.Mock).mockReturnValue({ success: false, error: errorMessage });

            const result = await FeedbackTools.updateSuggestionStatusTool({ suggestionId: 's1', status: 'rejected' });

            expect(result).toEqual({
                success: false,
                error: errorMessage,
            });
        });

        it('should handle unexpected errors during status update', async () => {
            const errorMessage = 'Unexpected status update error';
            (feedbackPlugin.updateSuggestionStatus as jest.Mock).mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const result = await FeedbackTools.updateSuggestionStatusTool({ suggestionId: 's1', status: 'approved' });

            expect(result).toEqual({
                success: false,
                error: `Ошибка обновления статуса: ${errorMessage}`,
            });
        });
    });

    describe('getStatisticsTool', () => {
        it('should successfully retrieve statistics', async () => {
            const mockStatistics = { totalSuggestions: 10, newSuggestions: 5 };
            (feedbackPlugin.getStatistics as jest.Mock).mockReturnValue({ success: true, statistics: mockStatistics });

            const result = await FeedbackTools.getStatisticsTool();

            expect(feedbackPlugin.getStatistics).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                success: true,
                message: 'Статистика получена',
                data: mockStatistics,
            });
        });

        it('should return an error if feedbackPlugin.getStatistics fails', async () => {
            const errorMessage = 'Failed to get statistics';
            (feedbackPlugin.getStatistics as jest.Mock).mockReturnValue({ success: false, error: errorMessage });

            const result = await FeedbackTools.getStatisticsTool();

            expect(result).toEqual({
                success: false,
                error: errorMessage,
            });
        });

        it('should handle unexpected errors during statistics retrieval', async () => {
            const errorMessage = 'Unexpected statistics error';
            (feedbackPlugin.getStatistics as jest.Mock).mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const result = await FeedbackTools.getStatisticsTool();

            expect(result).toEqual({
                success: false,
                error: `Ошибка получения статистики: ${errorMessage}`,
            });
        });
    });

    describe('exportSuggestionsTool', () => {
        it('should successfully export suggestions in JSON format by default', async () => {
            const mockExportData = JSON.stringify([{ id: 's1', suggestion: 'test' }]);
            const mockFilename = 'suggestions_export.json';
            (feedbackPlugin.exportSuggestions as jest.Mock).mockReturnValue({
                success: true,
                filename: mockFilename,
                data: mockExportData,
            });

            const result = await FeedbackTools.exportSuggestionsTool({});

            expect(feedbackPlugin.exportSuggestions).toHaveBeenCalledWith('json');
            expect(result).toEqual({
                success: true,
                message: 'Экспорт в формате json завершен',
                data: {
                    format: 'json',
                    filename: mockFilename,
                    data: mockExportData,
                    size: mockExportData.length,
                },
            });
        });

        it('should successfully export suggestions in specified format', async () => {
            const mockExportData = '<xml><suggestion id="s1"/></xml>';
            const mockFilename = 'suggestions_export.xml';
            (feedbackPlugin.exportSuggestions as jest.Mock).mockReturnValue({
                success: true,
                filename: mockFilename,
                data: mockExportData,
            });

            const result = await FeedbackTools.exportSuggestionsTool({ format: 'xml' });

            expect(feedbackPlugin.exportSuggestions).toHaveBeenCalledWith('xml');
            expect(result).toEqual({
                success: true,
                message: 'Экспорт в формате xml завершен',
                data: {
                    format: 'xml',
                    filename: mockFilename,
                    data: mockExportData,
                    size: mockExportData.length,
                },
            });
        });

        it('should return an error if feedbackPlugin.exportSuggestions fails', async () => {
            const errorMessage = 'Export failed';
            (feedbackPlugin.exportSuggestions as jest.Mock).mockReturnValue({ success: false, error: errorMessage });

            const result = await FeedbackTools.exportSuggestionsTool({});

            expect(result).toEqual({
                success: false,
                error: errorMessage,
            });
        });

        it('should handle unexpected errors during export', async () => {
            const errorMessage = 'Unexpected export error';
            (feedbackPlugin.exportSuggestions as jest.Mock).mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const result = await FeedbackTools.exportSuggestionsTool({});

            expect(result).toEqual({
                success: false,
                error: `Ошибка экспорта: ${errorMessage}`,
            });
        });
    });

    describe('getFeedbackInfoTool', () => {
        it('should return correct feedback plugin information', async () => {
            const mockPluginInfo = {
                name: 'project-feedback-system',
                version: '2.0.0',
                description: 'System for collecting suggestions and reports for projects',
                targetService: 'project-feedback',
                isInitialized: true,
                feedbackPath: normalizePath('c:/apps/libs/app-framework/cli/feedback'),
                reportsPath: normalizePath('c:/apps/libs/app-framework/cli/work/reports'),
                rulesPath: normalizePath('c:/apps/libs/app-framework/cli/.cursor/rules'),
                guidesPath: normalizePath('c:/apps/libs/app-framework/cli/docs/guides'),
                maxSuggestionsPerUser: 50,
                maxSuggestionLength: 5000,
            };
            (feedbackPlugin.getPluginInfo as jest.Mock).mockReturnValue(mockPluginInfo);

            const result = await FeedbackTools.getFeedbackInfoTool();

            expect(feedbackPlugin.getPluginInfo).toHaveBeenCalledTimes(1);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Информация о плагине обратной связи проектов');
            expect(result.data.pluginInfo).toEqual(mockPluginInfo);
            expect(result.data.categories).toBeInstanceOf(Array);
            expect(result.data.types).toBeInstanceOf(Array);
            expect(result.data.documentTypes).toBeInstanceOf(Array);
            expect(result.data.statuses).toBeInstanceOf(Array);
            expect(result.data.priorities).toBeInstanceOf(Array);
            expect(result.data.limits).toEqual({
                maxSuggestionLength: mockPluginInfo.maxSuggestionLength,
                maxSuggestionsPerUser: mockPluginInfo.maxSuggestionsPerUser,
            });
        });

        it('should handle unexpected errors during plugin info retrieval', async () => {
            const errorMessage = 'Plugin info error';
            (feedbackPlugin.getPluginInfo as jest.Mock).mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const result = await FeedbackTools.getFeedbackInfoTool();

            expect(result.success).toBe(false);
            expect(result.error).toBe(`Ошибка получения информации о плагине: ${errorMessage}`);
        });
    });
});
