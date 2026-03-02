/**
 * @a2a/api-client - Async HTTP client (Promise/Polling)
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

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

export interface PollingOptions {
    interval?: number;
    maxAttempts?: number;
}

export interface PollCallbacks {
    onComplete?: (result: unknown) => void;
    onError?: (error: { message?: string }) => void;
    onStatus?: (status: unknown) => void;
}

interface PollState {
    timerId: ReturnType<typeof setTimeout> | null;
    callbacks: PollCallbacks;
    attempts: number;
}

export class PromisePoller {
    private api: AsyncApiClient;
    private interval: number;
    private maxAttempts: number;
    private activePollers = new Map<string, PollState>();

    constructor(apiClient: AsyncApiClient, options: PollingOptions = {}) {
        this.api = apiClient;
        this.interval = options.interval ?? 5000;
        this.maxAttempts = options.maxAttempts ?? 720;
    }

    start(promiseId: string, callbacks: PollCallbacks): void {
        if (this.activePollers.has(promiseId)) return;
        this.activePollers.set(promiseId, {timerId: null, callbacks, attempts: 0});
        this._poll(promiseId);
    }

    private async _poll(promiseId: string): Promise<void> {
        const pollState = this.activePollers.get(promiseId);
        if (!pollState) return;
        pollState.attempts++;
        try {
            const status = await this.api.getRequestStatus(promiseId);
            pollState.callbacks.onStatus?.(status);
            const st = status as { status?: string };
            if (st.status === 'completed') {
                const result = await this.api.getRequestResult(promiseId);
                pollState.callbacks.onComplete?.(result);
                this.stop(promiseId);
            } else if (st.status === 'failed') {
                const result = (await this.api.getRequestResult(promiseId)) as { error?: { message?: string } };
                pollState.callbacks.onError?.(result?.error ?? {message: 'Request failed'});
                this.stop(promiseId);
            } else if (st.status === 'cancelled') {
                pollState.callbacks.onError?.({message: 'Request was cancelled'});
                this.stop(promiseId);
            } else if (pollState.attempts >= this.maxAttempts) {
                pollState.callbacks.onError?.({message: 'Polling timeout exceeded'});
                this.stop(promiseId);
            } else {
                pollState.timerId = setTimeout(() => this._poll(promiseId), this.interval);
            }
        } catch (error) {
            pollState.callbacks.onError?.({message: (error as Error).message});
            this.stop(promiseId);
        }
    }

    stop(promiseId: string): void {
        const pollState = this.activePollers.get(promiseId);
        if (pollState) {
            if (pollState.timerId) clearTimeout(pollState.timerId);
            this.activePollers.delete(promiseId);
        }
    }

    stopAll(): void {
        for (const promiseId of this.activePollers.keys()) this.stop(promiseId);
    }

    getActiveCount(): number {
        return this.activePollers.size;
    }
}

export interface AsyncApiClientConfig {
    serverUrl?: string;
    token?: string;
    clientId?: string;
    timeout?: number;
    polling?: PollingOptions;
}

export interface ScriptRunnerLike {
    execute(code: string, context: Record<string, unknown>): Promise<unknown>;
}

export class AsyncApiClient {
    serverUrl: string;
    token?: string;
    clientId?: string;
    timeout: number;
    poller: PromisePoller;

    constructor(config: AsyncApiClientConfig = {}) {
        this.serverUrl = (config.serverUrl ?? 'http://localhost:3000/api/v1').replace(/\/?$/, '');
        this.token = config.token;
        this.clientId = config.clientId;
        this.timeout = config.timeout ?? 30000;
        this.poller = new PromisePoller(this, config.polling ?? {});
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

    async createSession(projectId: string, title?: string): Promise<unknown> {
        const res = await this.request('POST', '/sessions', {projectId, title});
        return (res as { data?: unknown }).data;
    }

    async getSession(sessionId: string): Promise<unknown> {
        const res = await this.request('GET', `/sessions/${sessionId}`);
        return (res as { data?: unknown }).data;
    }

    async listSessions(
        projectId: string,
        options: { status?: string; limit?: number; offset?: number } = {}
    ): Promise<unknown> {
        const params = new URLSearchParams({projectId});
        if (options.status) params.append('status', options.status);
        if (options.limit != null) params.append('limit', String(options.limit));
        if (options.offset != null) params.append('offset', String(options.offset));
        const res = await this.request('GET', `/sessions?${params}`);
        return (res as { data?: unknown }).data;
    }

    async updateSession(sessionId: string, data: Record<string, unknown>): Promise<unknown> {
        const res = await this.request('PATCH', `/sessions/${sessionId}`, data);
        return (res as { data?: unknown }).data;
    }

    async deleteSession(sessionId: string): Promise<unknown> {
        const res = await this.request('DELETE', `/sessions/${sessionId}`);
        return (res as { data?: unknown }).data;
    }

    async getMessages(
        sessionId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<unknown> {
        const params = new URLSearchParams();
        if (options.limit != null) params.append('limit', String(options.limit));
        if (options.offset != null) params.append('offset', String(options.offset));
        const query = params.toString() ? `?${params}` : '';
        const res = await this.request('GET', `/sessions/${sessionId}/messages${query}`);
        return (res as { data?: unknown }).data;
    }

    async addMessage(sessionId: string, message: Record<string, unknown>): Promise<unknown> {
        const res = await this.request('POST', `/sessions/${sessionId}/messages`, message);
        return (res as { data?: unknown }).data;
    }

    async createRequest(data: Record<string, unknown>): Promise<{
        promiseId: string;
        requestId?: string;
        status?: string
    }> {
        const res = await this.request('POST', '/requests', data);
        return (res as { data?: { promiseId: string; requestId?: string; status?: string } }).data ?? (res as {
            promiseId: string;
            requestId?: string;
            status?: string
        });
    }

    async getRequestStatus(promiseId: string): Promise<unknown> {
        const res = await this.request('GET', `/requests/${promiseId}/status`);
        return (res as { data?: unknown }).data ?? res;
    }

    async getRequestResult(promiseId: string): Promise<unknown> {
        const res = await this.request('GET', `/requests/${promiseId}/result`);
        return (res as { data?: unknown }).data ?? res;
    }

    async cancelRequest(promiseId: string): Promise<unknown> {
        const res = await this.request('DELETE', `/requests/${promiseId}`);
        return (res as { data?: unknown }).data ?? res;
    }

    async getQueueStats(): Promise<unknown> {
        const res = await this.request('GET', '/requests/queue/stats');
        return (res as { data?: unknown }).data ?? res;
    }

    async startSession(
        opts: { projectPath?: string; task?: string; packageJson?: string | null; composerJson?: string | null },
        callbacks: PollCallbacks = {}
    ): Promise<unknown> {
        const {projectPath, task, packageJson, composerJson} = opts;
        const codeBlocks: Array<{ path: string; content: string }> = [];
        if (packageJson) codeBlocks.push({path: 'package.json', content: packageJson});
        if (composerJson) codeBlocks.push({path: 'composer.json', content: composerJson});
        const created = await this.createRequest({
            context: {project_path: projectPath, new_task: task ? [task] : undefined},
            codeBlocks,
        });
        const promiseId = created.promiseId;
        return new Promise((resolve, reject) => {
            this.poller.start(promiseId, {
                onStatus: callbacks.onStatus,
                onComplete: (result) => {
                    callbacks.onComplete?.(result);
                    resolve(result);
                },
                onError: (error) => {
                    callbacks.onError?.(error);
                    reject(new ApiError(error?.message ?? 'Request failed', 0, error as Record<string, unknown>));
                },
            });
        });
    }

    async sendCodeBlocks(
        opts: { projectPath?: string; graph?: unknown; codeBlocks: Array<{ path: string; content: string }> },
        callbacks: PollCallbacks = {}
    ): Promise<unknown> {
        const {projectPath, graph, codeBlocks} = opts;
        const created = await this.createRequest({
            context: {project_path: projectPath, graph},
            codeBlocks,
        });
        return new Promise((resolve, reject) => {
            this.poller.start(created.promiseId, {
                onStatus: callbacks.onStatus,
                onComplete: (result) => {
                    callbacks.onComplete?.(result);
                    resolve(result);
                },
                onError: (error) => {
                    callbacks.onError?.(error);
                    reject(new ApiError(error?.message ?? 'Request failed', 0, error as Record<string, unknown>));
                },
            });
        });
    }

    async runSessionWithRAG(
        opts: {
            projectPath: string;
            task?: string;
            rag?: {
                searcher: {
                    search: (q: string, opts: { limit: number }) => Promise<Array<{ chunk: { filePath: string } }>>
                }
            };
            maxIterations?: number;
        },
        callbacks: {
            onIteration?: (n: number, result: unknown) => void;
            onStatus?: PollCallbacks['onStatus'];
            onComplete?: (result: unknown) => void
        } = {}
    ): Promise<unknown> {
        const {projectPath, task, rag, maxIterations = 10} = opts;
        let packageJson: string | null = null;
        let composerJson: string | null = null;
        try {
            packageJson = fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8');
        } catch {
        }
        try {
            composerJson = fs.readFileSync(path.join(projectPath, 'composer.json'), 'utf-8');
        } catch {
        }
        let result = (await this.startSession(
            {projectPath, task, packageJson, composerJson},
            {onStatus: callbacks.onStatus}
        )) as { outcome?: string; graph?: { entities?: unknown[]; relations?: unknown[] }; questions?: string[] };
        let graph = result?.graph ?? {entities: [], relations: []};
        let iteration = 1;
        while (result?.outcome === 'graph_incomplete' && iteration < maxIterations) {
            callbacks.onIteration?.(iteration, result);
            const codeBlocks: Array<{ path: string; content: string }> = [];
            if (rag && result.questions?.length) {
                for (const question of result.questions) {
                    const searchResults = await rag.searcher.search(question, {limit: 3});
                    for (const searchResult of searchResults) {
                        const filePath = searchResult.chunk.filePath;
                        try {
                            const content = fs.readFileSync(path.join(projectPath, filePath), 'utf-8');
                            codeBlocks.push({path: filePath, content});
                        } catch {
                        }
                    }
                }
            }
            if (codeBlocks.length === 0) break;
            result = (await this.sendCodeBlocks(
                {projectPath, graph, codeBlocks},
                {onStatus: callbacks.onStatus}
            )) as typeof result;
            if (result?.graph) graph = result.graph;
            iteration++;
        }
        callbacks.onComplete?.(result);
        return result;
    }

    async sendMessage(
        sessionId: string,
        message: string,
        context: Record<string, unknown> = {},
        callbacks: PollCallbacks = {}
    ): Promise<unknown> {
        const created = await this.createRequest({
            sessionId,
            message,
            context: {version: '1.0', session_id: sessionId, ...context},
        });
        return new Promise((resolve, reject) => {
            this.poller.start(created.promiseId, {
                onStatus: callbacks.onStatus,
                onComplete: (result) => {
                    callbacks.onComplete?.(result);
                    resolve(result);
                },
                onError: (error) => {
                    callbacks.onError?.(error);
                    reject(new ApiError(error?.message ?? 'Request failed', 0, error as Record<string, unknown>));
                },
            });
        });
    }

    async invoke(opts: {
        context?: Record<string, unknown>;
        markdown?: string;
        files?: unknown[];
        sessionId?: string;
    }): Promise<unknown> {
        const res = await this.request('POST', '/invoke', {
            context: opts.context,
            message: opts.markdown,
            code_blocks: opts.files,
            sessionId: opts.sessionId,
        });
        return (res as { data?: unknown }).data ?? res;
    }

    async waitForResult(promiseId: string, callbacks: PollCallbacks = {}): Promise<unknown> {
        return new Promise((resolve, reject) => {
            this.poller.start(promiseId, {
                onStatus: callbacks.onStatus,
                onComplete: (result) => {
                    callbacks.onComplete?.(result);
                    resolve(result);
                },
                onError: (error) => {
                    callbacks.onError?.(error);
                    reject(new ApiError(error?.message ?? 'Request failed', 0, error as Record<string, unknown>));
                },
            });
        });
    }

    async executeAction(
        opts: {
            task: string | string[];
            sessionId: string;
            scriptRunner?: ScriptRunnerLike;
            projectPath?: string;
        },
        callbacks: {
            onStep?: (step: { id?: string; code?: string }, result: unknown) => void;
            onStatus?: PollCallbacks['onStatus'];
            onComplete?: (result: unknown) => void;
            onError?: (err: { step?: string; error?: string }) => void;
        } = {}
    ): Promise<unknown> {
        const {task, sessionId, scriptRunner, projectPath} = opts;
        const created = await this.createRequest({
            sessionId,
            context: {
                version: '1.0',
                session_id: sessionId,
                new_task: Array.isArray(task) ? task : [task],
                project_path: projectPath,
            },
        });
        let result = (await this.waitForResult(created.promiseId, {onStatus: callbacks.onStatus})) as {
            action?: { currentStep?: { id?: string; code?: string } };
        };
        if (!result?.action?.currentStep) {
            callbacks.onComplete?.(result);
            return result;
        }
        while (result?.action?.currentStep) {
            const step = result.action.currentStep;
            callbacks.onStep?.(step, result);
            let stepResult: unknown = null;
            if (step.code && scriptRunner) {
                try {
                    stepResult = await scriptRunner.execute(step.code, {
                        projectPath,
                        sessionId,
                        stepId: step.id,
                    });
                } catch (error) {
                    callbacks.onError?.({step: step.id, error: (error as Error).message});
                    throw new ApiError(`Step ${step.id} failed: ${(error as Error).message}`, 0, {step, error});
                }
            }
            const nextReq = await this.createRequest({
                sessionId,
                context: {
                    version: '1.0',
                    session_id: sessionId,
                    continue: true,
                    step_id: step.id,
                    step_result: stepResult,
                },
            });
            result = (await this.waitForResult(nextReq.promiseId, {onStatus: callbacks.onStatus})) as typeof result;
        }
        callbacks.onComplete?.(result);
        return result;
    }

    async continueAction(
        sessionId: string,
        stepId: string,
        stepResult: unknown,
        callbacks: PollCallbacks = {}
    ): Promise<unknown> {
        const created = await this.createRequest({
            sessionId,
            context: {
                version: '1.0',
                session_id: sessionId,
                continue: true,
                step_id: stepId,
                step_result: stepResult,
            },
        });
        return this.waitForResult(created.promiseId, callbacks);
    }
}
