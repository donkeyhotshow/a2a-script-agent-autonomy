/**
 * State Types
 * 
 * Types related to task and session state management
 */

export type TaskType = 'analyze' | 'refactor' | 'test' | 'document' | 'fix' | 'create' | 'delete';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface Task {
    id: string;
    type: TaskType;
    status: TaskStatus;
    target?: string;
    progress?: number;
}

export interface SessionState {
    id: string;
    currentStep: number;
    createdAt?: string;
    updatedAt?: string;
    status: 'active' | 'corrupt' | 'completed' | 'failed';
    mode?: string;
    title?: string;
    context?: ContextBlock;
    execute?: unknown;
    asyncPending?: boolean;
    promiseId?: string | null;
    promiseStatus?: string | null;
    error?: {
        code: string;
        message: string;
    };
}

export interface ContextBlock {
    version: '1.0';
    new_task?: string[];
    architectural_features?: string[];
    continue?: boolean;
    tasks?: Task[];
    request_files?: string[];
    confirm?: boolean;
    errors?: Array<{
        code: string;
        message: string;
        file?: string;
        line?: number;
    }>;
}

/**
 * Factory options for creating tasks
 */
export interface CreateTaskOptions {
    id?: string;
    type?: TaskType;
    status?: TaskStatus;
    target?: string;
    progress?: number;
}

export { createTask } from '../factory/index.js';
