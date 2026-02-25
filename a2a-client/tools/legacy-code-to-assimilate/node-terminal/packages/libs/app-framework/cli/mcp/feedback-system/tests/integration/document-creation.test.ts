import * as fs from 'fs';
import { FeedbackPlugin } from '../../src/FeedbackPlugin';

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

describe('Document Creation Integration Tests', () => {
    let feedbackPlugin: FeedbackPlugin;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock file system operations
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
        (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
        (fs.readFileSync as jest.Mock).mockReturnValue('{"suggestions":[],"metadata":{"total":0}}');

        feedbackPlugin = new FeedbackPlugin();
    });

    describe('Document Creation Workflow', () => {
        it('should create different document types', async () => {
            // Initialize plugin
            feedbackPlugin.initialize();

            // Create report document
            const reportResult = feedbackPlugin.createDocument(
                'This is a test report content',
                'report',
                'Test Report',
                { description: 'A test report', tags: ['test', 'report'] }
            );
            expect(reportResult.success).toBe(true);
            expect(reportResult.filePath).toContain('work/reports');
            expect(reportResult.filePath).toContain('.md');

            // Create rule document
            const ruleResult = feedbackPlugin.createDocument(
                'This is a test rule content',
                'rule',
                'Test Rule'
            );
            expect(ruleResult.success).toBe(true);
            expect(ruleResult.filePath).toContain('.cursor/rules');
            expect(ruleResult.filePath).toContain('.md');

            // Create guide document
            const guideResult = feedbackPlugin.createDocument(
                'This is a test guide content',
                'guide',
                'Test Guide'
            );
            expect(guideResult.success).toBe(true);
            expect(guideResult.filePath).toContain('docs/guides');
            expect(guideResult.filePath).toContain('.md');

            // Create task document (JSON)
            const taskResult = feedbackPlugin.createDocument(
                'This is a test task content',
                'task',
                'Test Task',
                { taskId: 'T001', priority: 'high' }
            );
            expect(taskResult.success).toBe(true);
            expect(taskResult.filePath).toContain('feedback');
            expect(taskResult.filePath).toContain('.json');
        });

        it('should handle document creation errors gracefully', async () => {
            feedbackPlugin.initialize();

            // Test invalid content
            const invalidContentResult = feedbackPlugin.createDocument(
                null as any,
                'report',
                'Test Report'
            );
            expect(invalidContentResult.success).toBe(false);
            expect(invalidContentResult.error).toBe('Document content must be text');

            // Test file system error
            (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Write error');
            });

            const writeErrorResult = feedbackPlugin.createDocument(
                'Test content',
                'report',
                'Test Report'
            );
            expect(writeErrorResult.success).toBe(false);
            expect(writeErrorResult.error).toContain('Document creation error');
        });
    });
});
