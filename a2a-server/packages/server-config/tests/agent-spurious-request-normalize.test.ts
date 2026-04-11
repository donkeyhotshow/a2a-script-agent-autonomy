import {describe, expect, it} from 'vitest';
import {normalizeAgentSpuriousRequestAfterPipeline} from '../../src/services/core/request-processor/agent-spurious-request-normalize';
import type {ProcessResult} from '../../src/services/core/request-processor/request-processor.interfaces';

describe('normalizeAgentSpuriousRequestAfterPipeline', () => {
    it('leaves first agent request (single assistant) unchanged', () => {
        const result: ProcessResult = {
            outcome: 'completed',
            context: {
                execution: {action: 'agent', step: 'request'},
                history: [
                    {role: 'user', message: 'Do X'},
                    {role: 'system', message: 'choice: agent'},
                    {role: 'assistant', message: 'Starting.'},
                ],
            } as ProcessResult['context'],
            execute: {
                form: {
                    title: 'Agent Mode',
                    description: 'Enter your task for the agent',
                    input: [{name: 'task', type: 'text', label: 'Task', required: true}],
                },
            },
        };
        const ok = normalizeAgentSpuriousRequestAfterPipeline(result, 'agent');
        expect(ok).toBe(false);
        expect((result.context as {execution: {step: string}}).execution.step).toBe('request');
    });

    it('coerces repeat Agent Mode form after two assistant turns', () => {
        const result: ProcessResult = {
            outcome: 'completed',
            context: {
                execution: {action: 'agent', step: 'request'},
                history: [
                    {role: 'user', message: 'Do X'},
                    {role: 'system', message: 'choice: agent'},
                    {role: 'assistant', message: 'First line.'},
                    {role: 'assistant', message: 'Second line about work.'},
                ],
            } as ProcessResult['context'],
            execute: {
                form: {
                    title: 'Agent Mode',
                    description: 'Enter your task for the agent',
                    input: [{name: 'task', type: 'text', label: 'Task', required: true}],
                },
            },
        };
        const ok = normalizeAgentSpuriousRequestAfterPipeline(result, 'agent');
        expect(ok).toBe(true);
        expect((result.context as {execution: {step: string}}).execution.step).toBe('processing');
        expect((result.execute as {message: string}).message).toBe('Second line about work.');
    });

    it('coerces repeat simulations/sync/agent/2 form after two assistant turns', () => {
        const result: ProcessResult = {
            outcome: 'completed',
            context: {
                execution: {action: 'agent', step: 'request'},
                history: [
                    {role: 'user', message: 'Do X'},
                    {role: 'system', message: 'choice: agent'},
                    {role: 'assistant', message: 'First line.'},
                    {role: 'assistant', message: 'Second line about work.'},
                ],
            } as ProcessResult['context'],
            execute: {
                form: {
                    title: 'Ваш запит',
                    description:
                        'Монорепо a2a-script-agent. Далі — повний ланцюжок інструментів agent (як у agent-coder-smart + workspace tools).',
                    input: [{name: 'message', type: 'text', label: 'Повідомлення', required: true}],
                },
            },
        };
        const ok = normalizeAgentSpuriousRequestAfterPipeline(result, 'agent');
        expect(ok).toBe(true);
        expect((result.context as {execution: {step: string}}).execution.step).toBe('processing');
    });

    it('ignores non-agent schema', () => {
        const result: ProcessResult = {
            outcome: 'completed',
            context: {
                execution: {action: 'agent', step: 'request'},
                history: [
                    {role: 'user', message: 'a'},
                    {role: 'assistant', message: 'b'},
                    {role: 'assistant', message: 'c'},
                ],
            } as ProcessResult['context'],
            execute: {
                form: {
                    title: 'Agent Mode',
                    description: 'Enter your task for the agent',
                    input: [],
                },
            },
        };
        expect(normalizeAgentSpuriousRequestAfterPipeline(result, 'dialog')).toBe(false);
    });
});
