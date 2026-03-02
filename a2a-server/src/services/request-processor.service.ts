/**
 * Request Processor Service
 * Processes requests: recognizes entities, builds graph, activates neurons
 *
 * IMPORTANT: Server does NOT store client data!
 * Graph is passed in context and returned in response.
 * ContextManager is reset per request (resetContextManager) — no cache of context/code between iterations.
 *
 * Flow (with PhaseMachine):
 * 1. Get pending request
 * 2. Initialize ContextManager and PhaseMachine
 * 3. idle → discovery: Extract frameworks from package.json/composer.json
 * 4. discovery → recognition: Recognize entities from codeBlocks
 * 5. recognition → analysis: Check graph completeness
 * 6. analysis → action: Activate neurons (if complete)
 * 7. action → validation: Validate results
 * 8. validation → completed: Return result with updated graph
 *
 * Flow (with Actions - no-ai):
 * 1. Get pending request with new_task
 * 2. Find matching action in ActionRegistry
 * 3. Return action_proposal with code for first step
 * 4. Client executes code, sends continue with step_result
 * 5. Process step result, return next step with code
 * 6. Repeat until completed
 */

import {requestService} from './request.service.js';
import {logger} from '../utils/logger.js';
import {activateNeurons} from './neuron-activator.service.js';
import {recognizeEntitiesBatch} from './entity-recognizer.service.js';
import {
    parseGraphFromContext,
    mergeRecognizedIntoGraph,
    isGraphComplete,
    getGraphStats,
    isGraphEmpty,
    type Graph
} from './graph-store.service.js';
import {
    extractFrameworks,
    hasInitialProjectFiles,
    getFrameworkTriggers,
    type ExtractedFrameworks
} from './framework-extractor.service.js';
import {PhaseMachine, getPhaseMachine, resetPhaseMachine, type Phase} from './phase-machine.service.js';
import {ContextManager, getContextManager, resetContextManager} from './context-manager.service.js';
import {
    buildRequestContextBlock,
    buildRequestApiResult
} from '../protocol/message-builder.js';
import {analyzeTaskDetail, getNeuronsByLevel, type TaskDetailLevel} from '../utils/task-detail-analyzer.js';
import {actionProcessor} from '../actions/action-processor.js';
import type {CodeBlock} from '../types/entity.types.js';
import type {RequestContextBlock} from '../types/index.js';

/**
 * Task interface for tasks[] in response
 */
export interface Task {
    id: string;
    type: 'user_task' | 'neuron_task';
    status: 'pending' | 'in_progress' | 'completed';
    description: string;
    source: 'user' | 'neuron';
    neuronId?: string;
}

const DEFAULT_INTERVAL_MS = 5000;

let timerId: ReturnType<typeof setInterval> | null = null;

export type ProcessOutcome = 'completed' | 'failed' | 'graph_incomplete' | 'action_proposal';

interface ProcessResult {
    outcome: ProcessOutcome;
    graph?: Graph | undefined;
    entities?: { count: number; types: Record<string, number> } | undefined;
    relations?: { count: number } | undefined;
    questions?: string[] | undefined;
    missing?: string[] | undefined;
    frameworks?: ExtractedFrameworks | undefined;
    /** Context block for client */
    context?: RequestContextBlock | undefined;
    /** Files requested from client */
    request_files?: string[] | undefined;
    /** Activated neuron IDs */
    activated_neuron_ids?: string[] | undefined;
    /** Tasks for the new architecture */
    tasks?: Task[] | undefined;
    /** Task analysis result */
    taskAnalysis?: {
        level: TaskDetailLevel;
        needsContext: boolean;
        needsFiles: boolean;
        readyForAi: boolean;
    } | undefined;
    /** Action for no-ai mode - contains code to execute on client */
    action?: {
        id?: string;
        title?: string;
        matchScore?: number;
        currentStep?: {
            id: string;
            title: string;
            code?: string;
        } | null;
        nextSteps?: Array<{ id: string; title: string }>;
    } | null | undefined;
    /** Execute command for client (new protocol format) */
    execute?: {
        form?: {
            title?: string;
            choices?: Array<{ id: string; label: string }>;
        };
        script?: {
            input: Record<string, unknown>;
            output: string;
            code: string;
        };
        message?: string;
    } | undefined;
}

function parseTaskText(ctx: Record<string, unknown>): string {
    // Check task (top-level field - PRIMARY for simulations)
    const task = ctx['task'];
    if (task) {
        if (Array.isArray(task)) return task.join(' ');
        if (typeof task === 'string') return task;
    }

    // Check new_task (standard field)
    const nt = ctx['new_task'];
    if (nt) {
        if (Array.isArray(nt)) return nt.join(' ');
        if (typeof nt === 'string') return nt;
    }

    // Check message (from invoke)
    const msg = ctx['message'];
    if (msg) {
        if (Array.isArray(msg)) return msg.join(' ');
        if (typeof msg === 'string') return msg;
    }

    // Check context.task (nested context)
    const nestedCtx = ctx['context'] as Record<string, unknown> | undefined;
    if (nestedCtx?.['task']) {
        if (Array.isArray(nestedCtx['task'])) return (nestedCtx['task'] as string[]).join(' ');
        if (typeof nestedCtx['task'] === 'string') return nestedCtx['task'] as string;
    }

    return '';
}

function parseCodeBlocks(blocks: unknown): CodeBlock[] {
    if (!Array.isArray(blocks)) return [];
    return blocks
        .filter((b): b is { path: string; content: string } =>
            typeof b === 'object' && b !== null &&
            typeof (b as Record<string, unknown>)['path'] === 'string' &&
            typeof (b as Record<string, unknown>)['content'] === 'string'
        )
        .map(b => ({path: b['path'], content: b['content']}));
}

/**
 * Generate questions based on missing graph elements
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

export async function processOneRequest(): Promise<ProcessResult | null> {
    const request = await requestService.getNextPending();
    if (!request) return null;

    const {promiseId, context, codeBlocks, message} = request;
    const ctx = (context as Record<string, unknown>) ?? {};

    // Add message to context if provided
    if (message) {
        ctx['message'] = message;
    }

    try {
        // ========================================
        // PARSE TASK TEXT EARLY (needed for both action flow and legacy flow)
        // ========================================
        const taskText = parseTaskText(ctx);

        // ========================================
        // ACTION FLOW: Handle action-based requests (no-AI mode)
        // ========================================

        const actionType = ctx['action'] as string | undefined;
        const sessionId = ctx['session_id'] as string || promiseId;

        // Handle step_result - client sends step result after executing code
        if (actionType === 'step_result' || (ctx['continue'] && ctx['step_result'])) {
            logger.info('[RequestProcessor] Processing step_result', {
                stepId: ctx['stepId'] || ctx['step_id'],
                actionType,
            });

            const stepId = ctx['stepId'] as string || ctx['step_id'] as string;
            const stepResult = ctx['stepResult'] || ctx['step_result'];

            if (!stepId || !stepResult) {
                logger.warn('[RequestProcessor] Missing stepId or stepResult', {stepId, stepResult});
            }

            const result = await actionProcessor.processStepResult(sessionId, stepId, stepResult);

            // Determine response type: action_executing if more steps, action_complete if done
            const responseType = result.continue ? 'action_executing' : 'action_complete';

            // Format result based on response type with execute.* format
            let resultData: Record<string, unknown>;
            if (result.continue) {
                // More steps remaining - return execute.script format
                const currentStep = result.currentStep;
                resultData = {
                    context: result.message.context,
                    execute: currentStep?.code ? {
                        script: {
                            input: {},
                            output: 'step_result',
                            code: currentStep.code
                        }
                    } : undefined,
                    executingAction: result.message.executingAction || {
                        actionId: result.currentStep?.id || '',
                        title: result.currentStep?.title || '',
                    },
                    nextSteps: result.message.nextSteps || [],
                };
            } else {
                // All steps completed - return execute.message format
                resultData = {
                    context: result.message.context,
                    execute: {
                        message: result.message.message || 'Action completed'
                    },
                    completed: true,
                };
            }

            // Update request status
            await requestService.updateStatus(promiseId, 'completed', {
                outcome: 'completed',
                ...resultData,
            });

            // Return result with execute.* format
            if (result.continue) {
                const currentStep = result.currentStep;
                return {
                    outcome: 'completed',
                    context: result.message.context,
                    activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
                    action: result.message.action,
                    execute: currentStep?.code ? {
                        script: {
                            input: {},
                            output: 'step_result',
                            code: currentStep.code
                        }
                    } : undefined,
                };
            } else {
                return {
                    outcome: 'completed',
                    context: result.message.context,
                    activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
                    action: result.message.action,
                    execute: {
                        message: result.message.message || 'Action completed'
                    },
                };
            }
        }

        // Handle task_request - client sends new task, we propose actions
        if (actionType === 'task_request' || actionType === undefined) {
            const taskText = parseTaskText(ctx);

            if (taskText) {
                logger.info('[RequestProcessor] Processing task_request', {taskText: taskText.substring(0, 50)});

                const actionResult = await actionProcessor.processTaskRequest(sessionId, taskText);

                if (actionResult.continue && actionResult.actionId) {
                    logger.info('[RequestProcessor] Action matched', {
                        actionId: actionResult.actionId,
                        step: actionResult.currentStep?.id,
                    });

                    // Format result for action_proposal response (execute.form.choices format - new protocol)
                    const resultData = {
                        context: actionResult.message.context,
                        execute: {
                            form: {
                                title: 'Оберіть спосіб виконання',
                                choices: [
                                    ...(actionResult.message.action ? [{
                                        id: actionResult.message.action.id || actionResult.actionId,
                                        label: actionResult.message.action.title
                                    }] : []),
                                    {
                                        id: 'auto-ai',
                                        label: 'AI Action Generator — сгенерировать экшен с помощью LLM'
                                    },
                                    {
                                        id: 'task-decomposition',
                                        label: 'Декомпозиция задачи вручную'
                                    }
                                ]
                            }
                        }
                    };

                    // Update request status to completed with action result
                    await requestService.updateStatus(promiseId, 'completed', {
                        outcome: 'action_proposal',
                        ...resultData,
                    });

                    // Return action_proposal response with execute.form.choices format
                    return {
                        outcome: 'action_proposal',
                        context: actionResult.message.context,
                        activated_neuron_ids: [actionResult.actionId],
                        action: actionResult.message.action,
                        execute: {
                            form: {
                                title: 'Оберіть спосіб виконання',
                                choices: [
                                    ...(actionResult.message.action ? [{
                                        id: actionResult.message.action.id || actionResult.actionId,
                                        label: actionResult.message.action.title
                                    }] : []),
                                    {
                                        id: 'auto-ai',
                                        label: 'AI Action Generator — сгенерировать экшен с помощью LLM'
                                    },
                                    {
                                        id: 'task-decomposition',
                                        label: 'Декомпозиция задачи вручную'
                                    }
                                ]
                            }
                        }
                    };
                }
            }
        }

        // Handle approve_action - client approved selected action, we start execution
        if (actionType === 'approve_action') {
            logger.info('[RequestProcessor] Processing approve_action', {
                selectedAction: ctx['selectedAction'],
            });

            const selectedAction = ctx['selectedAction'] as { actionId: string } | undefined;

            if (!selectedAction?.actionId) {
                logger.warn('[RequestProcessor] Missing selectedAction.actionId');
            }

            // Start action execution
            const actionResult = await actionProcessor.approveAction(sessionId, selectedAction?.actionId || '');

            // Format result for action_executing response (execute.script format - new protocol)
            const currentStep = actionResult.currentStep;
            const resultData = {
                context: actionResult.message.context,
                execute: currentStep?.code ? {
                    script: {
                        input: {},
                        output: 'step_result',
                        code: currentStep.code
                    }
                } : undefined,
                executingAction: actionResult.message.executingAction,
                nextSteps: actionResult.message.nextSteps,
            };

            // Update request status
            await requestService.updateStatus(promiseId, 'completed', {
                outcome: 'completed',
                ...resultData,
            });

            // Return action_executing response with execute.script format
            return {
                outcome: 'completed',
                context: actionResult.message.context,
                activated_neuron_ids: actionResult.actionId ? [actionResult.actionId] : undefined,
                action: actionResult.message.action,
                execute: currentStep?.code ? {
                    script: {
                        input: {},
                        output: 'step_result',
                        code: currentStep.code
                    }
                } : undefined,
            };
        }

        // ========================================
        // PHASE 0: Initialization (existing flow)
        // ========================================

        // Reset and initialize ContextManager
        const contextManager = resetContextManager();
        contextManager.set('task', taskText);

        // Analyze task detail level using TaskDetailAnalyzer
        const taskAnalysis = taskText ? analyzeTaskDetail(taskText) : null;
        const taskDetailLevel = taskAnalysis?.level || 'short';

        logger.info('[RequestProcessor] Task analysis', {
            taskText: taskText?.substring(0, 50),
            detailLevel: taskDetailLevel,
            wordCount: taskAnalysis?.wordCount,
            hasTechnicalTerms: taskAnalysis?.hasTechnicalTerms,
            hasFilePaths: taskAnalysis?.hasFilePaths,
        });

        // Initialize PhaseMachine with context
        const phaseMachine = resetPhaseMachine(ctx);

        logger.info('[RequestProcessor] Processing request', {
            promiseId,
            hasCodeBlocks: codeBlocks?.length ?? 0 > 0,
            hasInitialFiles: hasInitialProjectFiles(parseCodeBlocks(codeBlocks)),
            initialPhase: phaseMachine.getCurrentPhase(),
        });

        // ========================================
        // PHASE 1: idle → discovery
        // ========================================
        phaseMachine.transition('discovery', 'start processing');
        logger.info('[RequestProcessor] Phase transition', {
            phase: 'discovery',
            reason: 'start processing'
        });

        const blocks = parseCodeBlocks(codeBlocks);

        // Extract frameworks from package.json/composer.json (if present)
        let frameworks: ExtractedFrameworks | undefined;
        let frameworkTriggers: string[] = [];

        if (hasInitialProjectFiles(blocks)) {
            frameworks = extractFrameworks(blocks);
            frameworkTriggers = getFrameworkTriggers(frameworks);
            contextManager.set('frameworks', frameworks);

            logger.info('[RequestProcessor] Frameworks extracted', {
                frontend: frameworks.frontend,
                backend: frameworks.backend,
                triggers: frameworkTriggers,
            });
        }

        // ========================================
        // PHASE 2: discovery → recognition
        // ========================================
        const discoveryToRecognition = phaseMachine.transition('recognition', 'proceed to entity recognition');
        logger.info('[RequestProcessor] Phase transition', {
            phase: 'recognition',
            success: discoveryToRecognition.success,
            reason: 'proceed to entity recognition'
        });

        // Parse existing graph from context (from client)
        const existingGraph = parseGraphFromContext(ctx);
        contextManager.set('graph', existingGraph);

        logger.debug('[RequestProcessor] Existing graph', {
            entityCount: existingGraph.entities.length,
            relationCount: existingGraph.relations.length
        });

        // Recognize entities from codeBlocks
        let updatedGraph = existingGraph;
        let recognitionResult: { count: number; types: Record<string, number> } | undefined;
        let recognizedEntities: {
            entities: typeof existingGraph.entities;
            relations: typeof existingGraph.relations
        } | null = null;

        if (blocks.length > 0) {
            logger.debug('[RequestProcessor] Recognizing entities', {blockCount: blocks.length});

            const {entities, relations, errors} = recognizeEntitiesBatch(blocks);

            if (errors && errors.length > 0) {
                logger.warn('[RequestProcessor] Recognition errors', {errors});
            }

            logger.info('[RequestProcessor] Entities recognized', {
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

        // ========================================
        // PHASE 3: recognition → analysis
        // ========================================
        const recognitionToAnalysis = phaseMachine.transition('analysis', 'check graph completeness');
        logger.info('[RequestProcessor] Phase transition', {
            phase: 'analysis',
            success: recognitionToAnalysis.success,
            reason: 'check graph completeness'
        });

        // Check if graph is complete
        const completeness = isGraphComplete(updatedGraph, {taskText});

        // Auto transition based on results
        const autoTransitionResult = phaseMachine.autoTransition({
            hasEntities: (recognizedEntities?.entities.length ?? 0) > 0,
            isComplete: completeness.complete,
            hasQuestions: !completeness.complete,
            needsMoreFiles: completeness.missing.length > 0,
        });

        logger.info('[RequestProcessor] Auto transition result', {
            success: autoTransitionResult.success,
            from: autoTransitionResult.previousPhase,
            to: autoTransitionResult.currentPhase,
            canContinue: autoTransitionResult.canContinue,
        });

        // ========================================
        // Handle incomplete graph (validation phase)
        // ========================================
        if (!completeness.complete) {
            // Transition to validation for incomplete graph
            phaseMachine.transition('validation', 'graph incomplete');

            const questions = generateQuestions(completeness.missing, updatedGraph);
            contextManager.set('questions', questions);

            // Get context for validation phase
            const phaseContext = contextManager.getForPhase('validation');

            // Build context block for client
            const contextBlock = buildRequestContextBlock({
                requestFiles: completeness.missing,
                architecturalFeatures: frameworkTriggers,
                graph: updatedGraph,
                ...(frameworks && {frameworks: frameworks as unknown as Record<string, unknown>}),
                ...(taskText && {newTask: [taskText]}),
            });

            await requestService.updateStatus(promiseId, 'completed', {
                outcome: 'graph_incomplete',
                message: 'Graph incomplete, need more context',
                context: contextBlock,
                graph: updatedGraph,
                graph_stats: getGraphStats(updatedGraph),
                questions,
                missing: completeness.missing,
                frameworks,
            });

            logger.info('[RequestProcessor] Graph incomplete', {
                promiseId,
                missing: completeness.missing,
                questionCount: questions.length,
                frameworks: frameworks?.frontend,
                phaseStats: phaseMachine.getStats(),
            });

            return {
                outcome: 'graph_incomplete',
                graph: updatedGraph,
                questions,
                missing: completeness.missing,
                frameworks,
                context: contextBlock,
                request_files: completeness.missing,
            };
        }

        // ========================================
        // PHASE 4: analysis → action
        // ========================================
        const analysisToAction = phaseMachine.transition('action', 'graph complete, activate neurons');
        logger.info('[RequestProcessor] Phase transition', {
            phase: 'action',
            success: analysisToAction.success,
            reason: 'graph complete, activate neurons'
        });

        // Activate neurons
        const activationResult = activateNeurons({
            taskText,
            codeBlocks: blocks,
            architecturalFeatures: [],
            frameworkTriggers,
        });

        const activatedIds = activationResult.activatedNeurons.map((a) => a.neuron.id);
        const requestFiles = Array.from(new Set([...(activationResult.requestFiles ?? []), ...((ctx['request_files'] as string[]) ?? [])]));

        // Store activated neurons in context
        contextManager.set('activated_neurons', activatedIds);

        // ========================================
        // PHASE 5: action → validation
        // ========================================
        const actionToValidation = phaseMachine.transition('validation', 'validate results');
        logger.info('[RequestProcessor] Phase transition', {
            phase: 'validation',
            success: actionToValidation.success,
            reason: 'validate results'
        });

        // ========================================
        // PHASE 6: validation → completed
        // ========================================
        const validationToCompleted = phaseMachine.transition('completed', 'validation passed');
        logger.info('[RequestProcessor] Phase transition', {
            phase: 'completed',
            success: validationToCompleted.success,
            reason: 'validation passed'
        });

        // Get final context for completed phase
        const finalContext = contextManager.getForPhase('completed');

        // Generate tasks for new architecture
        const tasks: Task[] = [];

        // Add user task (original task from user)
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

        // Build context block for client
        const completedContextBlock = buildRequestContextBlock({
            architecturalFeatures: frameworkTriggers,
            graph: updatedGraph,
            ...(frameworks && {frameworks: frameworks as unknown as Record<string, unknown>}),
            // NOTE: new_task is NOT passed to response anymore - it's in tasks[]
            ...(requestFiles.length > 0 && {requestFiles}),
        });

        // Return completed result with updated graph
        await requestService.updateStatus(promiseId, 'completed', {
            outcome: 'completed',
            message: 'Request processed successfully',
            context: completedContextBlock,
            graph: updatedGraph,
            graph_stats: getGraphStats(updatedGraph),
            injected_content: activationResult.injectedContent,
            activated_neuron_ids: activatedIds,
            entities: recognitionResult,
            frameworks,
            questions: [],
            index_answers: [],
            // Include tasks in response
            tasks,
        });

        logger.info('[RequestProcessor] Completed', {
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
            // Include tasks in response
            tasks,
            taskAnalysis: taskAnalysis ? {
                level: taskDetailLevel,
                needsContext: taskAnalysis.needsContext,
                needsFiles: taskAnalysis.needsFiles,
                readyForAi: taskAnalysis.readyForAi,
            } : undefined,
        };

    } catch (err) {
        logger.error('[RequestProcessor] Error', {promiseId, error: String(err)});
        await requestService.updateStatus(promiseId, 'failed', undefined, {
            code: 'PROCESS_ERROR',
            message: String(err),
        });
        return {outcome: 'failed'};
    }
}

async function tick(): Promise<void> {
    const result = await processOneRequest();
    if (result?.outcome === 'failed') {
        // Don't stop processor on failure, continue processing
        logger.warn('[RequestProcessor] Request failed, continuing...');
    }
}

export function startRequestProcessor(intervalMs: number = DEFAULT_INTERVAL_MS): void {
    if (timerId) return;
    logger.info('[RequestProcessor] Started', {intervalMs});
    timerId = setInterval(() => {
        tick().catch((err) => {
            logger.error('[RequestProcessor] Tick error', {error: String(err)});
        });
    }, intervalMs);
}

export function stopRequestProcessor(): void {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
        logger.info('[RequestProcessor] Stopped');
    }
}
