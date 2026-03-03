export type NeuronType = 'intent_detector' | 'context_enricher' | 'action_suggester';

export interface ConversationMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

export interface DialogFile {
    path: string;
    content: string;
    type: 'code' | 'document' | 'config' | 'asset' | 'other';
    metadata?: Record<string, unknown>;
}

export interface DialogContext {
    userMessage: string;
    conversationHistory?: ConversationMessage[];
    metadata?: Record<string, unknown>;
    files?: DialogFile[];
    projectPath?: string;
    framework?: string;
    tags?: string[];
}

export interface DetectedIntent {
    type: string;
    confidence: number;
    metadata?: Record<string, unknown>;
}

export interface EnrichmentData {
    key: string;
    value: unknown;
    source?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
}

export interface SuggestedAction {
    title: string;
    description?: string;
    priority?: number;
    metadata?: Record<string, unknown>;
}

export interface NeuronResult {
    intents?: DetectedIntent[];
    enrichments?: EnrichmentData[];
    suggestedActions?: SuggestedAction[];
    needs?: string[];
    metadata?: Record<string, unknown>;
}

export interface NeuronMetadata {
    executedPlugins: string[];
    executionTime: number;
    errors: string[];
}

export interface EnrichedContext extends DialogContext {
    detectedIntents: DetectedIntent[];
    enrichments: EnrichmentData[];
    suggestedActions: SuggestedAction[];
    llmNeeds: string[];
    neuronMetadata: NeuronMetadata;
}

export interface NeuronPlugin {
    name: string;
    version: string;
    type: NeuronType;
    shouldActivate(context: DialogContext): boolean;
    process(context: DialogContext): Promise<NeuronResult>;
    onActivate?(): void;
    onDeactivate?(): void;
}

export interface ExecutionResult {
    plugin: string;
    success: boolean;
    result?: NeuronResult;
    error?: string;
    latency: number;
}

export interface ProcessOptions {
    plugins?: NeuronPlugin[];
    parallel?: boolean;
    timeout?: number;
    maxConcurrent?: number;
}

export interface ProcessResult {
    context: EnrichedContext;
    executionResults: ExecutionResult[];
}

export interface OrchestratorConfig {
    timeout: number;
    parallel: boolean;
    maxConcurrent: number;
    errorHandling: 'continue' | 'stop' | 'ignore';
}
