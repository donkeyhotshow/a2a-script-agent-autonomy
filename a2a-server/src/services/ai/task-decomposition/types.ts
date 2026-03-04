/**
 * Task Decomposition Types
 * 
 * Типы для Task Decomposition Service
 */

export type SubtaskStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed' | 'blocked';
export type StepStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed';
export type ActionStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed';
export type DependencyType = 'requires' | 'optional' | 'conflicts';

export interface Subtask {
    id: string;
    title: string;
    description: string;
    structuredTaskId: string;
    status: SubtaskStatus;
    order: number;
    estimatedDuration?: number; // in minutes
    createdAt: Date;
    updatedAt: Date;
    dependencies: SubtaskDependency[];
}

export interface SubtaskDependency {
    id: string;
    subtaskId: string;
    dependsOnSubtaskId: string;
    type: DependencyType;
}

export interface Step {
    id: string;
    title: string;
    description: string;
    subtaskId: string;
    status: StepStatus;
    order: number;
    estimatedDuration?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Action {
    id: string;
    type: string;
    description: string;
    stepId: string;
    status: ActionStatus;
    order: number;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface DecompositionResult {
    subtasks: Subtask[];
    totalEstimatedDuration: number;
    canParallelize: boolean;
}

export interface ExecutionPlan {
    phases: ExecutionPhase[];
    totalSteps: number;
    estimatedTotalDuration: number;
}

export interface ExecutionPhase {
    phaseNumber: number;
    subtasks: string[]; // subtask IDs
    canRunInParallel: boolean;
    estimatedDuration: number;
}
