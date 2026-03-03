import type {DialogContext, DialogFile, EnrichmentData, NeuronPlugin, NeuronResult, NeuronType, SuggestedAction} from '../types.js';

interface CodePatternNeuronConfig {
    maxPatterns?: number;
    relevanceThreshold?: number;
}

const DEFAULT_CONFIG: Required<CodePatternNeuronConfig> = {
    maxPatterns: 5,
    relevanceThreshold: 0.35,
};

export class CodePatternNeuron implements NeuronPlugin {
    readonly name = 'code-pattern';
    readonly version = '1.0.0';
    readonly type: NeuronType = 'context_enricher';

    private readonly maxPatterns: number;
    private readonly relevanceThreshold: number;

    constructor(config: CodePatternNeuronConfig = {}) {
        this.maxPatterns = config.maxPatterns ?? DEFAULT_CONFIG.maxPatterns;
        this.relevanceThreshold = config.relevanceThreshold ?? DEFAULT_CONFIG.relevanceThreshold;
    }

    shouldActivate(context: DialogContext): boolean {
        return Boolean(context.files?.some(file => file.type === 'code'));
    }

    async process(context: DialogContext): Promise<NeuronResult> {
        const messageTokens = this.extractTokens(context.userMessage);

        if (!messageTokens.length) {
            return {
                metadata: {reason: 'no_tokens'},
            };
        }

        const codeFiles = context.files?.filter(file => file.type === 'code') ?? [];
        const matches = this.findPatternMatches(codeFiles, messageTokens);

        if (!matches.length) {
            return {
                metadata: {reason: 'no_matches'},
            };
        }

        const enrichments: EnrichmentData[] = matches.map(match => ({
            key: 'codePattern',
            value: {
                file: match.file,
                snippet: match.snippet,
                score: match.score.toFixed(2),
                tokens: match.tokens,
            },
            metadata: {matches: match.matchedTokens, relevance: match.score},
        }));

        const suggestedActions: SuggestedAction[] = matches.map(match => ({
            title: `Review pattern in ${match.file}`,
            description: `Score ${match.score.toFixed(2)} for tokens: ${match.tokens.join(', ')}`,
            priority: Math.round(match.score * 10),
        }));

        return {
            enrichments,
            suggestedActions,
            needs: ['Code pattern reference for context-aware response'],
            metadata: {matchCount: matches.length},
        };
    }

    private extractTokens(text?: string): string[] {
        if (!text) {
            return [];
        }

        const tokens = Array.from(new Set(text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []));
        return tokens;
    }

    private findPatternMatches(files: DialogFile[], tokens: string[]): Array<{
        file: string;
        snippet: string;
        score: number;
        tokens: string[];
        matchedTokens: string[];
    }> {
        const matches: Array<{
            file: string;
            snippet: string;
            score: number;
            tokens: string[];
            matchedTokens: string[];
        }> = [];

        for (const file of files) {
            const lines = file.content.split(/\r?\n/);

            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line) {
                    continue;
                }

                const matchedTokens = tokens.filter(token => line.includes(token));
                if (!matchedTokens.length) {
                    continue;
                }

                const score = matchedTokens.length / tokens.length;
                if (score < this.relevanceThreshold) {
                    continue;
                }

                matches.push({
                    file: file.path,
                    snippet: line,
                    score,
                    tokens,
                    matchedTokens,
                });
            }
        }

        return matches
            .sort((a, b) => b.score - a.score)
            .slice(0, this.maxPatterns);
    }
}
