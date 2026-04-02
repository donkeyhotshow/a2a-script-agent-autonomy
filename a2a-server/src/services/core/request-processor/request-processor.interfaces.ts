/**
 * Request Processor Interfaces — only what is actively used.
 */

import type { Graph } from '../graph-store.service.js';
import type { RequestContextBlock } from '../../types/index.js';

export interface RequestContext {
    promiseId: string;
    context: Record<string, unknown>;
    codeBlocks: unknown;
    message?: string;
}

export interface ProcessResult {
    outcome: ProcessOutcome;
    response?: Record<string, unknown>;
    graph?: Graph;
    context?: RequestContextBlock;
    activated_neuron_ids?: string[];
    tasks?: Task[];
    taskAnalysis?: TaskAnalysis;
    execute?: ExecuteCommand;
    /** Present when response transform emitted `interrupt` but the gray-room chain did not consume it. */
    interrupt?: Record<string, unknown>;
    error?: string;
    validationErrors?: ValidationError[];
    // ai_action follow-up fields
    aiActions?: { action: string };
    selection?: string;
    followUpRequestId?: string;
    note?: string;
}

export type ProcessOutcome =
    | 'completed'
    | 'failed'
    | 'graph_incomplete'
    | 'action_proposal'
    | 'ai_action_ready'
    | 'waiting_manual_llm';

export interface Task {
    id: string;
    type: 'user_task' | 'neuron_task';
    status: 'pending' | 'in_progress' | 'completed';
    description: string;
    source: 'user' | 'neuron';
    neuronId?: string;
}

export interface TaskAnalysis {
    level: 'short' | 'medium' | 'detailed';
    needsContext: boolean;
    needsFiles: boolean;
    readyForAi: boolean;
}

export interface ExecuteCommand {
    form?: {
        title?: string;
        choices?: Array<{ id: string; label: string }>;
        meta?: Record<string, unknown>;
        input?: unknown[];
    };
    script?: { input: Record<string, unknown>; output: string; code: string };
    message?: string;
    wait?: { message?: string; showFormAfter?: boolean };
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

export interface ValidationError {
    field: string;
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    path?: string[];
}

// Legacy — kept for action-request-processor compatibility
export interface ActionRequest {
    sessionId: string;
    actionType: string;
    context: Record<string, unknown>;
    codeBlocks: unknown;
    message?: string;
}

export interface RequestState {
    sessionId: string;
}
