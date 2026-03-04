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

export interface ContextBlock {
    version: '1.0';
    session_id: string;
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

/**
 * Create a task with default values
 */
export function createTask(options: CreateTaskOptions = {}): Task {
    return {
        id: options.id ?? `task_${Date.now()}`,
        type: options.type ?? 'analyze',
        status: options.status ?? 'pending',
        target: options.target,
        progress: options.progress ?? 0,
    };
}
