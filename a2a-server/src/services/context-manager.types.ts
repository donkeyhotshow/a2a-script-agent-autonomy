/**
 * Context Manager types (per plans/context-manager-improvements.md).
 * Aligns with context-manager.service.ts.
 */

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

export interface ContextTypeConfig {
    priority: number;
    retention: RetentionPolicy;
    description: string;
    maxSize?: number;
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

export interface ContextStats {
    totalSize: number;
    maxSize: number;
    utilization: string;
    types: ContextType[];
    byType: Record<ContextType, { size: number; priority: number; age: number }>;
}
