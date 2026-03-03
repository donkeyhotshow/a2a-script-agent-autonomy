import {describe, expect, it} from 'vitest';
import {ContextPipelineRunner} from '@/simulation/context-pipeline.js';
import type {ContextPipelineSection} from '@/simulation/types.js';
import {NeuronRegistry} from '@/neurons-v2/neuron-registry.js';
import {NeuronOrchestrator} from '@/neurons-v2/neuron-orchestrator.js';
import type {NeuronPlugin, DialogContext} from '@/neurons-v2/types.js';

function createPlugin(name: string): NeuronPlugin {
    return {
        name,
        version: '1.0.0',
        type: 'context_enricher',
        shouldActivate: () => true,
        process: async () => ({
            intents: [{type: 'code_generation', confidence: 0.8}],
            needs: ['Context need'],
        }),
    };
}

describe('ContextPipelineRunner', () => {
    it('executes stages in dependency order and merges context', async () => {
        const registry = new NeuronRegistry();
        registry.register(createPlugin('semantic-intent'));
        registry.register(createPlugin('framework-context'));

        const orchestrator = new NeuronOrchestrator(registry, {
            timeout: 1000,
            parallel: true,
        });

        const runner = new ContextPipelineRunner(orchestrator, registry);
        const pipeline: ContextPipelineSection = {
            stages: [
                {
                    name: 'detect-intent',
                    neurons: ['semantic-intent'],
                    parallel: true,
                },
                {
                    name: 'context-enrichment',
                    neurons: ['framework-context'],
                    dependsOn: 'detect-intent',
                    parallel: true,
                },
            ],
            output: {
                format: 'enriched',
                includeNeuronMetadata: true,
            },
        };

        const context: DialogContext = {userMessage: 'Generate login screen'};
        const result = await runner.run(pipeline, context);

        expect(result.stages).toHaveLength(2);
        expect(result.stages[0].name).toBe('detect-intent');
        expect(result.stages[0].status).toBe('success');
        expect(result.stages[1].name).toBe('context-enrichment');
        expect(result.finalContext.detectedIntents).toHaveLength(1);
        expect(result.finalContext.neuronMetadata.executedPlugins).toContain('framework-context');
    });
});
