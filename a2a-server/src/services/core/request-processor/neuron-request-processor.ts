/**
 * Neuron Request Processor
 *
 * Handles neuron-based request processing including:
 * - Entity recognition
 * - Graph building
 * - Neuron activation
 * - Phase machine orchestration
 */

import {logger} from '../../../utils/logger.js';
import {activateNeurons} from '../../utils/neuron-activator.service.js';
import {recognizeEntitiesBatch} from '../../entity-recognition/index.js';
import {
    parseGraphFromContext,
    mergeRecognizedIntoGraph,
    isGraphComplete,
    getGraphStats,
    isGraphEmpty,
    type Graph
} from '../graph-store.service.js';
import {
    extractFrameworks,
    hasInitialProjectFiles,
    getFrameworkTriggers,
    type FrameworkDetectionResult
} from '../../framework/framework-detector.service.js';
import {PhaseMachine, getPhaseMachine, resetPhaseMachine, ExecutionMode, AIStep} from '../context/context-manager.service.js';
import {ContextManager, getContextManager, resetContextManager} from '../context/context-manager.service.js';
import {buildRequestContextBlock} from '../../../protocol/message-builder.js';
import {analyzeTaskDetail, getNeuronsByLevel, type TaskDetailLevel} from '../../../utils/task-detail-analyzer.js';
import type {CodeBlock} from '../../../types/entity.types.js';
import type {RequestContextBlock} from '../../../types/index.js';
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome,
    Task,
    TaskAnalysis
} from '../request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';

/**
 * Questions generation helper
 */
function generateQuestions(missing: string[], graph: Graph): string[] {
    const questions: string[] = [];

    for (const item of missing) {
        if (item.includes('Controller')) {
            questions.push('Which controller handles this functionality? Please provide the controller file.');
        } else if (item.includes('Model')) {
            questions.push('Which model represents the data? Please provide the model file.');
        } else if (item.includes('Request')) {
            questions.push('Is there a FormRequest for validation? Please provide the request file or validation rules.');
        } else if (item.includes('Vue') || item.includes('Component')) {
            questions.push('Which Vue component should be modified? Please provide the component file.');
        } else if (item.includes('No entities')) {
            questions.push('Please provide the relevant code files (controller, model, service, or Vue components).');
        } else {
            questions.push(`Missing: ${item}. Please provide the relevant file.`);
        }
    }

    // Add contextual questions based on graph content
    const stats = getGraphStats(graph);

    // If we have models but no relations
    if ((stats.entityTypes['MODEL'] || 0) > 0 && stats.relationCount === 0) {
        questions.push('Are there relationships between models (belongsTo, hasMany)? Please provide files with relations.');
    }

    // If we have controller but no model
    if ((stats.entityTypes['CONTROLLER'] || 0) > 0 && (stats.entityTypes['MODEL'] || 0) === 0) {
        questions.push('Which model does this controller work with? Please provide the model file.');
    }

    return Array.from(new Set(questions)); // Deduplicate
}

/**
 * Neuron Request Processor
 * Handles the neuron activation flow with phase machine
 */
export class NeuronRequestProcessor extends BaseRequestProcessor {
    constructor() {
        super('NeuronRequestProcessor');
    }

    /**
     * Determine if this processor can handle the request
     */
    canProcess(request: RequestContext): boolean {
        // This is the default processor - handles requests that aren't actions, simulations, or forms
        const ctx = request.context;
        const actionType = this.getActionType(ctx);

        // Not for action requests
        if (actionType === 'step_result' || actionType === 'approve_action' ||
            (ctx['continue'] && ctx['step_result'])) {
            return false;
        }

        // Not for simulation requests
        if (ctx['simulation'] || ctx['replay'] || ctx['simulation_name']) {
            return false;
        }

        // Not for form requests
        if (ctx['form_submission'] || ctx['form_data'] || ctx['selected_choice']) {
            return false;
        }

        // Default to neuron processing
        return true;
    }

    /**
     * Determine execution mode (actions vs ai-actions)
     */
    private getExecutionMode(ctx: Record<string, unknown>): ExecutionMode {
        // AI-Actions mode if:
        // - ctx has 'ai_action' flag
        // - ctx has 'action' with AI-action type (dialog, coder, etc.)
        // - simulation with AI-action type
        if (ctx['ai_action'] === true) {
            return 'ai-actions';
        }

        const action = ctx['action'] as string | undefined;
        if (action) {
            const aiActionTypes = ['dialog', 'coder', 'coder-smart', 'auto-ai', 'chat'];
            if (aiActionTypes.includes(action)) {
                return 'ai-actions';
            }
        }

        const simulationName = ctx['simulation_name'] as string | undefined;
        if (simulationName) {
            const aiSimulationTypes = ['dialog', 'coder', 'coder-smart', 'auto-ai'];
            if (aiSimulationTypes.some(type => simulationName.toLowerCase().includes(type))) {
                return 'ai-actions';
            }
        }

        return 'actions';
    }

    /**
     * Get the request type this processor handles
     */
    getRequestType(): RequestType {
        return 'neuron';
    }

    /**
     * Main processing logic for neuron requests
     */
    protected async doProcess(request: RequestContext): Promise<ProcessResult> {
        const {promiseId, context, codeBlocks, message} = request;
        const ctx = context;

        // Add message to context if provided
        if (message) {
            ctx['message'] = message;
        }

        const taskText = this.parseTaskText(ctx);

        // Reset and initialize ContextManager
        const contextManager = resetContextManager();
        contextManager.set('task', taskText);

        // Analyze task detail level
        const taskAnalysis = taskText ? analyzeTaskDetail(taskText) : null;
        const taskDetailLevel = taskAnalysis?.level || 'short';

        // Determine execution mode
        const executionMode = this.getExecutionMode(ctx);

        logger.info('[NeuronRequestProcessor] Task analysis', {
            taskText: taskText?.substring(0, 50),
            detailLevel: taskDetailLevel,
            executionMode,
            wordCount: taskAnalysis?.wordCount,
            hasTechnicalTerms: taskAnalysis?.hasTechnicalTerms,
            hasFilePaths: taskAnalysis?.hasFilePaths,
        });

        // Initialize PhaseMachine with correct mode
        const phaseMachine = resetPhaseMachine(ctx, executionMode);

        // Setup AI-Actions if applicable
        if (executionMode === 'ai-actions') {
            const action = ctx['action'] as string | undefined;
            const availableActions = this.getAvailableAIActions(ctx);

            phaseMachine.setMode('ai-actions');
            phaseMachine.setAvailableActions(availableActions);

            if (action) {
                phaseMachine.setCurrentAction(action, 'llm-request');
            }

            logger.info('[NeuronRequestProcessor] AI-Actions mode enabled', {
                action,
                availableActions,
                promiseId,
            });

            // For AI-Actions, we skip the normal phase flow and prepare for LLM processing
            return this.handleAIActions(
                promiseId,
                phaseMachine,
                contextManager,
                taskText,
                ctx
            );
        }

        logger.info('[NeuronRequestProcessor] Processing request', {
            promiseId,
            executionMode,
            hasCodeBlocks: codeBlocks?.length ?? 0 > 0,
            hasInitialFiles: hasInitialProjectFiles(this.parseCodeBlocks(codeBlocks)),
            initialPhase: phaseMachine.getCurrentPhase(),
        });

        // PHASE 1: idle → discovery
        phaseMachine.transition('discovery', 'start processing');

        const blocks = this.parseCodeBlocks(codeBlocks);

        // Extract frameworks
        let frameworks: FrameworkDetectionResult | undefined;
        let frameworkTriggers: string[] = [];

        if (hasInitialProjectFiles(blocks)) {
            frameworks = extractFrameworks(blocks);
            frameworkTriggers = getFrameworkTriggers(frameworks);
            contextManager.set('frameworks', frameworks);

            logger.info('[NeuronRequestProcessor] Frameworks extracted', {
                frontend: frameworks.frontend,
                backend: frameworks.backend,
                triggers: frameworkTriggers,
            });
        }

        // PHASE 2: discovery → recognition
        phaseMachine.transition('recognition', 'proceed to entity recognition');

        // Parse existing graph
        const existingGraph = parseGraphFromContext(ctx);
        contextManager.set('graph', existingGraph);

        // Recognize entities
        let updatedGraph = existingGraph;
        let recognitionResult: { count: number; types: Record<string, number> } | undefined;
        let recognizedEntities: { entities: typeof existingGraph.entities; relations: typeof existingGraph.relations } | null = null;

        if (blocks.length > 0) {
            logger.debug('[NeuronRequestProcessor] Recognizing entities', {blockCount: blocks.length});

            const {entities, relations, errors} = recognizeEntitiesBatch(blocks);

            if (errors && errors.length > 0) {
                logger.warn('[NeuronRequestProcessor] Recognition errors', {errors});
            }

            logger.info('[NeuronRequestProcessor] Entities recognized', {
                entityCount: entities.length,
                relationCount: relations.length
            });

            // Merge recognized into existing graph
            updatedGraph = mergeRecognizedIntoGraph(existingGraph, {entities, relations});
            recognizedEntities = {entities, relations};

            // Store in ContextManager
            contextManager.set('graph', updatedGraph);
            contextManager.set('entities', {entities, relations});

            // Count entity types
            const entityTypes: Record<string, number> = {};
            for (const entity of entities) {
                entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
            }

            recognitionResult = {
                count: entities.length,
                types: entityTypes,
            };
        }

        // PHASE 3: recognition → analysis
        phaseMachine.transition('analysis', 'check graph completeness');

        // Check if graph is complete
        const completeness = isGraphComplete(updatedGraph, {taskText});

        // Auto transition based on results
        phaseMachine.autoTransition({
            hasEntities: (recognizedEntities?.entities.length ?? 0) > 0,
            isComplete: completeness.complete,
            hasQuestions: !completeness.complete,
            needsMoreFiles: completeness.missing.length > 0,
        });

        // Handle incomplete graph
        if (!completeness.complete) {
            return this.handleIncompleteGraph(
                promiseId,
                phaseMachine,
                contextManager,
                updatedGraph,
                completeness.missing,
                frameworks,
                frameworkTriggers,
                taskText
            );
        }

        // PHASE 4: analysis → action
        phaseMachine.transition('action', 'graph complete, activate neurons');

        // Activate neurons
        const activationResult = activateNeurons({
            taskText,
            codeBlocks: blocks,
            architecturalFeatures: [],
            frameworkTriggers,
        });

        const activatedIds = activationResult.activatedNeurons.map((a) => a.neuron.id);
        const requestFiles = Array.from(new Set([
            ...(activationResult.requestFiles ?? []),
            ...((ctx['request_files'] as string[]) ?? [])
        ]));

        // Store activated neurons
        contextManager.set('activated_neurons', activatedIds);

        // PHASE 5: action → validation
        phaseMachine.transition('validation', 'validate results');

        // PHASE 6: validation → completed
        phaseMachine.transition('completed', 'validation passed');

        // Generate tasks
        const tasks = this.generateTasks(taskText, taskAnalysis, taskDetailLevel);

        // Build context block
        const completedContextBlock = buildRequestContextBlock({
            architecturalFeatures: frameworkTriggers,
            graph: updatedGraph,
            ...(frameworks && {frameworks: frameworks as unknown as Record<string, unknown>}),
            ...(requestFiles.length > 0 && {requestFiles}),
        });

        logger.info('[NeuronRequestProcessor] Completed', {
            promiseId,
            activatedCount: activatedIds.length,
            activatedIds: activatedIds.slice(0, 5),
            entityCount: updatedGraph.entities.length,
            relationCount: updatedGraph.relations.length,
            phaseStats: phaseMachine.getStats(),
            contextStats: contextManager.getStats(),
        });

        return {
            outcome: 'completed',
            graph: updatedGraph,
            entities: recognitionResult,
            frameworks,
            context: completedContextBlock,
            activated_neuron_ids: activatedIds,
            request_files: requestFiles.length > 0 ? requestFiles : undefined,
            tasks,
            taskAnalysis: taskAnalysis ? {
                level: taskDetailLevel,
                needsContext: taskAnalysis.needsContext,
                needsFiles: taskAnalysis.needsFiles,
                readyForAi: taskAnalysis.readyForAi,
            } : undefined,
        };
    }

    /**
     * Handle incomplete graph case
     */
    private handleIncompleteGraph(
        promiseId: string,
        phaseMachine: PhaseMachine,
        contextManager: ContextManager,
        graph: Graph,
        missing: string[],
        frameworks: FrameworkDetectionResult | undefined,
        frameworkTriggers: string[],
        taskText: string
    ): ProcessResult {
        phaseMachine.transition('validation', 'graph incomplete');

        const questions = generateQuestions(missing, graph);
        contextManager.set('questions', questions);

        const contextBlock = buildRequestContextBlock({
            requestFiles: missing,
            architecturalFeatures: frameworkTriggers,
            graph,
            ...(frameworks && {frameworks: frameworks as unknown as Record<string, unknown>}),
            ...(taskText && {newTask: [taskText]}),
        });

        logger.info('[NeuronRequestProcessor] Graph incomplete', {
            promiseId,
            missing,
            questionCount: questions.length,
            frameworks: frameworks?.frontend,
            phaseStats: phaseMachine.getStats(),
        });

        return {
            outcome: 'graph_incomplete',
            graph,
            questions,
            missing,
            frameworks,
            context: contextBlock,
            request_files: missing,
        };
    }

    /**
     * Generate tasks for the response
     */
    private generateTasks(
        taskText: string,
        taskAnalysis: TaskAnalysis | null,
        taskDetailLevel: TaskDetailLevel
    ): Task[] {
        const tasks: Task[] = [];

        // Add user task
        if (taskText) {
            tasks.push({
                id: 'task-user-001',
                type: 'user_task',
                status: 'pending',
                description: taskText,
                source: 'user',
            });
        }

        // Add neuron tasks based on analysis
        const suggestedNeurons = getNeuronsByLevel(taskDetailLevel);

        if (taskAnalysis?.needsContext) {
            tasks.push({
                id: 'task-neuron-context-001',
                type: 'neuron_task',
                status: 'pending',
                description: 'Detect project framework and architecture context',
                source: 'neuron',
                neuronId: 'neuron-project-context-detector',
            });
        }

        tasks.push({
            id: 'task-neuron-analysis-001',
            type: 'neuron_task',
            status: 'pending',
            description: 'Analyze task detail level and classify task type',
            source: 'neuron',
            neuronId: 'neuron-task-semantic-analyzer',
        });

        if (taskAnalysis?.needsFiles) {
            tasks.push({
                id: 'task-neuron-files-001',
                type: 'neuron_task',
                status: 'pending',
                description: 'Collect required files based on task context',
                source: 'neuron',
                neuronId: 'neuron-file-collector',
            });
        }

        return tasks;
    }

    /**
     * Get available AI-Actions based on context
     */
    private getAvailableAIActions(ctx: Record<string, unknown>): string[] {
        const actions: string[] = [];

        // Base AI-Actions available in this system
        const baseActions = [
            'dialog',      // Dialog with user
            'coder',       // Code modification
            'coder-smart', // Smart code modification
            'read-file',  // Read files
            'write-file',  // Write files
            'rag-search',  // RAG search
            'execute-command', // Execute commands
        ];

        // Add action from context if present
        const contextAction = ctx['action'] as string | undefined;
        if (contextAction && !baseActions.includes(contextAction)) {
            actions.push(contextAction);
        }

        // Add simulation-specific actions
        const simulationName = ctx['simulation_name'] as string | undefined;
        if (simulationName) {
            if (simulationName.includes('dialog')) {
                actions.push('dialog');
            } else if (simulationName.includes('coder')) {
                actions.push('coder');
            }
        }

        // Always include base actions
        return [...new Set([...actions, ...baseActions])];
    }

    /**
     * Handle AI-Actions mode - prepare for LLM-driven processing
     */
    private async handleAIActions(
        promiseId: string,
        phaseMachine: PhaseMachine,
        contextManager: ContextManager,
        taskText: string | null,
        ctx: Record<string, unknown>
    ): Promise<ProcessResult> {
        const action = ctx['action'] as string | undefined;
        const availableActions = phaseMachine.getAvailableActions();

        logger.info('[NeuronRequestProcessor] Handling AI-Actions', {
            promiseId,
            action,
            availableActions,
            phase: phaseMachine.getCurrentPhase(),
        });

        // Transition to action phase for AI-Actions
        phaseMachine.transition('action', 'AI-Actions mode');

        // Build context for LLM
        const contextBlock = buildRequestContextBlock({
            newTask: taskText ? [taskText] : [],
            context: contextManager.getAll(),
        });

        // For AI-Actions, we return a special outcome that signals
        // the server should send available actions to LLM
        return {
            outcome: 'ai_action_ready',
            context: contextBlock,
            tasks: [
                {
                    id: `task-ai-action-${Date.now()}`,
                    type: 'ai_action',
                    status: 'pending',
                    description: action || 'AI-driven action',
                    source: 'ai-action',
                },
            ],
            // Include AI-Actions metadata
            aiActions: {
                action,
                availableActions,
                mode: 'llm-driven',
                step: 'llm-request',
            },
        };
    }
}

// Singleton instance
export const neuronRequestProcessor = new NeuronRequestProcessor();
