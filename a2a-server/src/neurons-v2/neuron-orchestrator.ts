import {buildEnrichedContext, ensureEnrichedContext, mergeNeuronResult} from './utils/context-merger.js';
import type {DialogContext, EnrichedContext, ExecutionResult, NeuronPlugin, OrchestratorConfig, ProcessOptions, ProcessResult} from './types.js';
import type {NeuronRegistry as Registry} from './neuron-registry.js';

const INTENT_NEEDS_MAP: Record<string, string[]> = {
    code_generation: ['Architecture overview', 'Project style guide'],
    refactoring: ['Dependency graph', 'Breaking-change checklist'],
    debugging: ['Error context logs', 'Test reproduction steps'],
    analysis: ['Codebase overview', 'Design rationale'],
    question: ['Clarification of desired outcome', 'Relevant documentation'],
};

export class NeuronOrchestrator {
    private readonly timeout: number;
    private readonly parallel: boolean;
    private readonly maxConcurrent: number;
    private readonly errorHandling: OrchestratorConfig['errorHandling'];
    private readonly config: OrchestratorConfig;

    constructor(private readonly registry: Registry, config?: Partial<OrchestratorConfig>) {
        const defaultConfig: OrchestratorConfig = {
            timeout: 5000,
            parallel: true,
            maxConcurrent: 10,
            errorHandling: 'continue',
        };

        this.config = {...defaultConfig, ...config};
        this.timeout = this.config.timeout;
        this.parallel = this.config.parallel;
        this.maxConcurrent = Math.max(1, this.config.maxConcurrent ?? defaultConfig.maxConcurrent);
        this.errorHandling = this.config.errorHandling;
    }

    async processDialog(userRequest: string, currentContext: DialogContext, options?: ProcessOptions): Promise<ProcessResult> {
        const baseContext = ensureEnrichedContext(currentContext);
        const dialogContext: DialogContext = {
            ...baseContext,
            userMessage: userRequest,
        };
        const plugins = options?.plugins ?? await this.registry.getActivePlugins(dialogContext);
        const executionResults = await this.executeParallel(plugins, dialogContext, options);
        const enrichedContext = this.mergeResults(baseContext, executionResults);
        return {
            context: enrichedContext,
            executionResults,
        };
    }

    private async executeParallel(
        plugins: NeuronPlugin[],
        context: DialogContext,
        options?: ProcessOptions
    ): Promise<ExecutionResult[]> {
        if (!plugins.length) {
            return [];
        }

        const timeout = options?.timeout ?? this.timeout;
        const maxConcurrent = Math.max(1, options?.maxConcurrent ?? this.maxConcurrent);
        const useParallel = options?.parallel ?? this.parallel;

        if (!useParallel) {
            const sequential: ExecutionResult[] = [];
            for (const plugin of plugins) {
                sequential.push(await this.runPlugin(plugin, context, timeout));
            }
            return sequential;
        }

        const results: ExecutionResult[] = [];
        for (let index = 0; index < plugins.length; index += maxConcurrent) {
            const batch = plugins.slice(index, index + maxConcurrent);
            const batchResults = await Promise.all(batch.map(plugin => this.runPlugin(plugin, context, timeout)));
            results.push(...batchResults);
        }

        return results;
    }

    private async runPlugin(plugin: NeuronPlugin, context: DialogContext, timeout: number): Promise<ExecutionResult> {
        const start = Date.now();
        const executor = plugin.process(context).catch(error => {
            throw error;
        });
        const timeoutPromise = new Promise<never>((_, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Neuron ${plugin.name} timed out after ${timeout}ms`));
            }, timeout);
            executor.finally(() => clearTimeout(timer));
        });

        try {
            const result = await Promise.race([executor, timeoutPromise]);
            const latency = Date.now() - start;
            return {
                plugin: plugin.name,
                success: true,
                result,
                latency,
            };
        } catch (error) {
            const latency = Date.now() - start;
            const message = error instanceof Error ? error.message : String(error);

            if (this.errorHandling === 'stop') {
                throw new Error(`Neuron ${plugin.name} failed: ${message}`);
            }

            const execution: ExecutionResult = {
                plugin: plugin.name,
                success: this.errorHandling === 'ignore',
                latency,
                error: this.errorHandling === 'ignore' ? undefined : message,
            };

            return execution;
        }
    }

    private mergeResults(context: EnrichedContext, results: ExecutionResult[]): EnrichedContext {
        let totalLatency = 0;
        for (const result of results) {
            totalLatency += result.latency;
            if (result.result) {
                mergeNeuronResult(context, result.result);
            }
            if (result.error) {
                context.neuronMetadata.errors.push(`${result.plugin}: ${result.error}`);
            }
            context.neuronMetadata.executedPlugins.push(result.plugin);
        }

        context.llmNeeds = Array.from(new Set([
            ...(context.llmNeeds ?? []),
            ...this.generateLLMNeeds(results),
        ]));
        context.neuronMetadata.executionTime = totalLatency;
        return context;
    }

    private generateLLMNeeds(results: ExecutionResult[]): string[] {
        const needs = new Set<string>();

        for (const result of results) {
            if (result.result?.needs) {
                for (const need of result.result.needs) {
                    needs.add(need);
                }
            }

            if (result.result?.intents) {
                for (const intent of result.result.intents) {
                    const mapped = INTENT_NEEDS_MAP[intent.type];
                    if (mapped) {
                        mapped.forEach(requirement => needs.add(requirement));
                    }
                }
            }
        }

        return Array.from(needs).slice(0, 10);
    }
}
