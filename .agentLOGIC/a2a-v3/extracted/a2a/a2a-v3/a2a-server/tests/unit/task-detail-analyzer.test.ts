/**
 * Task Detail Analyzer Tests
 * Tests for src/utils/task-detail-analyzer.ts functions
 */

import {describe, it, expect} from 'vitest';
import {analyzeTaskDetail, getNeuronsByLevel, type TaskDetailLevel} from '../../src/utils/task-detail-analyzer.js';

describe('task-detail-analyzer', () => {
    describe('analyzeTaskDetail', () => {
        it('should return default result for empty input', () => {
            const result = analyzeTaskDetail('');
            expect(result.level).toBe('short');
            expect(result.wordCount).toBe(0);
            expect(result.charCount).toBe(0);
            expect(result.hasTechnicalTerms).toBe(false);
            expect(result.hasFilePaths).toBe(false);
        });

        it('should return default result for null/undefined input', () => {
            const resultNull = analyzeTaskDetail(null as any);
            const resultUndefined = analyzeTaskDetail(undefined as any);
            expect(resultNull.level).toBe('short');
            expect(resultUndefined.level).toBe('short');
        });

        it('should detect short tasks', () => {
            const result = analyzeTaskDetail('fix this');
            expect(result.level).toBe('short');
            expect(result.wordCount).toBe(2);
            expect(result.needsContext).toBe(true);
            expect(result.readyForAi).toBe(false);
        });

        it('should detect medium tasks with technical terms', () => {
            const result = analyzeTaskDetail('create a Vue component for the header');
            expect(result.level).toBe('medium');
            expect(result.hasTechnicalTerms).toBe(true);
            expect(result.technicalTerms).toContain('vue');
            expect(result.taskType).toBe('creation');
        });

        it('should detect detailed tasks with multiple technical terms', () => {
            const result = analyzeTaskDetail(
                'Create a new Laravel controller for user management with authentication middleware and RESTful API routes'
            );
            expect(result.level).toBe('detailed');
            expect(result.hasTechnicalTerms).toBe(true);
            expect(result.technicalTerms).toContain('laravel');
            expect(result.technicalTerms).toContain('controller');
            expect(result.technicalTerms).toContain('authentication');
            expect(result.readyForAi).toBe(true);
        });

        it('should detect file paths in task text', () => {
            const result = analyzeTaskDetail('Update the controller at src/controllers/UserController.ts');
            expect(result.hasFilePaths).toBe(true);
            expect(result.filePaths.length).toBeGreaterThan(0);
        });

        it('should detect modification tasks', () => {
            const result = analyzeTaskDetail('fix the authentication bug');
            expect(result.taskType).toBe('modification');
        });

        it('should detect creation tasks', () => {
            const result = analyzeTaskDetail('generate a new migration for users table');
            expect(result.taskType).toBe('creation');
        });

        it('should detect analysis tasks', () => {
            const result = analyzeTaskDetail('analyze the code for performance issues');
            expect(result.taskType).toBe('analysis');
        });

        it('should correctly count words and characters', () => {
            const result = analyzeTaskDetail('Hello World Test');
            expect(result.wordCount).toBe(3);
            expect(result.charCount).toBe('Hello World Test'.length);
        });

        it('should handle Windows file paths', () => {
            const result = analyzeTaskDetail('Check file at C:\\Users\\dev\\project\\app.ts');
            expect(result.hasFilePaths).toBe(true);
        });

        it('should handle relative file paths', () => {
            const result = analyzeTaskDetail('Update ./src/index.js');
            expect(result.hasFilePaths).toBe(true);
        });
    });

    describe('getNeuronsByLevel', () => {
        it('should return neurons for short level', () => {
            const neurons = getNeuronsByLevel('short');
            expect(neurons).toContain('neuron-project-context-detector');
            expect(neurons).toContain('neuron-task-semantic-analyzer');
        });

        it('should return neurons for medium level', () => {
            const neurons = getNeuronsByLevel('medium');
            expect(neurons).toContain('neuron-task-semantic-analyzer');
            expect(neurons).toContain('neuron-file-collector');
        });

        it('should return neurons for detailed level', () => {
            const neurons = getNeuronsByLevel('detailed');
            expect(neurons).toContain('neuron-task-semantic-analyzer');
            expect(neurons).toContain('neuron-project-context-detector');
        });

        it('should fallback to short level for unknown levels', () => {
            const neurons = getNeuronsByLevel('unknown' as TaskDetailLevel);
            expect(neurons).toContain('neuron-project-context-detector');
        });
    });
});
