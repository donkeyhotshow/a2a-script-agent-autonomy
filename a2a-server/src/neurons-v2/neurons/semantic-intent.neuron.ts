import type {DialogContext, DetectedIntent, NeuronPlugin, NeuronResult, NeuronType} from '../types.js';

interface SemanticIntentNeuronConfig {
    confidenceThreshold?: number;
    maxIntents?: number;
    patterns?: Record<string, string[]>;
}

const DEFAULT_PATTERNS: Record<string, string[]> = {
    code_generation: ['generate', 'create', 'implement', 'scaffold', 'build'],
    refactoring: ['refactor', 'cleanup', 'restructure', 'simplify', 'optimize'],
    debugging: ['debug', 'fix', 'error', 'trace', 'log'],
    analysis: ['analyze', 'review', 'audit', 'evaluate', 'inspect'],
    question: ['how', 'what', 'why', 'when', 'could', 'can', '?'],
};

const NEEDS_MAP: Record<string, string[]> = {
    code_generation: ['Architecture understanding', 'Project style conventions'],
    refactoring: ['Dependency impact analysis', 'Breaking-change checklist'],
    debugging: ['Error reproduction steps', 'Relevant logs or stack traces'],
    analysis: ['High-level module overview', 'Design rationale'],
    question: ['Clarify acceptance criteria', 'Reference docs if available'],
};

export class SemanticIntentNeuron implements NeuronPlugin {
    readonly name = 'semantic-intent';
    readonly version = '1.0.0';
    readonly type: NeuronType = 'intent_detector';

    private readonly confidenceThreshold: number;
    private readonly maxIntents: number;
    private readonly patterns: Record<string, string[]>;

    constructor(config: SemanticIntentNeuronConfig = {}) {
        this.confidenceThreshold = config.confidenceThreshold ?? 0.7;
        this.maxIntents = config.maxIntents ?? 3;
        this.patterns = {...DEFAULT_PATTERNS, ...(config.patterns ?? {})};
    }

    shouldActivate(context: DialogContext): boolean {
        const text = context.userMessage?.trim() ?? '';
        return text.length > 10;
    }

    async process(context: DialogContext): Promise<NeuronResult> {
        const userMessage = context.userMessage?.toLowerCase() ?? '';
        const hits: DetectedIntent[] = [];

        for (const [intent, phrases] of Object.entries(this.patterns)) {
            const matched = phrases.filter(phrase => userMessage.includes(phrase));
            if (!matched.length) {
                continue;
            }

            const confidence = Math.min(
                1,
                0.4 + (matched.length / phrases.length) * 0.6
            );

            if (confidence >= this.confidenceThreshold) {
                hits.push({type: intent, confidence});
            }
        }

        if (!hits.length) {
            return {
                metadata: {
                    reason: 'no_intents',
                    inspected: userMessage.slice(0, 128),
                },
            };
        }

        const sorted = hits
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, this.maxIntents);

        return {
            intents: sorted,
            needs: this.generateNeeds(sorted),
            metadata: {
                detected: sorted.map(intent => ({type: intent.type, confidence: intent.confidence})),
            },
        };
    }

    private generateNeeds(intents: DetectedIntent[]): string[] {
        const needs = new Set<string>();

        for (const intent of intents) {
            const mapped = NEEDS_MAP[intent.type];
            if (mapped) {
                mapped.forEach(need => needs.add(need));
            }
        }

        return Array.from(needs);
    }
}
