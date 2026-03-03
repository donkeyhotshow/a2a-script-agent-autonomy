/**
 * @a2a/api-client - HTTP client for A2A server
 */
import { type FileBlockLike } from './protocol';
import { AsyncApiClient, PromisePoller } from './async-client';
import { handleActionResponse, createExecuteCode } from './action-handler';
export interface ApiClientConfig {
    serverUrl?: string;
    token?: string;
    clientId?: string;
    timeout?: number;
}
export declare class ApiError extends Error {
    status: number;
    data: Record<string, unknown>;
    constructor(message: string, status: number, data?: Record<string, unknown>);
}
export declare class ApiClient {
    serverUrl: string;
    token?: string;
    clientId?: string;
    timeout: number;
    async: AsyncApiClient;
    constructor(config?: ApiClientConfig);
    request(method: string, path: string, body?: Record<string, unknown> | null): Promise<Record<string, unknown>>;
    private _sendBody;
    createSession(projectId: string): Promise<unknown>;
    createCard(card: {
        project?: {
            id?: string;
        };
        projectId?: string;
        userRequest?: {
            original?: string;
        };
        request?: {
            raw?: string;
        };
        architecturalFeatures?: string[];
        architectural_features?: string[];
    }): Promise<unknown>;
    createCardByProject(projectId: string, userRequest: string | string[], architecturalFeatures?: string[]): Promise<unknown>;
    reportCommands(sessionId: string, _commandResults?: unknown): Promise<unknown>;
    answerQuestions(sessionId: string, _answers?: unknown): Promise<unknown>;
    getSession(sessionId: string): Promise<unknown>;
    sendMessage(sessionId: string, newTask: string[], architecturalFeatures?: string[]): Promise<unknown>;
    getSessionContext(sessionId: string): Promise<unknown>;
    continueSession(sessionId: string): Promise<unknown>;
    confirmSession(sessionId: string, files?: FileBlockLike[]): Promise<unknown>;
    sendFiles(sessionId: string, files: FileBlockLike[]): Promise<unknown>;
    deleteSession(sessionId: string): Promise<void>;
    invoke(opts: {
        markdown: string;
        context?: Record<string, unknown>;
        files?: FileBlockLike[];
    }): Promise<unknown>;
}
export { AsyncApiClient, PromisePoller, handleActionResponse, createExecuteCode };
export type { ExecuteScriptFn } from './action-handler';
export { buildNewTaskContext, buildContinueContext, buildConfirmContext, buildFileResponseContext, serializeFileBlock, parseFileBlock, parseMessage, type FileBlockLike, } from './protocol';
export type { Session, SessionMetadata, DialogMessage, DialogRole, SequenceEntry, SessionIndex, SessionIndexEntry, SessionManagerConfig, SessionFilter, SessionUpdate, CreateSessionOptions, ProgressInfo, ProgressCallbacks, SessionStatus, } from './types/session.js';
export type { RetryConfig, RequestTransformer, ProgressConfig, } from './async-client.js';
