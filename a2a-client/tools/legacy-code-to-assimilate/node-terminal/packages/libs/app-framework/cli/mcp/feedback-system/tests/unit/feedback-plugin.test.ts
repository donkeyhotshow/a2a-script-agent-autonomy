import * as fs from 'fs';
import * as path from 'path';
import { FeedbackPlugin } from '../../src/FeedbackPlugin';
import { SuggestionManager } from '../../src/SuggestionManager';

// Helper to normalize paths for Windows/Linux consistency in tests
const normalizePath = (p: string) => p.replace(/\\/g, '/').toLowerCase();

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
    existsSync: jest.fn(() => false),
}));

jest.mock('path', () => ({
    ...jest.requireActual('path'),
    resolve: jest.fn((p, ...args) => {
        const normalizePath = (p: string) => p.replace(/\\/g, '/').toLowerCase();
        // Mock the project root to a consistent value for testing
        if (p.includes('feedback-system/src')) {
            return normalizePath('c:/apps/libs/app-framework/cli'); // Mock projectRoot
        }
        return normalizePath(jest.requireActual('path').resolve(p, ...args));
    }),
    join: jest.fn((...args) => {
        const normalizePath = (p: string) => p.replace(/\\/g, '/').toLowerCase();
        return normalizePath(args.join('/'));
    }),
}));

// Mock SuggestionManager
jest.mock('../../src/SuggestionManager', () => {
    // Create a mock instance with mock methods
    const mockInstance = {
        addSuggestion: jest.fn(),
        getSuggestions: jest.fn(),
        getSuggestionsByNestedKeyExtended: jest.fn(),
        voteSuggestion: jest.fn(),
        updateSuggestionStatus: jest.fn(),
        getStatistics: jest.fn(),
        exportSuggestions: jest.fn(),
    };
    return {
        // Mock the constructor to return our mock instance
        SuggestionManager: jest.fn(() => mockInstance),
    };
});

describe('FeedbackPlugin', () => {
    let plugin: FeedbackPlugin;
    let mockSuggestionManagerInstance: jest.Mocked<any>;
    let mockRegisterProblem: jest.Mock;

    beforeAll(() => {
        // Mock static properties of SuggestionManager
        Object.defineProperty(SuggestionManager, 'MAX_SUGGESTIONS_PER_USER', { value: 50 });
        Object.defineProperty(SuggestionManager, 'MAX_SUGGESTION_LENGTH', { value: 5000 });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Get the mock function
        const debugSystem = require('../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs');
        mockRegisterProblem = debugSystem.debugSystem.registerProblem;
        mockRegisterProblem.mockClear();
        
        // Clear the mock for SuggestionManager constructor before each test
        (SuggestionManager as jest.MockedClass<typeof SuggestionManager>).mockClear();
        plugin = new FeedbackPlugin();
        // Get the mock instance returned by the factory
        mockSuggestionManagerInstance = (SuggestionManager as jest.MockedClass<typeof SuggestionManager>).mock.results[0].value;
        
        // Clear path mocks after constructor call, so they don't interfere with subsequent tests
        (path.resolve as jest.Mock).mockClear();
        (path.join as jest.Mock).mockClear();
    });

    // Tests for constructor
    describe('constructor', () => {
        it('should initialize isInitialized to false', () => {
            expect(plugin['isInitialized']).toBe(false);
        });

        it('should correctly set projectRoot path', () => {
            // The actual projectRoot is determined by the mock for path.resolve
            expect(plugin['projectRoot']).toBe(normalizePath('c:/apps/libs/app-framework/cli'));
        });

        it('should correctly set feedbackPath', () => {
            expect(plugin['feedbackPath']).toBe(normalizePath('c:/apps/libs/app-framework/cli/feedback'));
        });

        it('should correctly set reportsPath', () => {
            expect(plugin['reportsPath']).toBe(normalizePath('c:/apps/libs/app-framework/cli/work/reports'));
        });

        it('should correctly set rulesPath', () => {
            expect(plugin['rulesPath']).toBe(normalizePath('c:/apps/libs/app-framework/cli/.cursor/rules'));
        });

        it('should correctly set guidesPath', () => {
            expect(plugin['guidesPath']).toBe(normalizePath('c:/apps/libs/app-framework/cli/docs/guides'));
        });

        it('should initialize SuggestionManager with correct parameters', () => {
            expect(SuggestionManager).toHaveBeenCalledWith(
                normalizePath('c:/apps/libs/app-framework/cli/feedback'),
                normalizePath('c:/apps/libs/app-framework/cli'),
                FeedbackPlugin.PLUGIN_NAME,
                FeedbackPlugin.PLUGIN_VERSION,
                FeedbackPlugin.FEEDBACK_FILE,
                SuggestionManager.MAX_SUGGESTIONS_PER_USER,
                SuggestionManager.MAX_SUGGESTION_LENGTH
            );
        });
    });

    // Tests for initialize method
    describe('initialize', () => {
        it('should create necessary directories and plugin-meta.json on first call', () => {
            const expectedMetaPath = normalizePath('c:/apps/libs/app-framework/cli/feedback/plugin-meta.json');

            const result = plugin.initialize();

            expect(fs.mkdirSync).toHaveBeenCalledWith(plugin['feedbackPath'], { recursive: true });
            expect(fs.mkdirSync).toHaveBeenCalledWith(plugin['reportsPath'], { recursive: true });
            expect(fs.mkdirSync).toHaveBeenCalledWith(plugin['rulesPath'], { recursive: true });
            expect(fs.mkdirSync).toHaveBeenCalledWith(plugin['guidesPath'], { recursive: true });
            expect(fs.mkdirSync).toHaveBeenCalledTimes(4);

            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
            expect(fs.writeFileSync).toHaveBeenCalledWith(expectedMetaPath, expect.any(String), 'utf8');

            const writtenContent = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(writtenContent.pluginName).toBe(FeedbackPlugin.PLUGIN_NAME);
            expect(writtenContent.version).toBe(FeedbackPlugin.PLUGIN_VERSION);
            expect(normalizePath(writtenContent.directories.feedback)).toBe(normalizePath(plugin['feedbackPath']));

            expect(plugin['isInitialized']).toBe(true);
            expect(mockRegisterProblem).toHaveBeenCalledWith({
                category: 'USER_FEEDBACK',
                title: 'Feedback plugin initialized',
                description: `Plugin ${FeedbackPlugin.PLUGIN_NAME} successfully initialized for the project`,
                context: { pluginMeta: writtenContent },
            });
            expect(result).toEqual({
                success: true,
                message: 'Feedback plugin initialized for the project',
                data: writtenContent,
            });
        });

        it('should return already initialized message if called multiple times', () => {
            plugin.initialize(); // First call
            (fs.mkdirSync as jest.Mock).mockClear();
            (fs.writeFileSync as jest.Mock).mockClear();
            mockRegisterProblem.mockClear();

            const result = plugin.initialize(); // Second call

            expect(fs.mkdirSync).not.toHaveBeenCalled();
            expect(fs.writeFileSync).not.toHaveBeenCalled();
            expect(mockRegisterProblem).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: true, 
                message: 'Plugin already initialized' 
            });
        });

        it('should handle errors during directory creation', () => {
            const errorMessage = 'Failed to create directory';
            (fs.mkdirSync as jest.Mock).mockImplementationOnce(() => {
                throw new Error(errorMessage);
            });

            const result = plugin.initialize();

            expect(mockRegisterProblem).toHaveBeenCalledWith(expect.objectContaining({
                category: 'FILE_SYSTEM_ERROR',
                title: 'Feedback plugin initialization error',
                description: `Failed to initialize plugin: ${errorMessage}`,
                errorDetails: errorMessage,
            }));
            expect(result).toEqual({
                success: false,
                error: `Initialization error: ${errorMessage}`,
            });
            expect(plugin['isInitialized']).toBe(false);
        });

        it('should handle errors during plugin-meta.json writing', () => {
            const errorMessage = 'Failed to write file';
            (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
                throw new Error(errorMessage);
            });

            const result = plugin.initialize();

            expect(mockRegisterProblem).toHaveBeenCalledWith(expect.objectContaining({
                category: 'FILE_SYSTEM_ERROR',
                title: 'Feedback plugin initialization error',
                description: `Failed to initialize plugin: ${errorMessage}`,
                errorDetails: errorMessage,
            }));
            expect(result).toEqual({
                success: false,
                error: `Initialization error: ${errorMessage}`,
            });
            expect(plugin['isInitialized']).toBe(false);
        });
    });

    // Tests for createDocument method
    describe('createDocument', () => {
        const mockDate = new Date('2025-10-12T10:00:00.000Z');
        const originalDate = global.Date;

        beforeAll(() => {
            // Mock the Date constructor to return a fixed date
            const MockDate = class extends originalDate {
                constructor(dateString?: string) {
                    super(dateString || mockDate.toISOString());
                }
                toISOString() { return mockDate.toISOString(); }
                toLocaleString() { return mockDate.toLocaleString(); }
            } as typeof Date;
            global.Date = MockDate;
        });

        afterAll(() => {
            global.Date = originalDate;
        });

        it('should call initialize if the plugin is not initialized', () => {
            (plugin as any).isInitialized = false;
            const initializeSpy = jest.spyOn(plugin, 'initialize');
            initializeSpy.mockReturnValue({ success: true, message: 'initialized' });

            plugin.createDocument('test content', 'report', 'Test Title');

            expect(initializeSpy).toHaveBeenCalledTimes(1);
        });

        it('should return error if content is not a string', () => {
            (plugin as any).isInitialized = true;
            const result = plugin.createDocument(null as any, 'report', 'Test Title');
            expect(result).toEqual({
                success: false,
                error: 'Document content must be text'
            });
        });

        it('should create a markdown report document', () => {
            (plugin as any).isInitialized = true;
            const content = 'Report Content';
            const title = 'My Test Report';
            const metadata = { description: 'A description', tags: ['tag1', 'tag2'], notes: 'Some notes' };
            const expectedFilePath = normalizePath('c:/apps/libs/app-framework/cli/work/reports/My_Test_Report_2025-10-12T10-00-00-000Z.md');

            const result = plugin.createDocument(content, 'report', title, metadata);

            expect(fs.mkdirSync).toHaveBeenCalledWith(plugin['reportsPath'], { recursive: true });
            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
            expect(fs.writeFileSync).toHaveBeenCalledWith(expectedFilePath, expect.stringContaining(`# ${title}`), 'utf8');

            const writtenContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
            expect(writtenContent).toContain(`**Document Type:** report`);
            expect(writtenContent).toContain(`**Created:** ${mockDate.toLocaleString()}`);
            expect(writtenContent).toContain(`## Description\n\nA description`);
            expect(writtenContent).toContain(`**Tags:** tag1, tag2`);
            expect(writtenContent).toContain(`## Content\n\nReport Content`);
            expect(writtenContent).toContain(`## Notes\n\nSome notes`);
            expect(writtenContent).toContain(`*Automatically generated by ${FeedbackPlugin.PLUGIN_NAME} system*`);

            expect(mockRegisterProblem).toHaveBeenCalledWith(expect.objectContaining({
                category: 'DOCUMENT_GENERATION',
                title: 'Document created',
                description: `Document of type report created: ${title}`,
                context: {
                    documentType: 'report',
                    title: title,
                    filePath: expectedFilePath,
                    targetDir: plugin['reportsPath'],
                },
            }));
            expect(result).toEqual({
                success: true,
                filePath: expectedFilePath,
                message: `Document report successfully created: My_Test_Report_2025-10-12T10-00-00-000Z.md`,
            });
        });

        it('should create a markdown rule document', () => {
            (plugin as any).isInitialized = true;
            const content = 'Rule Content';
            const title = 'New Rule';
            const expectedFilePath = normalizePath('c:/apps/libs/app-framework/cli/.cursor/rules/New_Rule_2025-10-12T10-00-00-000Z.md');

            const result = plugin.createDocument(content, 'rule', title);

            expect(fs.mkdirSync).toHaveBeenCalledWith(plugin['rulesPath'], { recursive: true });
            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
            expect(fs.writeFileSync).toHaveBeenCalledWith(expectedFilePath, expect.stringContaining(`# ${title}`), 'utf8');

            const writtenContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
            expect(writtenContent).toContain(`**Document Type:** rule`);
            expect(result.success).toBe(true);
            expect(result.filePath).toBe(expectedFilePath);
        });

        it('should create a json task document', () => {
            (plugin as any).isInitialized = true;
            const content = 'Task Description';
            const title = 'Task 123';
            const metadata = { taskId: 'T123', priority: 'High' };
            const expectedFilePath = normalizePath('c:/apps/libs/app-framework/cli/feedback/Task_123_2025-10-12T10-00-00-000Z.json');

            const result = plugin.createDocument(content, 'task', title, metadata);

            expect(fs.mkdirSync).toHaveBeenCalledWith(plugin['feedbackPath'], { recursive: true });
            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
            expect(fs.writeFileSync).toHaveBeenCalledWith(expectedFilePath, expect.any(String), 'utf8');

            const writtenContent = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(writtenContent.title).toBe(title);
            expect(writtenContent.type).toBe('task');
            expect(writtenContent.content).toBe(content);
            expect(writtenContent.metadata.taskId).toBe('T123');
            expect(writtenContent.metadata.priority).toBe('High');
            expect(writtenContent.metadata.pluginName).toBe(FeedbackPlugin.PLUGIN_NAME);
            expect(normalizePath(writtenContent.metadata.projectPath)).toBe(normalizePath(plugin['projectRoot']));
            expect(result.success).toBe(true);
            expect(result.filePath).toBe(expectedFilePath);
        });

        it('should handle errors during document writing', () => {
            (plugin as any).isInitialized = true;
            const errorMessage = 'Failed to write document';
            (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
                throw new Error(errorMessage);
            });

            const result = plugin.createDocument('some content', 'report', 'Error Doc');

            expect(mockRegisterProblem).toHaveBeenCalledWith(expect.objectContaining({
                category: 'FILE_SYSTEM_ERROR',
                title: 'Document creation error',
                description: `Failed to create document: ${errorMessage}`,
                errorDetails: errorMessage,
            }));
            expect(result).toEqual({
                success: false,
                error: `Document creation error: ${errorMessage}`,
            });
        });
    });

    // Tests for getPluginInfo method
    describe('getPluginInfo', () => {
        it('should return correct plugin information', () => {
            // Initialize the plugin first to set isInitialized to true
            plugin.initialize(); 

            const info = plugin.getPluginInfo();

            expect(info.name).toBe(FeedbackPlugin.PLUGIN_NAME);
            expect(info.version).toBe(FeedbackPlugin.PLUGIN_VERSION);
            expect(info.description).toBe('System for collecting suggestions and reports for projects');
            expect(info.targetService).toBe('project-feedback');
            expect(info.isInitialized).toBe(true); // Should be true after initialize()
            expect(info.feedbackPath).toBe(plugin['feedbackPath']);
            expect(info.reportsPath).toBe(plugin['reportsPath']);
            expect(info.rulesPath).toBe(plugin['rulesPath']);
            expect(info.guidesPath).toBe(plugin['guidesPath']);
            expect(info.maxSuggestionsPerUser).toBe(FeedbackPlugin.MAX_SUGGESTIONS_PER_USER);
            expect(info.maxSuggestionLength).toBe(FeedbackPlugin.MAX_SUGGESTION_LENGTH);
        });

        it('should return isInitialized as false if not initialized', () => {
            // Ensure plugin is not initialized
            (plugin as any).isInitialized = false;
            const info = plugin.getPluginInfo();
            expect(info.isInitialized).toBe(false);
        });
    });

    // Test for exported instance
    describe('feedbackPlugin export', () => {
        it('should export an instance of FeedbackPlugin', () => {
            const { feedbackPlugin } = require('../../src/FeedbackPlugin');
            expect(feedbackPlugin).toBeInstanceOf(FeedbackPlugin);
        });
    });
});
