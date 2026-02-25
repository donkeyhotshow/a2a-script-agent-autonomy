/**
 * @a2a/agent - Main agent logic for A2A system
 */
import { ApiClient } from '@a2a/api-client';
import { RAGIndexer, RAGSearcher } from '@a2a/rag';
import { CardManager } from './card-manager';
import type { TaskCard } from './card-manager';
import { FileSystem } from './fs-reader';
import { GitOps } from './git-ops';
export interface A2AAgentConfig {
    serverUrl?: string;
    projectPath?: string;
    token?: string;
    userId?: string;
    projectId?: string;
}
export interface ServerResponse {
    status: string;
    card?: TaskCard;
    questions?: unknown[];
    commands?: Array<{
        id?: string;
        type: string;
        params: Record<string, unknown>;
    }>;
    task?: unknown;
    result?: unknown;
    error?: unknown;
}
export interface ProcessResult {
    type: string;
    card?: TaskCard;
    questions?: unknown[];
    task?: unknown;
    result?: unknown;
    error?: unknown;
}
export declare class A2AAgent {
    private config;
    apiClient: ApiClient;
    cardManager: CardManager;
    ragIndexer: RAGIndexer;
    ragSearcher: RAGSearcher;
    fs: FileSystem;
    gitOps: GitOps;
    sessionId: string | null;
    currentCard: TaskCard | null;
    constructor(config: A2AAgentConfig);
    initSession(): Promise<string>;
    processRequest(userRequest: string): Promise<ProcessResult>;
    private handleServerResponse;
    private handleNeedContext;
    private handleTaskCreated;
    private handleProcessing;
    private handleCompleted;
    private handleError;
    executeCommands(commands: Array<{
        id?: string;
        type: string;
        params: Record<string, unknown>;
    }>): Promise<Array<{
        commandId: string;
        success: boolean;
        result?: unknown;
        error?: string;
    }>>;
    private executeCommand;
    answerQuestions(answers: unknown): Promise<ProcessResult>;
    private detectProjectType;
}
export { CardManager, FileSystem, GitOps };
export type { TaskCard } from './card-manager';
