/**
 * Operation Cost Tracker — накопительный счётчик токенов и LLM-вызовов за сессию.
 * Вдохновлён OpenHarness engine/cost_tracker.py.
 *
 * Используется в GrayRoomOrchestrator для агрегирования использования API
 * по всем итерациям interrupt loop.
 */

import {logger} from '../../utils/logger.js';

export interface UsageRecord {
    inputTokens?: number;
    outputTokens?: number;
    model?: string;
    phase?: string; // 'primary' | 'follow_up' | 'interrupt'
}

export interface CostSummary {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    llmCallCount: number;
    estimatedCostUsd: number | null;
}

/** Approximate USD cost per 1M tokens (rough estimates for common models). */
const MODEL_COST_PER_M: Record<string, {input: number; output: number}> = {
    'llama3.1:8b':  {input: 0, output: 0},      // local Ollama — free
    'llama3.2:3b':  {input: 0, output: 0},
    'gemma2:9b':    {input: 0, output: 0},
    'qwen2.5:7b':   {input: 0, output: 0},
    'deepseek-r1':  {input: 0.14, output: 0.28},
    'gpt-4o':       {input: 2.50, output: 10.00},
    'claude-opus':  {input: 15.00, output: 75.00},
    'claude-sonnet': {input: 3.00, output: 15.00},
};

export class OperationCostTracker {
    private totalInputTokens = 0;
    private totalOutputTokens = 0;
    private llmCallCount = 0;
    private primaryModel: string | undefined;

    /** Record a single LLM call usage. */
    record(usage: UsageRecord): void {
        const input = usage.inputTokens ?? 0;
        const output = usage.outputTokens ?? 0;
        this.totalInputTokens += input;
        this.totalOutputTokens += output;
        this.llmCallCount++;
        if (usage.model && !this.primaryModel) {
            this.primaryModel = usage.model;
        }
        logger.debug('[CostTracker] LLM call recorded', {
            phase: usage.phase ?? 'unknown',
            input,
            output,
            cumulative: this.totalInputTokens + this.totalOutputTokens,
        });
    }

    /** Return the aggregated cost summary. */
    get summary(): CostSummary {
        const model = this.primaryModel ?? 'unknown';
        const costs = MODEL_COST_PER_M[model];

        let estimatedCostUsd: number | null = null;
        if (costs) {
            estimatedCostUsd =
                (this.totalInputTokens / 1_000_000) * costs.input +
                (this.totalOutputTokens / 1_000_000) * costs.output;
        }

        return {
            totalInputTokens: this.totalInputTokens,
            totalOutputTokens: this.totalOutputTokens,
            totalTokens: this.totalInputTokens + this.totalOutputTokens,
            llmCallCount: this.llmCallCount,
            estimatedCostUsd,
        };
    }

    /** Reset the tracker (for reuse). */
    reset(): void {
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
        this.llmCallCount = 0;
        this.primaryModel = undefined;
    }
}
