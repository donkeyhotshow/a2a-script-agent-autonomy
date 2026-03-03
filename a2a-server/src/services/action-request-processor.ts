/**
 * Action Request Processor
 * 
 * Handles processing of action requests including task analysis, action proposal,
 * and action execution. Extracted from request-processor.service.ts for better
 * separation of concerns.
 */

import {logger} from '../utils/logger.js';
import {ActionService} from './action.service.js';
import {GraphStore} from './graph-store.service.js';
import {TaskAnalyzer} from './task-analyzer.service.js';
import {TaskDetailLevel} from './task-analyzer.service.js';
import {
    ActionRequest,
    ActionContext,
    ActionStep,
    ActionProposal,
    ActionExecution,
    ActionResult,
    ExecuteCommand,
    ProcessResult,
    ProcessOutcome,
    Task,
    TaskAnalysis
} from './request-processor.interfaces.js';
import {CodeBlock} from '../types/entity.types.js';
import {ExtractedFrameworks} from './framework-extractor.service.js';
import {Graph} from './graph-store.service.js';

/**
 * Action Request Processor
 * 
 * Manages the complete action request processing workflow including:
 * - Task analysis and classification
 * - Action proposal generation
 * - Action execution and step management
 * - Result formatting and response generation
 */
export class ActionRequestProcessor {
    private actionService: ActionService;
    private graphStore: GraphStore;
    private taskAnalyzer: TaskAnalyzer;

    constructor(actionService: ActionService, graphStore: GraphStore, taskAnalyzer: TaskAnalyzer) {
        this.actionService = actionService;
        this.graphStore = graphStore;
        this.taskAnalyzer = taskAnalyzer;
    }

    /**
     * Process an action request
     */
    async processActionRequest(request: ActionRequest): Promise<ProcessResult> {
        try {
            logger.info('[ActionRequestProcessor] Processing action request', {
                sessionId: request.sessionId,
                actionType: request.actionType
            });

            // Get the graph for this session
            const graph = await this.graphStore.getGraph(request.sessionId);
            if (!graph) {
                throw new Error(`No graph found for session: ${request.sessionId}`);
            }

            // Analyze the task
            const taskAnalysis = await this.analyzeTask(request.sessionId, request.context, request.codeBlocks);
            
            // Generate action proposals
            const proposals = await this.generateActionProposals(
                request.sessionId,
                request.actionType,
                request.context,
                request.codeBlocks,
                graph,
                taskAnalysis
            );

            // Select the best proposal
            const selectedProposal = this.selectBestProposal(proposals);
            
            if (!selectedProposal) {
                throw new Error('No suitable action proposal found');
            }

            // Execute the action
            const execution = await this.executeAction(request.sessionId, selectedProposal);

            // Format the result
            const result = this.formatActionResult(request.sessionId, selectedProposal, execution);

            logger.info('[ActionRequestProcessor] Action request completed', {
                sessionId: request.sessionId,
                actionId: selectedProposal.id,
                outcome: result.outcome
            });

            return result;

        } catch (error) {
            logger.error('[ActionRequestProcessor] Error processing action request', {
                sessionId: request.sessionId,
                actionType: request.actionType,
                error: error instanceof Error ? error.message : String(error)
            });

            return {
                outcome: 'failed',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Analyze the task from the request
     */
    private async analyzeTask(
        sessionId: string,
        context: Record<string, unknown>,
        codeBlocks: unknown
    ): Promise<TaskAnalysis> {
        try {
            const taskText = context['task'] as string || '';
            const codeBlockArray = Array.isArray(codeBlocks) ? codeBlocks : [];

            const analysis = await this.taskAnalyzer.analyzeTask(taskText, codeBlockArray as CodeBlock[]);

            logger.info('[ActionRequestProcessor] Task analysis completed', {
                sessionId,
                level: analysis.level,
                needsContext: analysis.needsContext,
                needsFiles: analysis.needsFiles,
                readyForAi: analysis.readyForAi
            });

            return analysis;

        } catch (error) {
            logger.error('[ActionRequestProcessor] Task analysis failed', {
                sessionId,
                error: error instanceof Error ? error.message : String(error)
            });

            return {
                level: 'short',
                needsContext: true,
                needsFiles: true,
                readyForAi: false
            };
        }
    }

    /**
     * Generate action proposals based on the request
     */
    private async generateActionProposals(
        sessionId: string,
        actionType: string,
        context: Record<string, unknown>,
        codeBlocks: unknown,
        graph: Graph,
        taskAnalysis: TaskAnalysis
    ): Promise<ActionProposal[]> {
        try {
            const proposals: ActionProposal[] = [];

            // Get available actions from the action service
            const availableActions = await this.actionService.getAvailableActions(sessionId);

            // Generate proposals based on action type and context
            for (const action of availableActions) {
                const matchScore = this.calculateActionMatchScore(
                    actionType,
                    action,
                    context,
                    taskAnalysis
                );

                if (matchScore > 0.5) { // Only include relevant actions
                    const steps = await this.generateActionSteps(action.id, context, codeBlocks, graph);
                    
                    proposals.push({
                        id: action.id,
                        title: action.name,
                        matchScore,
                        currentStep: null,
                        nextSteps: steps
                    });
                }
            }

            // Sort by match score
            proposals.sort((a, b) => b.matchScore - a.matchScore);

            logger.info('[ActionRequestProcessor] Generated action proposals', {
                sessionId,
                proposalCount: proposals.length,
                actionType
            });

            return proposals;

        } catch (error) {
            logger.error('[ActionRequestProcessor] Failed to generate action proposals', {
                sessionId,
                actionType,
                error: error instanceof Error ? error.message : String(error)
            });

            return [];
        }
    }

    /**
     * Calculate match score between requested action and available action
     */
    private calculateActionMatchScore(
        requestedActionType: string,
        availableAction: any,
        context: Record<string, unknown>,
        taskAnalysis: TaskAnalysis
    ): number {
        let score = 0;

        // Exact match
        if (availableAction.id === requestedActionType || availableAction.name === requestedActionType) {
            score += 0.8;
        }

        // Type-based matching
        if (availableAction.type === requestedActionType) {
            score += 0.6;
        }

        // Context-based scoring
        const taskText = context['task'] as string || '';
        if (taskText && availableAction.description) {
            const description = availableAction.description.toLowerCase();
            const taskLower = taskText.toLowerCase();
            
            if (description.includes(taskLower) || taskLower.includes(description)) {
                score += 0.3;
            }
        }

        // Task analysis scoring
        if (taskAnalysis.readyForAi && availableAction.complexity === 'simple') {
            score += 0.2;
        }

        if (taskAnalysis.needsContext && availableAction.requiresContext) {
            score += 0.1;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Generate action steps for a specific action
     */
    private async generateActionSteps(
        actionId: string,
        context: Record<string, unknown>,
        codeBlocks: unknown,
        graph: Graph
    ): Promise<ActionStep[]> {
        try {
            const steps: ActionStep[] = [];

            // Get action details
            const actionDetails = await this.actionService.getActionDetails(actionId);

            if (actionDetails?.steps) {
                // Use predefined steps from action service
                for (const step of actionDetails.steps) {
                    steps.push({
                        id: step.id,
                        title: step.title,
                        code: step.code
                    });
                }
            } else {
                // Generate generic steps based on action type
                steps.push({
                    id: 'analyze',
                    title: 'Analyze the request and context',
                    code: this.generateAnalysisCode(actionId, context, codeBlocks)
                });

                steps.push({
                    id: 'execute',
                    title: 'Execute the action',
                    code: this.generateExecutionCode(actionId, context, codeBlocks, graph)
                });

                steps.push({
                    id: 'validate',
                    title: 'Validate the results',
                    code: this.generateValidationCode(actionId, context)
                });
            }

            logger.debug('[ActionRequestProcessor] Generated action steps', {
                actionId,
                stepCount: steps.length
            });

            return steps;

        } catch (error) {
            logger.error('[ActionRequestProcessor] Failed to generate action steps', {
                actionId,
                error: error instanceof Error ? error.message : String(error)
            });

            return [];
        }
    }

    /**
     * Generate analysis code for an action
     */
    private generateAnalysisCode(actionId: string, context: Record<string, unknown>, codeBlocks: unknown): string {
        return `
// Analysis for ${actionId}
const analysis = {
    actionId: '${actionId}',
    context: ${JSON.stringify(context, null, 2)},
    codeBlocks: ${JSON.stringify(codeBlocks, null, 2)},
    timestamp: new Date().toISOString()
};

console.log('Analyzing action:', analysis);
return analysis;
        `.trim();
    }

    /**
     * Generate execution code for an action
     */
    private generateExecutionCode(
        actionId: string,
        context: Record<string, unknown>,
        codeBlocks: unknown,
        graph: Graph
    ): string {
        return `
// Execution for ${actionId}
const execution = {
    actionId: '${actionId}',
    context: ${JSON.stringify(context, null, 2)},
    codeBlocks: ${JSON.stringify(codeBlocks, null, 2)},
    graph: {
        entities: ${graph.entities.length},
        relations: ${graph.relations.length}
    },
    timestamp: new Date().toISOString()
};

console.log('Executing action:', execution);
return execution;
        `.trim();
    }

    /**
     * Generate validation code for an action
     */
    private generateValidationCode(actionId: string, context: Record<string, unknown>): string {
        return `
// Validation for ${actionId}
const validation = {
    actionId: '${actionId}',
    context: ${JSON.stringify(context, null, 2)},
    isValid: true,
    timestamp: new Date().toISOString()
};

console.log('Validating action:', validation);
return validation;
        `.trim();
    }

    /**
     * Select the best action proposal
     */
    private selectBestProposal(proposals: ActionProposal[]): ActionProposal | null {
        if (proposals.length === 0) {
            return null;
        }

        // Return the proposal with highest match score
        return proposals[0];
    }

    /**
     * Execute an action proposal
     */
    private async executeAction(
        sessionId: string,
        proposal: ActionProposal
    ): Promise<ActionExecution> {
        try {
            // Start execution
            const execution: ActionExecution = {
                actionId: proposal.id,
                currentStep: null,
                nextSteps: proposal.nextSteps,
                continue: true,
                message: {
                    context: {},
                    action: proposal,
                    executingAction: {
                        actionId: proposal.id,
                        title: proposal.title
                    },
                    nextSteps: proposal.nextSteps
                }
            };

            logger.info('[ActionRequestProcessor] Executing action', {
                sessionId,
                actionId: proposal.id,
                stepCount: proposal.nextSteps.length
            });

            return execution;

        } catch (error) {
            logger.error('[ActionRequestProcessor] Action execution failed', {
                sessionId,
                actionId: proposal.id,
                error: error instanceof Error ? error.message : String(error)
            });

            return {
                actionId: proposal.id,
                currentStep: null,
                nextSteps: [],
                continue: false,
                message: {
                    context: {},
                    message: `Action execution failed: ${error instanceof Error ? error.message : String(error)}`
                }
            };
        }
    }

    /**
     * Format the action result
     */
    private formatActionResult(
        sessionId: string,
        proposal: ActionProposal,
        execution: ActionExecution
    ): ProcessResult {
        const result: ProcessResult = {
            outcome: execution.continue ? 'completed' : 'failed',
            action: {
                id: proposal.id,
                title: proposal.title,
                matchScore: proposal.matchScore,
                currentStep: execution.currentStep,
                nextSteps: execution.nextSteps
            },
            execute: this.formatExecuteCommand(proposal, execution)
        };

        if (!execution.continue) {
            result.error = execution.message.message;
        }

        logger.debug('[ActionRequestProcessor] Formatted action result', {
            sessionId,
            actionId: proposal.id,
            outcome: result.outcome
        });

        return result;
    }

    /**
     * Format execute command for the response
     */
    private formatExecuteCommand(proposal: ActionProposal, execution: ActionExecution): ExecuteCommand {
        const execute: ExecuteCommand = {};

        if (execution.nextSteps.length > 0) {
            // Create form for step selection
            execute.form = {
                title: `Action: ${proposal.title}`,
                choices: execution.nextSteps.map(step => ({
                    id: step.id,
                    label: step.title
                }))
            };
        } else {
            // Create script execution
            execute.script = {
                input: {
                    actionId: proposal.id,
                    title: proposal.title,
                    matchScore: proposal.matchScore
                },
                output: `Action ${proposal.id} completed successfully`,
                code: `console.log("Action ${proposal.id} executed");`
            };
        }

        return execute;
    }

    /**
     * Handle action result processing
     */
    async processActionResult(
        sessionId: string,
        actionId: string,
        result: any
    ): Promise<ProcessResult> {
        try {
            logger.info('[ActionRequestProcessor] Processing action result', {
                sessionId,
                actionId,
                resultType: typeof result
            });

            // Update the graph with action results if needed
            const graph = await this.graphStore.getGraph(sessionId);
            if (graph) {
                // Process result and update graph if necessary
                await this.updateGraphWithActionResult(graph, actionId, result);
            }

            return {
                outcome: 'completed',
                action: {
                    id: actionId,
                    title: 'Action completed',
                    matchScore: 1.0
                },
                message: `Action ${actionId} completed successfully`
            };

        } catch (error) {
            logger.error('[ActionRequestProcessor] Failed to process action result', {
                sessionId,
                actionId,
                error: error instanceof Error ? error.message : String(error)
            });

            return {
                outcome: 'failed',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Update graph with action result
     */
    private async updateGraphWithActionResult(
        graph: Graph,
        actionId: string,
        result: any
    ): Promise<void> {
        try {
            // This is a placeholder for graph updates based on action results
            // In a real implementation, this would update the graph with new entities/relations
            // based on the action result

            logger.debug('[ActionRequestProcessor] Updated graph with action result', {
                actionId,
                resultType: typeof result
            });

        } catch (error) {
            logger.error('[ActionRequestProcessor] Failed to update graph with action result', {
                actionId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Get action status
     */
    async getActionStatus(sessionId: string, actionId: string): Promise<{
        status: 'pending' | 'in_progress' | 'completed' | 'failed';
        progress: number;
        currentStep?: string;
        error?: string;
    }> {
        try {
            // This would check the actual status of the action execution
            // For now, return a placeholder implementation

            return {
                status: 'completed',
                progress: 100,
                currentStep: 'completed'
            };

        } catch (error) {
            logger.error('[ActionRequestProcessor] Failed to get action status', {
                sessionId,
                actionId,
                error: error instanceof Error ? error.message : String(error)
            });

            return {
                status: 'failed',
                progress: 0,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}