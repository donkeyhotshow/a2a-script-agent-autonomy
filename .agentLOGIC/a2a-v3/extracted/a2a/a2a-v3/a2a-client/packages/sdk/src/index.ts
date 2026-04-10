/**
 * @a2a/api-client - HTTP client for A2A server
 */

import fetch from 'node-fetch';
import {
    buildNewTaskContext,
    buildContinueContext,
    buildConfirmContext,
    buildFileResponseContext,
    type FileBlockLike,
} from './protocol';
import {AsyncApiClient, PromisePoller} from './async-client';
import {handleActionResponse, handleExecuteAction, createExecuteScript, extractExecuteAction} from './action-handler';
import {unwrapEnvelope} from './client-api-envelope.js';

export interface ApiClientConfig {
    serverUrl?: string;
    token?: string;
    clientId?: string;
    timeout?: number;
}

export class ApiError extends Error {
    status: number;
    data: Record<string, unknown>;

    constructor(message: string, status: number, data: Record<string, unknown> = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

export class ApiClient {
    serverUrl: string;
    token?: string;
    clientId?: string;
    timeout: number;
    async: AsyncApiClient;

    constructor(config: ApiClientConfig = {}) {
        this.serverUrl = (config.serverUrl ?? 'http://localhost:3000/api/v1').replace(/\/?$/, '');
        this.token = config.token;
        this.clientId = config.clientId;
        this.timeout = config.timeout ?? 30000;
        this.async = new AsyncApiClient(config);
    }

    async request(
        method: string,
        path: string,
        body: Record<string, unknown> | null = null
    ): Promise<Record<string, unknown>> {
        const url = `${this.serverUrl}${path}`;
        const headers: Record<string, string> = {'Content-Type': 'application/json'};
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        if (this.clientId) headers['X-Client-ID'] = this.clientId;
        const options: RequestInit & { timeout?: number } = {method, headers, timeout: this.timeout};
        if (body) options.body = JSON.stringify(body);
        try {
            const response = await fetch(url, options as RequestInit);
            const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
            if (!response.ok) {
                const err = data?.error as { message?: string } | undefined;
                throw new ApiError(err?.message ?? 'Request failed', response.status, data);
            }
            return data;
        } catch (err) {
            if ((err as Error).name === 'AbortError') throw new ApiError('Request timeout', 408);
            throw err;
        }
    }

    private _sendBody(
        context: Record<string, unknown>,
        files: FileBlockLike[] = []
    ): Record<string, unknown> {
        const body: Record<string, unknown> = {context};
        if (files.length)
            body.files = files.map((f) => ({path: f.path, content: f.content}));
        return body;
    }

    async createSession(projectId: string): Promise<unknown> {
        const res = await this.request('POST', '/sessions', {project_id: projectId});
        return unwrapEnvelope(res);
    }

    async createCard(card: {
        project?: { id?: string };
        projectId?: string;
        userRequest?: { original?: string };
        request?: { raw?: string };
        architecturalFeatures?: string[];
        architectural_features?: string[];
    }): Promise<unknown> {
        const projectId = card.project?.id ?? card.projectId;
        if (!projectId) throw new ApiError('projectId required', 400);
        const req = card.userRequest?.original ?? card.request?.raw ?? '';
        const arch = card.architecturalFeatures ?? card.architectural_features;
        return this.createCardByProject(projectId, req as string, arch);
    }

    async createCardByProject(
        projectId: string,
        userRequest: string | string[],
        architecturalFeatures?: string[]
    ): Promise<unknown> {
        const session = (await this.createSession(projectId)) as { session_id?: string };
        const sid = session.session_id;
        if (!sid) throw new ApiError('No session_id in response', 500);
        const task = Array.isArray(userRequest) ? userRequest : [String(userRequest ?? '')];
        const msg = (await this.sendMessage(sid, task, architecturalFeatures)) as { tasks?: unknown[] };
        const status = msg.tasks?.length ? 'task_created' : 'processing';
        return {...msg, status, card: {cardId: sid}};
    }

    async reportCommands(sessionId: string, _commandResults?: unknown): Promise<unknown> {
        return this.continueSession(sessionId);
    }

    async answerQuestions(sessionId: string, _answers?: unknown): Promise<unknown> {
        return this.confirmSession(sessionId);
    }

    async getSession(sessionId: string): Promise<unknown> {
        const res = await this.request('GET', `/sessions/${sessionId}`);
        return unwrapEnvelope(res);
    }

    async sendMessage(
        sessionId: string,
        newTask: string[],
        architecturalFeatures?: string[]
    ): Promise<unknown> {
        const context = buildNewTaskContext(sessionId, newTask, architecturalFeatures);
        const body = {context, new_task: newTask};
        const res = await this.request('POST', `/sessions/${sessionId}/message`, body);
        return unwrapEnvelope(res);
    }

    async getSessionContext(sessionId: string): Promise<unknown> {
        const res = await this.request('GET', `/sessions/${sessionId}/context`);
        return unwrapEnvelope(res);
    }

    async continueSession(sessionId: string): Promise<unknown> {
        const context = buildContinueContext(sessionId);
        const res = await this.request('POST', `/sessions/${sessionId}/continue`, {context});
        return unwrapEnvelope(res);
    }

    async confirmSession(sessionId: string, files: FileBlockLike[] = []): Promise<unknown> {
        const context = buildConfirmContext(sessionId);
        const body = this._sendBody(context, files);
        const res = await this.request('POST', `/sessions/${sessionId}/confirm`, body);
        return unwrapEnvelope(res);
    }

    async sendFiles(sessionId: string, files: FileBlockLike[]): Promise<unknown> {
        const context = buildFileResponseContext(sessionId);
        const body = this._sendBody(context, files);
        const res = await this.request('POST', `/sessions/${sessionId}/files`, body);
        return unwrapEnvelope(res);
    }

    async deleteSession(sessionId: string): Promise<void> {
        await this.request('DELETE', `/sessions/${sessionId}`);
    }

    async invoke(opts: {
        markdown: string;
        context?: Record<string, unknown>;
        files?: FileBlockLike[];
    }): Promise<unknown> {
        const res = await this.request('POST', '/invoke', {
            markdown: opts.markdown,
            context: opts.context ?? {},
            files: opts.files ?? [],
        });
        return unwrapEnvelope(res);
    }
}

export {AsyncApiClient, PromisePoller, handleActionResponse, handleExecuteAction, createExecuteScript, extractExecuteAction};
export type {ExecuteScriptFn, HandleActionOptions, HandleActionResult} from './action-handler';
export {
    buildNewTaskContext,
    buildContinueContext,
    buildConfirmContext,
    buildFileResponseContext,
    // New protocol functions
    buildProtocolContext,
    buildFormChoiceRequest,
    buildActionResultRequest,
    isFormChoicesResponse,
    isCompletedResponse,
    isErrorResponse,
    isNewProtocol,
    // Serialization
    serializeFileBlock,
    parseFileBlock,
    parseMessage,
    type FileBlockLike,
} from './protocol';

// Session management types (implemented in AsyncApiClient)
export type {
    Session,
    SessionMetadata,
    DialogMessage,
    DialogRole,
    SequenceEntry,
    SessionIndex,
    SessionIndexEntry,
    SessionManagerConfig,
    SessionFilter,
    SessionUpdate,
    CreateSessionOptions,
    ProgressInfo,
    ProgressCallbacks,
    SessionStatus,
} from './types/session.js';

// Retry and Transform exports
export type {
    RetryConfig,
    RequestTransformer,
    ProgressConfig,
} from './async-client.js';

// Simulation helpers (Task 01)
export {
    invokeFirstTask,
    sendFormChoice,
    sendMessage,
    sendClientActionResult,
    hasFormChoices,
    getFormChoices,
    hasExecuteAction,
    getExecuteActionType,
    isCompleted,
    getFinalResult,
    getExecution,
    addToHistory,
    getHistory,
    isAiAction,
    getActionType,
    getAvailableSteps,
} from './simulation-helpers.js';
export type { 
    InvokeFirstTaskOptions, 
    FirstTaskResult, 
    ExecutePayload,
    ActionResultPayload,
    FormChoice,
    FormAction,
    ScriptAction,
    RagSearchAction,
    ReadFileAction,
    WriteFileAction,
    ExecuteCommandAction,
    MessageAction,
    FinalResult,
    HistoryEntry,
} from './simulation-helpers.js';
