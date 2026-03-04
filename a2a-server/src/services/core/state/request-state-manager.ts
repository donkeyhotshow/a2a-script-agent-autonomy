/**
 * Request State Manager
 * 
 * Manages the state of request processing including ContextManager and PhaseMachine.
 * Extracted from request-processor.service.ts for better separation of concerns.
 */

import {logger} from '../utils/logger.js';
import {ContextManager, getContextManager, resetContextManager} from './context-manager.service.js';
import {PhaseMachine, getPhaseMachine, resetPhaseMachine} from './context-manager.service.js';
import {
    RequestState,
    ProcessingContext,
    RequestContextManager,
    RequestPhaseMachine,
    ContextType,
    RetentionPolicy,
    ContextStats,
    TransitionResult,
    TransitionConditions,
    PhaseStats,
    RequestPhase,
    TaskAnalysis
} from './request-processor.interfaces.js';
import {CodeBlock} from '../types/entity.types.js';
import {FrameworkDetectionResult} from './framework-detector.service.js';
import {Graph} from './graph-store.service.js';
import {wrapContextManager, wrapPhaseMachine} from './request-state-manager.wrappers.js';

/**
 * Request State Manager
 * 
 * Manages the complete state of a request processing session including:
 * - ContextManager for data storage and retrieval
 * - PhaseMachine for state transitions
 * - Processing context tracking
 * - Error history and recovery
 */
export class RequestStateManager {
    private states: Map<string, RequestState> = new Map();
    private currentContextManager: ContextManager | null = null;
    private currentPhaseMachine: PhaseMachine | null = null;

    /**
     * Create a new request state
     */
    createState(sessionId: string, initialContext: Record<string, unknown> = {}): RequestState {
        // Reset and initialize ContextManager
        this.currentContextManager = resetContextManager();
        this.currentContextManager.set('task', initialContext['task'] || '');

        // Initialize PhaseMachine with context
        this.currentPhaseMachine = resetPhaseMachine(initialContext);

        const state: RequestState = {
            sessionId,
            currentPhase: 'idle',
            contextManager: this.wrapContextManager(this.currentContextManager),
            phaseMachine: this.wrapPhaseMachine(this.currentPhaseMachine),
            processingContext: {
                taskText: initialContext['task'] as string || '',
                codeBlocks: [],
                frameworks: undefined,
                graph: { entities: [], relations: [] },
                taskAnalysis: null,
                activatedNeurons: [],
                requestFiles: [],
                questions: [],
                missing: []
            },
            errorHistory: [],
            startTime: new Date(),
            lastActivity: new Date()
        };

        this.states.set(sessionId, state);
        
        logger.info('[RequestStateManager] Created state', {
            sessionId,
            phase: state.currentPhase,
            taskText: state.processingContext.taskText.substring(0, 50)
        });

        return state;
    }

    /**
     * Get existing request state
     */
    getState(sessionId: string): RequestState | null {
        return this.states.get(sessionId) || null;
    }

    /**
     * Update request state
     */
    updateState(sessionId: string, updates: Partial<RequestState>): void {
        const state = this.states.get(sessionId);
        if (!state) {
            logger.warn('[RequestStateManager] State not found for update', {sessionId});
            return;
        }

        // Update processing context if provided
        if (updates.processingContext) {
            state.processingContext = { ...state.processingContext, ...updates.processingContext };
        }

        // Update other fields
        Object.assign(state, updates);
        state.lastActivity = new Date();

        logger.debug('[RequestStateManager] Updated state', {
            sessionId,
            updates: Object.keys(updates),
            phase: state.currentPhase
        });
    }

    /**
     * Delete request state
     */
    deleteState(sessionId: string): void {
        const state = this.states.get(sessionId);
        if (state) {
            // Clean up ContextManager and PhaseMachine
            if (this.currentContextManager) {
                this.currentContextManager.reset();
            }
            if (this.currentPhaseMachine) {
                this.currentPhaseMachine.reset();
            }
            
            this.states.delete(sessionId);
            logger.info('[RequestStateManager] Deleted state', {sessionId});
        }
    }

    /**
     * Serialize state for persistence
     */
    serializeState(sessionId: string): string {
        const state = this.states.get(sessionId);
        if (!state) {
            throw new Error(`State not found for serialization: ${sessionId}`);
        }

        return JSON.stringify({
            sessionId: state.sessionId,
            currentPhase: state.currentPhase,
            processingContext: state.processingContext,
            errorHistory: state.errorHistory.map(error => ({
                ...error,
                timestamp: error.timestamp.toISOString(),
                error: error.error.message
            })),
            startTime: state.startTime.toISOString(),
            lastActivity: state.lastActivity.toISOString()
        });
    }

    /**
     * Deserialize state from persistence
     */
    deserializeState(data: string): RequestState {
        const parsed = JSON.parse(data);
        
        // Recreate ContextManager and PhaseMachine
        this.currentContextManager = resetContextManager();
        this.currentPhaseMachine = resetPhaseMachine(parsed.processingContext?.taskText ? 
            { task: parsed.processingContext.taskText } : {});

        const state: RequestState = {
            sessionId: parsed.sessionId,
            currentPhase: parsed.currentPhase,
            contextManager: this.wrapContextManager(this.currentContextManager),
            phaseMachine: this.wrapPhaseMachine(this.currentPhaseMachine),
            processingContext: parsed.processingContext,
            errorHistory: parsed.errorHistory.map((error: any) => ({
                ...error,
                timestamp: new Date(error.timestamp),
                error: new Error(error.error)
            })),
            startTime: new Date(parsed.startTime),
            lastActivity: new Date(parsed.lastActivity)
        };

        this.states.set(state.sessionId, state);
        return state;
    }

    /**
     * Initialize processing context
     */
    async initializeProcessingContext(
        sessionId: string,
        taskText: string,
        codeBlocks: CodeBlock[],
        frameworks: FrameworkDetectionResult | undefined,
        graph: Graph,
        taskAnalysis: TaskAnalysis | null
    ): Promise<void> {
        const state = this.states.get(sessionId);
        if (!state) {
            throw new Error(`State not found: ${sessionId}`);
        }

        // Update processing context
        state.processingContext = {
            taskText,
            codeBlocks,
            frameworks,
            graph,
            taskAnalysis,
            activatedNeurons: [],
            requestFiles: [],
            questions: [],
            missing: []
        };

        // Set initial context in ContextManager
        state.contextManager.set('task', taskText);
        state.contextManager.set('graph', graph);
        if (frameworks) {
            state.contextManager.set('frameworks', frameworks);
        }

        // Update PhaseMachine context
        state.phaseMachine.updateContext({
            task: taskText,
            frameworks,
            graph
        });

        state.lastActivity = new Date();

        logger.info('[RequestStateManager] Initialized processing context', {
            sessionId,
            taskText: taskText.substring(0, 50),
            codeBlocksCount: codeBlocks.length,
            frameworks: frameworks?.frontend || 'none'
        });
    }

    /**
     * Update graph in processing context
     */
    updateGraph(sessionId: string, graph: Graph): void {
        const state = this.states.get(sessionId);
        if (!state) {
            logger.warn('[RequestStateManager] State not found for graph update', {sessionId});
            return;
        }

        state.processingContext.graph = graph;
        state.contextManager.set('graph', graph);
        state.phaseMachine.updateContext({ graph });
        state.lastActivity = new Date();

        logger.debug('[RequestStateManager] Updated graph', {
            sessionId,
            entityCount: graph.entities.length,
            relationCount: graph.relations.length
        });
    }

    /**
     * Add activated neurons to processing context
     */
    addActivatedNeurons(sessionId: string, neuronIds: string[]): void {
        const state = this.states.get(sessionId);
        if (!state) {
            logger.warn('[RequestStateManager] State not found for neuron update', {sessionId});
            return;
        }

        state.processingContext.activatedNeurons = neuronIds;
        state.contextManager.set('activated_neurons', neuronIds);
        state.lastActivity = new Date();

        logger.info('[RequestStateManager] Added activated neurons', {
            sessionId,
            neuronCount: neuronIds.length,
            neuronIds: neuronIds.slice(0, 3)
        });
    }

    /**
     * Add request files to processing context
     */
    addRequestFiles(sessionId: string, files: string[]): void {
        const state = this.states.get(sessionId);
        if (!state) {
            logger.warn('[RequestStateManager] State not found for request files update', {sessionId});
            return;
        }

        state.processingContext.requestFiles = files;
        state.contextManager.set('request_files', files);
        state.lastActivity = new Date();

        logger.info('[RequestStateManager] Added request files', {
            sessionId,
            fileCount: files.length,
            files: files.slice(0, 3)
        });
    }

    /**
     * Add questions to processing context
     */
    addQuestions(sessionId: string, questions: string[]): void {
        const state = this.states.get(sessionId);
        if (!state) {
            logger.warn('[RequestStateManager] State not found for questions update', {sessionId});
            return;
        }

        state.processingContext.questions = questions;
        state.contextManager.set('questions', questions);
        state.lastActivity = new Date();

        logger.info('[RequestStateManager] Added questions', {
            sessionId,
            questionCount: questions.length
        });
    }

    /**
     * Add missing files to processing context
     */
    addMissingFiles(sessionId: string, missing: string[]): void {
        const state = this.states.get(sessionId);
        if (!state) {
            logger.warn('[RequestStateManager] State not found for missing files update', {sessionId});
            return;
        }

        state.processingContext.missing = missing;
        state.lastActivity = new Date();

        logger.info('[RequestStateManager] Added missing files', {
            sessionId,
            missingCount: missing.length,
            missing: missing.slice(0, 3)
        });
    }

    /**
     * Add error to error history
     */
    addError(sessionId: string, error: Error, context: Record<string, unknown> = {}): void {
        const state = this.states.get(sessionId);
        if (!state) {
            logger.warn('[RequestStateManager] State not found for error logging', {sessionId});
            return;
        }

        const requestError = {
            timestamp: new Date(),
            phase: state.currentPhase,
            error,
            context,
            retryCount: 0,
            canRecover: true
        };

        state.errorHistory.push(requestError);
        state.lastActivity = new Date();

        logger.error('[RequestStateManager] Added error', {
            sessionId,
            phase: state.currentPhase,
            error: error.message,
            context
        });
    }

    /**
     * Get context for specific phase
     */
    getContextForPhase(sessionId: string, phase: RequestPhase): Record<string, unknown> {
        const state = this.states.get(sessionId);
        if (!state) {
            logger.warn('[RequestStateManager] State not found for phase context', {sessionId, phase});
            return {};
        }

        return state.contextManager.getForPhase(phase);
    }

    /**
     * Get context manager stats
     */
    getContextStats(sessionId: string): ContextStats | null {
        const state = this.states.get(sessionId);
        if (!state) {
            return null;
        }

        return state.contextManager.getStats();
    }

    /**
     * Get phase machine stats
     */
    getPhaseStats(sessionId: string): PhaseStats | null {
        const state = this.states.get(sessionId);
        if (!state) {
            return null;
        }

        return state.phaseMachine.getStats();
    }

    /**
     * Clear context by retention policy
     */
    clearContextByRetention(sessionId: string, retention: RetentionPolicy): void {
        const state = this.states.get(sessionId);
        if (!state) {
            logger.warn('[RequestStateManager] State not found for context clear', {sessionId, retention});
            return;
        }

        state.contextManager.clearByRetention(retention);
        state.lastActivity = new Date();

        logger.info('[RequestStateManager] Cleared context by retention', {
            sessionId,
            retention
        });
    }

    /**
     * Reset state to initial conditions
     */
    resetState(sessionId: string, newContext: Record<string, unknown> = {}): void {
        const state = this.states.get(sessionId);
        if (!state) {
            logger.warn('[RequestStateManager] State not found for reset', {sessionId});
            return;
        }

        // Reset ContextManager and PhaseMachine
        state.contextManager.reset();
        state.phaseMachine.reset(newContext);

        // Reset processing context
        state.processingContext = {
            taskText: newContext['task'] as string || '',
            codeBlocks: [],
            frameworks: undefined,
            graph: { entities: [], relations: [] },
            taskAnalysis: null,
            activatedNeurons: [],
            requestFiles: [],
            questions: [],
            missing: []
        };

        state.errorHistory = [];
        state.currentPhase = 'idle';
        state.startTime = new Date();
        state.lastActivity = new Date();

        logger.info('[RequestStateManager] Reset state', {sessionId});
    }

    /**
     * Get all active session IDs
     */
    getActiveSessions(): string[] {
        return Array.from(this.states.keys());
    }

    /**
     * Clean up expired states
     */
    cleanupExpiredStates(maxAge: number = 3600000): void { // 1 hour default
        const now = new Date();
        const expiredSessions: string[] = [];

        for (const [sessionId, state] of this.states) {
            if (now.getTime() - state.lastActivity.getTime() > maxAge) {
                expiredSessions.push(sessionId);
            }
        }

        for (const sessionId of expiredSessions) {
            this.deleteState(sessionId);
        }

        if (expiredSessions.length > 0) {
            logger.info('[RequestStateManager] Cleaned up expired states', {
                expiredCount: expiredSessions.length,
                expiredSessions
            });
        }
    }
}

// Singleton instance
let stateManager: RequestStateManager | null = null;

/**
 * Get the global RequestStateManager instance
 */
export function getRequestStateManager(): RequestStateManager {
    if (!stateManager) {
        stateManager = new RequestStateManager();
    }
    return stateManager;
}

/**
 * Reset the global RequestStateManager instance
 */
export function resetRequestStateManager(): RequestStateManager {
    stateManager = new RequestStateManager();
    return stateManager;
}