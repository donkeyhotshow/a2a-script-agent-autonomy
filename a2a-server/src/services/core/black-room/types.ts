/**
 * Types for Black Room algorithm execution
 */

export interface AlgorithmDefinition {
    id: string;
    version: string;
    model: string;
    promptTemplate: string;
    outputSchema: Record<string, unknown>;
    contextRequirements: string[];
    maxTokens: number;
    temperature: number;
}

export interface AlgorithmContext {
    sessionId: string;
    workbench?: Record<string, unknown>;
    history?: unknown[];
    files?: Record<string, string>;
    [key: string]: unknown;
}

export interface AlgorithmData {
    targetFiles?: string[];
    operation?: string;
    excludeTests?: boolean;
    [key: string]: unknown;
}

export interface AlgorithmResult {
    status: 'completed' | 'failed' | 'timeout';
    output?: Record<string, unknown>;
    error?: string;
    metrics?: {
        durationMs: number;
        tokensIn: number;
        tokensOut: number;
    };
    continueLoop?: boolean;
}

export interface BlackRoomExecutionOptions {
    ollamaUrl?: string;
    defaultModel?: string;
    timeoutMs?: number;
    maxRetries?: number;
}