import {describe, expect, it} from 'vitest';
import {NeuronOrchestrator} from '@/neurons-v2/neuron-orchestrator.js';
import {NeuronRegistry} from '@/neurons-v2/neuron-registry.js';
import type {DialogContext, NeuronPlugin} from '@/neurons-v2/types.js';

function createIntentPlugin(): NeuronPlugin {
    return {
        name: 'intent-lambda',
        version: '1.3.0',
        type: 'intent_detector',
        shouldActivate: () => true,
        process: async () => ({
            intents: [{type: 'code_generation', confidence: 0.8}],
            needs: ['Custom need'],
        }),
    };
}

function createFailingPlugin(): NeuronPlugin {
    return {
        name: 'failing',
        version: '0.1.0',
        type: 'context_enricher',
        shouldActivate: () => true,
        process: async () => {
            throw new Error('boom');
        },
    };
}

describe('NeuronOrchestrator', () => {
    it('merges neuron results and maps llm needs', async () => {
        const registry = new NeuronRegistry();
        registry.register(createIntentPlugin());
        const orchestrator = new NeuronOrchestrator(registry, {
            timeout: 1000,
            parallel: true,
        });

        const context: DialogContext = {userMessage: 'Please generate a login screen'};
        const {context: result} = await orchestrator.processDialog('Generate login screen', context);

        expect(result.detectedIntents).toHaveLength(1);
        expect(result.llmNeeds).toContain('Custom need');
        expect(result.llmNeeds).toContain('Architecture overview');
        expect(result.neuronMetadata.executedPlugins).toContain('intent-lambda');
        expect(result.neuronMetadata.errors).toHaveLength(0);
    });

    it('fails fast when configured to stop', async () => {
        const registry = new NeuronRegistry();
        registry.register(createFailingPlugin());
        const orchestrator = new NeuronOrchestrator(registry, {
            errorHandling: 'stop',
            timeout: 10,
        });

        const unhandledRejections: unknown[] = [];
        const handler = (error: unknown) => {
            unhandledRejections.push(error);
        };
        process.on('unhandledRejection', handler);

        try {
            await orchestrator.processDialog('request', {userMessage: 'test'});
            throw new Error('Expected orchestrator to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(String(error)).toMatch(/failed/);
        } finally {
            await new Promise(resolve => setImmediate(resolve));
            process.off('unhandledRejection', handler);
        }
        expect(unhandledRejections).toHaveLength(1);
        expect(String(unhandledRejections[0])).toMatch(/boom/);
    });
});
