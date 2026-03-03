import {NeuronOrchestrator, NeuronRegistry} from '../neurons-v2/index.js';
import {ensureEnrichedContext} from '../neurons-v2/utils/context-merger.js';
import type {DialogContext, EnrichedContext} from '../neurons-v2/types.js';
import type {ExecutionResult} from '../neurons-v2/types.js';
import {resolveStageDependencies} from './validators/pipeline-validator.js';
import type {ContextPipelineSection, PipelineStage} from './types.js';

export type PipelineStageStatus = 'success' | 'error' | 'timeout';

export interface PipelineStageResult {
    name: string;
    status: PipelineStageStatus;
    results: ExecutionResult[];
    executionTime: number;
}

export interface PipelineResult {
    stages: PipelineStageResult[];
    finalContext: EnrichedContext;
}

export interface PipelineRunner {
    run(pipeline: ContextPipelineSection, context: DialogContext): Promise<PipelineResult>;
}

export class ContextPipelineRunner implements PipelineRunner {
    constructor(
        private readonly orchestrator: NeuronOrchestrator,
        private readonly registry: NeuronRegistry
    ) {}

    async run(pipeline: ContextPipelineSection, context: DialogContext): Promise<PipelineResult> {
        const orderedStages = resolveStageDependencies(pipeline.stages);
        const stageResults: PipelineStageResult[] = [];
        let currentContext: EnrichedContext = ensureEnrichedContext(context);
        const userMessage = context.userMessage ?? '';

        for (const stage of orderedStages) {
            const stageStart = Date.now();
            const plugins = await this.registry.getPluginsByNames(stage.neurons);

            let execution: PipelineStageResult;

            try {
                const {context: stageContext, executionResults} = plugins.length
                    ? await this.orchestrator.processDialog(userMessage, currentContext, {
                        plugins,
                        parallel: stage.parallel,
                        timeout: stage.timeout,
                    })
                    : {context: currentContext, executionResults: []};

                const duration = Date.now() - stageStart;
                execution = {
                    name: stage.name,
                    status: 'success',
                    results: executionResults,
                    executionTime: duration,
                };
                currentContext = stageContext;
            } catch (error) {
                const duration = Date.now() - stageStart;
                const status: PipelineStageStatus = error instanceof Error && error.message.toLowerCase().includes('timeout')
                    ? 'timeout' : 'error';

                execution = {
                    name: stage.name,
                    status,
                    results: [],
                    executionTime: duration,
                };

                stageResults.push(execution);
                throw error;
            }

            stageResults.push(execution);
        }

        return {
            stages: stageResults,
            finalContext: currentContext,
        };
    }
}
