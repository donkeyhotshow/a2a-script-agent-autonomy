import {describe, expect, it} from 'vitest';
import {parseSimulationMarkdown} from '@/simulation/parser.js';

describe('Simulation parser new sections', () => {
    it('extracts neurons, pipeline, and llm requirements', () => {
        const markdown = `
## @neurons
intent-detectors:
  - semantic-intent:
      confidence: 0.8
context-enrichers:
  - framework-context:
      priority: 10

## @context-pipeline
stages:
  - name: detect-intent
    neurons:
      - semantic-intent
    parallel: true
  - name: enrich-context
    neurons:
      - framework-context
    depends_on: detect-intent
    timeout: 1200

output:
  format: enriched
  include_neuron_metadata: true

## @llm-requirements
template: |
  Needs:
  {{#each needs}}
  - {{this}}
  {{/each}}
generate_from:
  - detected_intents
  - framework_info
rules:
  - condition: detected_intents contains "code_generation"
    add:
      - "Architecture understanding"
`;

        const sections = parseSimulationMarkdown(markdown);

        expect(sections.neurons).toBeDefined();
        expect(sections.neurons?.intentDetectors[0].name).toBe('semantic-intent');
        expect(sections.contextPipeline).toBeDefined();
        expect(sections.contextPipeline?.stages).toHaveLength(2);
        expect(sections.contextPipeline?.output.format).toBe('enriched');
        expect(sections.llmRequirements).toBeDefined();
        expect(sections.llmRequirements?.rules[0].add).toContain('Architecture understanding');
    });
});
