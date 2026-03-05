/**
 * AIAction Transform Service Unit Tests
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {AIActionTransformService, getAIActionTransformService, type AIActionContext} from '../../src/services/ai-action-transform.service.js';
import * as transformModule from '../../src/transform/index.js';

// Mock the transform module
vi.mock('../../src/transform/index.js', () => ({
    runTransformPipeline: vi.fn().mockResolvedValue({
        success: true,
        output: {
            $llm: {
                step: 'plan',
                message: 'Test message',
                execute: {test: {}},
                completed: false
            }
        },
        files: {'request.md': '# Request'}
    }),
    loadTransformPipeline: vi.fn().mockResolvedValue({
        name: 'test-pipeline',
        operations: []
    }),
}));

// Mock the LLM client module
vi.mock('../../src/services/llm-client.service.js', () => ({
    getLLMClient: vi.fn().mockReturnValue({
        chat: vi.fn().mockResolvedValue({
            message: {role: 'assistant', content: '{"step": "plan", "message": "Test", "execute": {"test": {}}, "completed": false}'},
            model: 'test-model',
            done: true,
            promiseId: 'test-promise-id'
        }),
        checkHealth: vi.fn().mockResolvedValue(true),
        listModels: vi.fn().mockResolvedValue(['test-model'])
    }),
    LLMClient: vi.fn().mockImplementation(() => ({
        chat: vi.fn().mockResolvedValue({
            message: {role: 'assistant', content: '{"step": "plan", "message": "Test", "execute": {"test": {}}, "completed": false}'},
            model: 'test-model',
            done: true,
            promiseId: 'test-promise-id'
        }),
        checkHealth: vi.fn().mockResolvedValue(true),
        listModels: vi.fn().mockResolvedValue(['test-model'])
    })),
    getDefaultModel: vi.fn().mockReturnValue('test-model'),
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fs
vi.mock('fs/promises', async () => {
    const original = await vi.importActual('fs/promises');
    return {
        ...original,
        default: {
            ...(original as any),
            writeFile: vi.fn().mockResolvedValue(undefined),
        },
        writeFile: vi.fn().mockResolvedValue(undefined),
    };
});

describe('AIActionTransformService', () => {
    let service: AIActionTransformService;
    let mockRunTransformPipeline: vi.Mock;
    let mockLoadTransformPipeline: vi.Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockRunTransformPipeline = vi.mocked(transformModule.runTransformPipeline);
        mockLoadTransformPipeline = vi.mocked(transformModule.loadTransformPipeline);

        mockRunTransformPipeline.mockResolvedValue({
            success: true,
            output: {
                $llm: {
                    step: 'plan',
                    message: 'Test message',
                    execute: {test: {}},
                    completed: false
                }
            },
            files: {'request.md': '# Request'}
        });

        service = new AIActionTransformService();
    });

    describe('constructor', () => {
        it('should create service with default options', () => {
            const defaultService = new AIActionTransformService();
            expect(defaultService).toBeDefined();
        });

        it('should accept custom options', () => {
            const customService = new AIActionTransformService({
                transformsDir: '/custom/path',
                temperature: 0.9
            });
            expect(customService).toBeDefined();
        });
    });

    describe('initialize', () => {
        it('should load transform pipelines', async () => {
            await service.initialize();
            
            expect(mockLoadTransformPipeline).toHaveBeenCalled();
        });

        it('should load specific transform by prompt name', async () => {
            await service.initialize('coder-request.md');
            
            expect(mockLoadTransformPipeline).toHaveBeenCalled();
        });
    });

    describe('runAIAction', () => {
        it('should run full AI action pipeline', async () => {
            const context: AIActionContext = {
                context: {
                    history: [],
                    execution: {step: 'start'}
                },
                result: {
                    message: 'Analyze this code'
                }
            };

            const result = await service.runAIAction(context);

            expect(result).toBeDefined();
            expect(result.step).toBe('plan');
            expect(result.message).toBe('Test message');
            expect(result.execute).toEqual({test: {}});
            expect(result.completed).toBe(false);
        });

        it('should apply request transform before LLM call', async () => {
            const context: AIActionContext = {
                context: {
                    history: [],
                    execution: {step: 'start'}
                }
            };

            await service.runAIAction(context);

            expect(mockRunTransformPipeline).toHaveBeenCalledTimes(2);
        });

        it('should throw error when transform fails', async () => {
            mockRunTransformPipeline.mockResolvedValueOnce({
                success: false,
                error: 'Transform failed'
            });

            const context: AIActionContext = {
                context: {
                    history: [],
                    execution: {step: 'start'}
                }
            };

            await expect(service.runAIAction(context)).rejects.toThrow('Request transform failed');
        });
    });

    describe('applyRequestTransform', () => {
        it('should apply only request transform', async () => {
            const context: AIActionContext = {
                context: {
                    history: [],
                    execution: {step: 'start'}
                }
            };

            const result = await service.applyRequestTransform(context);

            expect(result).toBeDefined();
            expect(result.requestMd).toBe('# Request');
            expect(result.files).toBeDefined();
        });
    });

    describe('applyResponseTransform', () => {
        it('should apply response transform to LLM output', async () => {
            const context: AIActionContext = {
                context: {
                    history: [],
                    execution: {step: 'start'}
                }
            };

            const responseMd = '{"step": "execute", "message": "Done", "execute": {}, "completed": true}';
            
            const result = await service.applyResponseTransform(context, responseMd);

            expect(result).toBeDefined();
            expect(result.step).toBe('plan');
        });
    });

    describe('checkHealth', () => {
        it('should return health status', async () => {
            const health = await service.checkHealth();
            expect(health).toBe(true);
        });
    });

    describe('listModels', () => {
        it('should return available models', async () => {
            const models = await service.listModels();
            expect(models).toEqual(['test-model']);
        });
    });
});

describe('getAIActionTransformService', () => {
    it('should return singleton instance', () => {
        const service1 = getAIActionTransformService();
        const service2 = getAIActionTransformService();
        
        expect(service1).toBe(service2);
    });
});
