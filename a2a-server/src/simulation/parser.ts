import {load} from 'js-yaml';
import type {ContextPipelineSection, LLMRequirementsSection, NeuronsSection, NeuronConfigEntry, SimulationSections} from './types.js';

const SECTION_REGEX = /##\s+@([\w-]+)\s*([\s\S]*?)(?=(?:##\s+@)|$)/gi;

export function parseSimulationMarkdown(content: string): SimulationSections {
    const sections: SimulationSections = {};
    let match: RegExpExecArray | null;

    while ((match = SECTION_REGEX.exec(content)) !== null) {
        const sectionName = match[1].trim().toLowerCase();
        const payload = match[2].trim();

        if (!payload) {
            continue;
        }

        switch (sectionName) {
            case 'neurons':
                sections.neurons = parseNeuronsSection(payload);
                break;
            case 'context-pipeline':
                sections.contextPipeline = parseContextPipelineSection(payload);
                break;
            case 'llm-requirements':
                sections.llmRequirements = parseLLMRequirementsSection(payload);
                break;
            default:
                break;
        }
    }

    return sections;
}

function parseNeuronsSection(payload: string): NeuronsSection {
    const parsed = load(payload) as Record<string, unknown> ?? {};

    return {
        intentDetectors: normalizeNeuronList(parsed.intentDetectors ?? parsed['intent-detectors']),
        contextEnrichers: normalizeNeuronList(parsed.contextEnrichers ?? parsed['context-enrichers']),
        actionSuggesters: normalizeNeuronList(parsed.actionSuggesters ?? parsed['action-suggesters']),
    };
}

function normalizeNeuronList(input: unknown): NeuronConfigEntry[] {
    if (!Array.isArray(input)) {
        return [];
    }

    return input
        .map(entry => {
            if (typeof entry === 'string') {
                return {name: entry, config: {}};
            }

            if (isRecord(entry)) {
                const keys = Object.keys(entry);
                if (keys.length === 1) {
                    const name = keys[0];
                    const config = isRecord(entry[name]) ? (entry[name] as Record<string, unknown>) : {};
                    return {name, config};
                }
            }

            return null;
        })
        .filter(Boolean) as NeuronConfigEntry[];
}

function parseContextPipelineSection(payload: string): ContextPipelineSection {
    const parsed = load(payload) as Record<string, unknown> ?? {};
    const stagesRaw = Array.isArray(parsed.stages) ? parsed.stages : [];

    const stages = stagesRaw.map((stage, index) => {
        const rawStage = isRecord(stage) ? stage : {};
        const neurons = Array.isArray(rawStage.neurons) ? rawStage.neurons.filter(n => typeof n === 'string') as string[] : [];
        const dependsOn = rawStage.depends_on ?? rawStage.dependsOn;

        return {
            name: typeof rawStage.name === 'string' ? rawStage.name : `stage-${index + 1}`,
            neurons,
            parallel: rawStage.parallel === false ? false : true,
            timeout: typeof rawStage.timeout === 'number' ? rawStage.timeout : undefined,
            dependsOn: typeof dependsOn === 'string' ? dependsOn : Array.isArray(dependsOn) ? dependsOn.map(value => String(value)) : undefined,
        };
    });

    const output = isRecord(parsed.output) ? parsed.output : {};

    return {
        stages,
        output: {
            format: output.format === 'minimal' ? 'minimal' : 'enriched',
            includeNeuronMetadata: Boolean(output.include_neuron_metadata ?? output.includeNeuronMetadata),
        },
    };
}

function parseLLMRequirementsSection(payload: string): LLMRequirementsSection {
    const parsed = load(payload) as Record<string, unknown> ?? {};

    return {
        template: typeof parsed.template === 'string' ? parsed.template : '',
        generateFrom: Array.isArray(parsed.generate_from)
            ? parsed.generate_from.filter(item => typeof item === 'string') as string[]
            : Array.isArray(parsed.generateFrom)
                ? parsed.generateFrom.filter(item => typeof item === 'string') as string[]
                : [],
        rules: Array.isArray(parsed.rules)
            ? parsed.rules.filter(rule => isRecord(rule) && typeof rule.condition === 'string' && Array.isArray(rule.add))
                .map(rule => ({
                    condition: rule.condition,
                    add: rule.add.filter(item => typeof item === 'string') as string[],
                }))
            : [],
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
