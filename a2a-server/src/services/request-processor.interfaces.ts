/**
 * Request Processor Interfaces
 * 
 * Core interfaces and type definitions for the refactored request processor system.
 * These interfaces define the contracts between components.
 */

import type { Graph } from './graph-store.service.js';
import type { FrameworkDetectionResult } from './framework-detector.service.js';
import type { CodeBlock } from '../types/entity.types.js';
import type { RequestContextBlock } from '../types/index.js';

// ========================================
// Core Request Processing Types
// ========================================

export interface RequestContext {
    promiseId: string;
    context: Record<string, unknown>;
    codeBlocks: unknown;
    message?: string;
}

export interface ProcessResult {
    outcome: ProcessOutcome;
    graph?: Graph | undefined;
    entities?: { count: number; types: Record<string, number> } | undefined;
    relations?: { count: number } | undefined;
    questions?: string[] | undefined;
    missing?: string[] | undefined;
    frameworks?: FrameworkDetectionResult | undefined;
    context?: RequestContextBlock | undefined;
    request_files?: string[] | undefined;
    activated_neuron_ids?: string[] | undefined;
    tasks?: Task[] | undefined;
    taskAnalysis?: TaskAnalysis | undefined;
    action?: ActionResult | null | undefined;
    execute?: ExecuteCommand | undefined;
}

export type ProcessOutcome = 'completed' | 'failed' | 'graph_incomplete' | 'action_proposal';

// ========================================
// Task Management Types
// ========================================

export interface Task {
    id: string;
    type: 'user_task' | 'neuron_task';
    status: 'pending' | 'in_progress' | 'completed';
    description: string;
    source: 'user' | 'neuron';
    neuronId?: string;
}

export interface TaskAnalysis {
    level: TaskDetailLevel;
    needsContext: boolean;
    needsFiles: boolean;
    readyForAi: boolean;
}

export type TaskDetailLevel = 'short' | 'medium' | 'detailed';

// ========================================
// Action Processing Types
// ========================================

export interface ActionRequest {
    sessionId: string;
    actionType: string;
    context: Record<string, unknown>;
    codeBlocks: unknown;
    message?: string;
}

export interface ActionContext {
    sessionId: string;
    taskText: string;
    codeBlocks: CodeBlock[];
    frameworks: FrameworkDetectionResult | undefined;
    graph: Graph;
}

export interface ActionStep {
    id: string;
    title: string;
    code?: string;
}

export interface ActionProposal {
    id: string;
    title: string;
    matchScore: number;
    currentStep: ActionStep | null;
    nextSteps: ActionStep[];
}

export interface ActionExecution {
    actionId: string;
    currentStep: ActionStep | null;
    nextSteps: ActionStep[];
    continue: boolean;
    message: {
        context: Record<string, unknown>;
        action?: ActionProposal;
        executingAction?: {
            actionId: string;
            title: string;
        };
        nextSteps?: ActionStep[];
        message?: string;
    };
}

export interface ActionResult {
    id?: string;
    title?: string;
    matchScore?: number;
    currentStep?: ActionStep;
    nextSteps?: ActionStep[];
}

// ========================================
// Execute Command Types
// ========================================

export interface ExecuteCommand {
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
}

// ========================================
// State Management Types
// ========================================

export interface RequestState {
    sessionId: string;
    currentPhase: RequestPhase;
    contextManager: RequestContextManager;
    phaseMachine: RequestPhaseMachine;
    processingContext: ProcessingContext;
    errorHistory: RequestError[];
    startTime: Date;
    lastActivity: Date;
}

export interface ProcessingContext {
    taskText: string;
    codeBlocks: CodeBlock[];
    frameworks: FrameworkDetectionResult | undefined;
    graph: Graph;
    taskAnalysis: TaskAnalysis | null;
    activatedNeurons: string[];
    requestFiles: string[];
    questions: string[];
    missing: string[];
}

export type RequestPhase = 'idle' | 'discovery' | 'recognition' | 'analysis' | 'action' | 'validation' | 'completed';

export interface RequestContextManager {
    set(type: ContextType, data: unknown): ContextEntry;
    get<T = unknown>(type: ContextType): T | null;
    has(type: ContextType): boolean;
    delete(type: ContextType): boolean;
    getAll(): Record<string, unknown>;
    getForPhase(phase: RequestPhase): Record<string, unknown>;
    clearByRetention(retention: RetentionPolicy): void;
    reset(): void;
    getStats(): ContextStats;
    serialize(): string;
}

export interface RequestPhaseMachine {
    getCurrentPhase(): RequestPhase;
    canTransitionTo(phase: RequestPhase): boolean;
    transition(nextPhase: RequestPhase, reason?: string): TransitionResult;
    autoTransition(result: TransitionConditions): TransitionResult;
    updateContext(data: Record<string, unknown>): void;
    getContext(): Record<string, unknown>;
    isTimedOut(): boolean;
    getPhaseDuration(): number;
    getTotalDuration(): number;
    isExhausted(): boolean;
    reset(newContext: Record<string, unknown>): void;
    getStats(): PhaseStats;
    serialize(): string;
}

export interface ContextEntry {
    type: ContextType;
    data: unknown;
    timestamp: Date;
    size: number;
    priority: number;
    retention: RetentionPolicy;
    lastAccessed: Date;
}

export type ContextType =
    | 'task'
    | 'graph'
    | 'frameworks'
    | 'entities'
    | 'questions'
    | 'request_files'
    | 'activated_neurons'
    | 'style'
    | 'errors'
    | 'history';

export type RetentionPolicy = 'permanent' | 'session' | 'current-task' | 'until-fixed';

export interface ContextStats {
    totalSize: number;
    maxSize: number;
    utilization: string;
    types: ContextType[];
    byType: Record<ContextType, { size: number; priority: number; age: number }>;
}

export interface TransitionResult {
    success: boolean;
    previousPhase: RequestPhase;
    currentPhase: RequestPhase;
    iterations: number;
    canContinue: boolean;
    error?: string;
}

export interface TransitionConditions {
    hasEntities: boolean;
    isComplete: boolean;
    hasQuestions: boolean;
    needsMoreFiles: boolean;
}

export interface PhaseStats {
    currentPhase: RequestPhase;
    totalIterations: number;
    phaseIterations: Record<RequestPhase, number>;
    totalDuration: number;
    phaseDuration: number;
    historyLength: number;
    isExhausted: boolean;
    isTimedOut: boolean;
}

// ========================================
// Error Handling Types
// ========================================

export interface RequestError {
    timestamp: Date;
    phase: RequestPhase;
    error: Error;
    context: Record<string, unknown>;
    retryCount: number;
    canRecover: boolean;
}

export interface ErrorRecovery {
    strategy: 'retry' | 'fallback' | 'skip' | 'abort';
    maxRetries: number;
    retryDelay: number;
    fallbackAction?: () => Promise<ProcessResult>;
}

export interface ErrorHandler {
    handle(error: Error, context: ErrorContext): Promise<ErrorResolution>;
    canRecover(error: Error): boolean;
    getRecoveryStrategy(error: Error): ErrorRecovery;
    logError(error: Error, context: ErrorContext): void;
}

export interface ErrorContext {
    phase: RequestPhase;
    sessionId: string;
    promiseId: string;
    context: Record<string, unknown>;
    errorType: string;
    timestamp: Date;
}

export interface ErrorResolution {
    success: boolean;
    outcome: ProcessOutcome;
    error?: Error;
    retryCount: number;
    recovered: boolean;
}

// ========================================
// Validation Types
// ========================================

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    suggestions: ValidationSuggestion[];
}

export interface ValidationError {
    field: string;
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    path?: string[];
}

export interface ValidationWarning {
    field: string;
    code: string;
    message: string;
    suggestion?: string;
}

export interface ValidationSuggestion {
    field: string;
    suggestion: string;
    impact: 'low' | 'medium' | 'high';
}

export interface RequestValidator {
    validateRequest(request: RequestContext): Promise<ValidationResult>;
    validateContext(context: Record<string, unknown>): Promise<ValidationResult>;
    validateGraph(graph: Graph): Promise<ValidationResult>;
    validateAction(action: ActionRequest): Promise<ValidationResult>;
}

// ========================================
// Configuration Types
// ========================================

export interface RequestProcessorConfig {
    maxContextSize: number;
    maxRetries: number;
    retryDelay: number;
    timeout: number;
    batchSize: number;
    enableValidation: boolean;
    enableMonitoring: boolean;
    enableCaching: boolean;
    phases: PhaseConfig[];
    errorRecovery: ErrorRecoveryConfig;
}

export interface PhaseConfig {
    name: RequestPhase;
    description: string;
    nextPhases: RequestPhase[];
    maxIterations: number;
    timeout?: number;
    enableValidation: boolean;
    enableMonitoring: boolean;
}

export interface ErrorRecoveryConfig {
    maxRetries: number;
    retryDelay: number;
    strategies: Record<string, ErrorRecovery>;
    fallbackEnabled: boolean;
}

export interface ProcessorMetrics {
    totalRequests: number;
    completedRequests: number;
    failedRequests: number;
    averageProcessingTime: number;
    phaseDistribution: Record<RequestPhase, number>;
    errorRate: number;
    recoveryRate: number;
}

// ========================================
// Component Interfaces
// ========================================

export interface RequestProcessorComponent {
    initialize(config: RequestProcessorConfig): Promise<void>;
    shutdown(): Promise<void>;
    getMetrics(): ProcessorMetrics;
}

export interface RequestOrchestrator extends RequestProcessorComponent {
    processRequest(request: RequestContext): Promise<ProcessResult>;
    getStatus(): OrchestratorStatus;
}

export interface RequestStateHandler extends RequestProcessorComponent {
    createState(sessionId: string, context: Record<string, unknown>): RequestState;
    getState(sessionId: string): RequestState | null;
    updateState(sessionId: string, updates: Partial<RequestState>): void;
    deleteState(sessionId: string): void;
    serializeState(sessionId: string): string;
    deserializeState(data: string): RequestState;
}

export interface RequestErrorHandler extends RequestProcessorComponent {
    handle(error: Error, context: ErrorContext): Promise<ErrorResolution>;
    canRecover(error: Error): boolean;
    getRecoveryStrategy(error: Error): ErrorRecovery;
}

export interface RequestValidatorComponent extends RequestProcessorComponent {
    validate(request: RequestContext): Promise<ValidationResult>;
    validateContext(context: Record<string, unknown>): Promise<ValidationResult>;
}

export interface OrchestratorStatus {
    isRunning: boolean;
    activeSessions: number;
    queuedRequests: number;
    lastActivity: Date;
    metrics: ProcessorMetrics;
}

// ========================================
// Utility Types
// ========================================

export interface ProcessingStep {
    id: string;
    name: string;
    phase: RequestPhase;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    success: boolean;
    error?: Error;
    result?: unknown;
}

export interface ProcessingPipeline {
    steps: ProcessingStep[];
    currentStep: number;
    completed: boolean;
    error?: Error;
}

export interface ComponentHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    error?: string;
    metrics?: Record<string, unknown>;
}

export interface SystemHealth {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: ComponentHealth[];
    lastCheck: Date;
    timestamp: Date;
}