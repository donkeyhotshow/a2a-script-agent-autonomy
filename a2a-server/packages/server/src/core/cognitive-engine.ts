/**
 * CognitiveEngine — LLM-backed reasoning core (ADR-016).
 *
 * Wraps the AI hub `/v1/chat/completions` endpoint and returns
 * structured reasoning results.  Falls back gracefully when the hub
 * is unavailable so the rest of the pipeline is not blocked.
 */

import { resolveAiHubBaseUrl } from '@a2a/server-utils';
import { logger } from '@a2a/server-utils/logger';

export interface ReasoningInput {
    goal: string;
    context?: Record<string, unknown>;
    history?: unknown[];
    maxTokens?: number;
    model?: string;
}

export interface ReasoningOutput {
    plan: string;
    confidence: number;
    steps: string[];
    caveats: string[];
    raw?: string;
}

export class CognitiveEngine {
    private readonly aiHubUrl: string;
    private readonly defaultModel: string;
    private readonly timeoutMs: number;

    constructor(opts: { aiHubUrl?: string; model?: string; timeoutMs?: number } = {}) {
        this.aiHubUrl = resolveAiHubBaseUrl(opts.aiHubUrl).replace(/\/$/, '');
        this.defaultModel = opts.model ?? (process.env['A2A_MODEL'] ?? 'llama3');
        this.timeoutMs = opts.timeoutMs ?? 30_000;
    }

    async reason(input: ReasoningInput): Promise<ReasoningOutput> {
        const prompt = this._buildPrompt(input);
        const model = input.model ?? this.defaultModel;

        try {
            const res = await fetch(`${this.aiHubUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    stream: false,
                    max_tokens: input.maxTokens ?? 512,
                }),
                signal: AbortSignal.timeout(this.timeoutMs),
            });

            if (!res.ok) {
                logger.warn('[CognitiveEngine] Hub non-200', { status: res.status });
                return this._fallback(input.goal);
            }

            const body = (await res.json()) as {
                choices?: Array<{ message?: { content?: string } }>;
            };
            const raw = body.choices?.[0]?.message?.content?.trim() ?? '';
            return this._parse(raw, input.goal);
        } catch (err: unknown) {
            logger.debug('[CognitiveEngine] Hub unreachable', {
                error: err instanceof Error ? err.message : String(err),
            });
            return this._fallback(input.goal);
        }
    }

    private _buildPrompt(input: ReasoningInput): string {
        const ctxLines = input.context
            ? `\nContext:\n${JSON.stringify(input.context, null, 2).slice(0, 1_000)}`
            : '';
        return `You are a reasoning engine. Analyse the following goal and produce a concise execution plan.\n\nGoal: ${input.goal}${ctxLines}\n\nRespond in JSON: {"plan": "string", "confidence": 0.0-1.0, "steps": ["..."], "caveats": ["..."]}`;
    }

    private _parse(raw: string, goal: string): ReasoningOutput {
        try {
            const m = /\{[\s\S]*?\}/.exec(raw);
            if (m) {
                const parsed = JSON.parse(m[0]) as Partial<ReasoningOutput>;
                return {
                    plan: parsed.plan ?? goal,
                    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
                    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
                    caveats: Array.isArray(parsed.caveats) ? parsed.caveats : [],
                    raw,
                };
            }
        } catch {
            // fall through
        }
        return { plan: raw || goal, confidence: 0.5, steps: [], caveats: [], raw };
    }

    private _fallback(goal: string): ReasoningOutput {
        return {
            plan: goal,
            confidence: 0.0,
            steps: [],
            caveats: ['CognitiveEngine: hub unavailable, no reasoning performed'],
        };
    }
}

export const cognitiveEngine = new CognitiveEngine();
