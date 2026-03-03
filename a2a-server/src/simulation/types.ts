export interface NeuronConfigEntry {
    name: string;
    config: Record<string, unknown>;
}

export interface NeuronsSection {
    intentDetectors: NeuronConfigEntry[];
    contextEnrichers: NeuronConfigEntry[];
    actionSuggesters: NeuronConfigEntry[];
}

export interface PipelineStage {
    name: string;
    neurons: string[];
    parallel?: boolean;
    timeout?: number;
    dependsOn?: string | string[];
}

export interface ContextPipelineOutput {
    format: 'enriched' | 'minimal';
    includeNeuronMetadata: boolean;
}

export interface ContextPipelineSection {
    stages: PipelineStage[];
    output: ContextPipelineOutput;
}

export interface LLMRule {
    condition: string;
    add: string[];
}

export interface LLMRequirementsSection {
    template: string;
    generateFrom: string[];
    rules: LLMRule[];
}

export interface SimulationSections {
    neurons?: NeuronsSection;
    contextPipeline?: ContextPipelineSection;
    llmRequirements?: LLMRequirementsSection;
}
