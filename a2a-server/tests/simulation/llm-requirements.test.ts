import {describe, expect, it} from 'vitest';
import {LLMRequirementsGenerator} from '@/simulation/llm-requirements-generator.js';
import type {LLMRequirementsSection} from '@/simulation/types.js';
import type {ExecutionResult} from '@/neurons-v2/types.js';

describe('LLMRequirementsGenerator', () => {
    it('generates needs from execution results and rules', () => {
        const generator = new LLMRequirementsGenerator();
        const config: LLMRequirementsSection = {
            template: 'Needs:\n{{#each needs}}\n- {{this}}\n{{/each}}',
            generateFrom: ['detected_intents', 'framework_info'],
            rules: [
                {
                    condition: 'detected_intents contains "code_generation"',
                    add: ['Architecture knowledge required'],
                },
                {
                    condition: 'framework_info exists',
                    add: ['Framework-specific knowledge'],
                },
            ],
        };

        const executionResults: ExecutionResult[] = [
            {
                plugin: 'intent',
                success: true,
                latency: 10,
                result: {
                    intents: [{type: 'code_generation', confidence: 0.91}],
                    needs: ['Custom need'],
                    enrichments: [
                        {key: 'framework', value: {name: 'Vue', confidence: 0.9}},
                    ],
                },
            },
        ];

        const {needs, renderedTemplate} = generator.generate(config, executionResults);

        expect(needs).toContain('Custom need');
        expect(needs).toContain('Architecture knowledge required');
        expect(needs).toContain('Framework-specific knowledge');
        expect(renderedTemplate).toContain('Custom need');
    });
});
