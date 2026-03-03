/**
 * @a2a/api-client - Async HTTP client (Promise/Polling)
 * Enhanced with session management, retry logic, and progress tracking
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Import session types
import type {
    Session,
    SessionMetadata,
    SessionFilter,
    SessionUpdate,
    CreateSessionOptions,
    ProgressInfo,
    ProgressCallbacks
} from './types/session.js';

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

// Retry configuration interface
export interface RetryConfig {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryOn?: (error: ApiError) => boolean;
}

// Request/Response transformation interface
export interface RequestTransformer {
    transformRequest?: (data: Record<string, unknown>) => Record<string, unknown>;
    transformResponse?: (data: Record<string, unknown>) => Record<string, unknown>;
}

// Progress tracking configuration
export interface ProgressConfig {
    enabled?: boolean;
    interval?: number;
    onProgress?: (progress: ProgressInfo) => void;
}

export interface PollCallbacks {
    onComplete?: (result: unknown) => void;
    onError?: (error: { message?: string }) => void;
    onStatus?: (status: unknown) => void;
    onProgress?: (progress: ProgressInfo) => void;
}

interface PollState {
    timerId: ReturnType<typeof setTimeout> | null;
    callbacks: PollCallbacks;
    attempts: number;
    startTime: number;
    lastProgress?: number;
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
        this.activePollers.set(promiseId, {
            timerId: null,
            callbacks,
            attempts: 0,
            startTime: Date.now()
        });
        this._poll(promiseId);
    }

    private _buildProgressInfo(status: Record<string, unknown>, attempts: number, startTime: number): ProgressInfo {
        const st = status as { status?: string; progress?: number; message?: string };
        const progress = st.progress ?? Math.min((attempts / this.maxAttempts) * 100, 95);
        const elapsed = Date.now() - startTime;
        
        return {
            promiseId: '', // Will be set by caller
            status: st.status ?? 'pending',
            progress,
            message: st.message ?? `Processing... (${attempts} attempts, ${Math.round(elapsed / 1000)}s elapsed)`,
        };
    }

    private async _poll(promiseId: string): Promise<void> {
        const pollState = this.activePollers.get(promiseId);
        if (!pollState) return;
        pollState.attempts++;
        try {
            const status = await this.api.getRequestStatus(promiseId);
            pollState.callbacks.onStatus?.(status);
            
            // Build and emit progress info
            const progressInfo: ProgressInfo = {
                promiseId,
                status: (status as { status?: string }).status ?? 'pending',
                progress: Math.min((pollState.attempts / this.maxAttempts) * 100, 95),
                message: `Status: ${(status as { status?: string }).status ?? 'unknown'}`,
            };
            pollState.callbacks.onProgress?.(progressInfo);
            
            const st = status as { status?: string };
            if (st.status === 'completed') {
                const result = await this.api.getRequestResult(promiseId);
                progressInfo.status = 'completed';
                progressInfo.progress = 100;
                progressInfo.message = 'Request completed successfully';
                progressInfo.result = result;
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onComplete?.(result);
                this.stop(promiseId);
            } else if (st.status === 'failed') {
                const result = (await this.api.getRequestResult(promiseId)) as { error?: { message?: string } };
                progressInfo.status = 'failed';
                progressInfo.error = result?.error?.message ?? 'Request failed';
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onError?.(result?.error ?? {message: 'Request failed'});
                this.stop(promiseId);
            } else if (st.status === 'cancelled') {
                progressInfo.status = 'cancelled';
                progressInfo.error = 'Request was cancelled';
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onError?.({message: 'Request was cancelled'});
                this.stop(promiseId);
            } else if (pollState.attempts >= this.maxAttempts) {
                progressInfo.status = 'timeout';
                progressInfo.error = 'Polling timeout exceeded';
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onError?.({message: 'Polling timeout exceeded'});
                this.stop(promiseId);
            } else {
                pollState.timerId = setTimeout(() => this._poll(promiseId), this.interval);
            }
        } catch (error) {
            const progressInfo: ProgressInfo = {
                promiseId,
                status: 'error',
                error: (error as Error).message,
            };
            pollState.callbacks.onProgress?.(progressInfo);
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
    retry?: RetryConfig;
    transformer?: RequestTransformer;
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
    retryConfig: Required<RetryConfig>;
    transformer?: RequestTransformer;

    constructor(config: AsyncApiClientConfig = {}) {
        this.serverUrl = (config.serverUrl ?? 'http://localhost:3000/api/v1').replace(/\/?$/, '');
        this.token = config.token;
        this.clientId = config.clientId;
        this.timeout = config.timeout ?? 30000;
        this.poller = new PromisePoller(this, config.polling ?? {});
        
        // Initialize retry config with defaults
        this.retryConfig = {
            maxRetries: config.retry?.maxRetries ?? 3,
            initialDelay: config.retry?.initialDelay ?? 1000,
            maxDelay: config.retry?.maxDelay ?? 10000,
            backoffMultiplier: config.retry?.backoffMultiplier ?? 2,
            retryOn: config.retry?.retryOn ?? ((error: ApiError) => {
                // Retry on network errors or 5xx status codes
                return error.status >= 500 || error.status === 0;
            }),
        };
        
        this.transformer = config.transformer;
    }

    /**
     * Calculate delay for exponential backoff
     */
    private calculateDelay(attempt: number): number {
        const delay = this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
        return Math.min(delay, this.retryConfig.maxDelay);
    }

    /**
     * Check if error is retryable
     */
    private isRetryable(error: ApiError): boolean {
        return this.retryConfig.retryOn(error);
    }

    async request(
        method: string,
        path: string,
        body: Record<string, unknown> | null = null
    ): Promise<Record<string, unknown>> {
        // Apply request transformer if available
        let requestBody = body;
        if (this.transformer?.transformRequest && body) {
            requestBody = this.transformer.transformRequest(body);
        }

        const url = `${this.serverUrl}${path}`;
        const headers: Record<string, string> = {'Content-Type': 'application/json'};
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        if (this.clientId) headers['X-Client-ID'] = this.clientId;
        const options: RequestInit & { timeout?: number } = {method, headers, timeout: this.timeout};
        if (requestBody) options.body = JSON.stringify(requestBody);
        
        let lastError: ApiError | null = null;
        
        // Retry loop
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const response = await fetch(url, options as RequestInit);
                const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
                
                if (!response.ok) {
                    const err = data?.error as { message?: string } | undefined;
                    const apiError = new ApiError(err?.message ?? 'Request failed', response.status, data);
                    
                    // Check if we should retry
                    if (attempt < this.retryConfig.maxRetries && this.isRetryable(apiError)) {
                        const delay = this.calculateDelay(attempt);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        lastError = apiError;
                        continue;
                    }
                    
                    throw apiError;
                }
                
                // Apply response transformer if available
                if (this.transformer?.transformResponse) {
                    return this.transformer.transformResponse(data);
                }
                
                return data;
            } catch (err) {
                if ((err as Error).name === 'AbortError') {
                    throw new ApiError('Request timeout', 408);
                }
                
                // Check if we should retry on fetch errors
                if (err instanceof ApiError) {
                    if (attempt < this.retryConfig.maxRetries && this.isRetryable(err)) {
                        const delay = this.calculateDelay(attempt);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        lastError = err;
                        continue;
                    }
                    throw err;
                }
                
                // Network errors
                if (attempt < this.retryConfig.maxRetries) {
                    const delay = this.calculateDelay(attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    lastError = new ApiError((err as Error).message, 0);
                    continue;
                }
                
                throw err;
            }
        }
        
        // If we get here, all retries failed
        throw lastError ?? new ApiError('Request failed after retries', 0);
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

    // ==================== Enhanced Session Management ====================

    /**
     * Create a new session with options
     */
    async createSessionWithOptions(options: CreateSessionOptions): Promise<Session> {
        const res = await this.request('POST', '/sessions', {
            projectId: options.projectId,
            title: options.title ?? 'New Session',
            task: options.task,
        });
        return (res as { data?: Session }).data as Session;
    }

    /**
     * Get session with full details
     */
    async getSessionDetails(sessionId: string): Promise<Session> {
        const res = await this.request('GET', `/sessions/${sessionId}`);
        return (res as { data?: Session }).data as Session;
    }

    /**
     * List sessions with filter options
     */
    async listSessionsWithFilter(filter: SessionFilter): Promise<SessionMetadata[]> {
        const params = new URLSearchParams();
        if (filter.projectId) params.append('projectId', filter.projectId);
        if (filter.status) params.append('status', filter.status);
        if (filter.limit != null) params.append('limit', String(filter.limit));
        if (filter.offset != null) params.append('offset', String(filter.offset));
        
        const res = await this.request('GET', `/sessions?${params}`);
        return (res as { data?: SessionMetadata[] }).data ?? [];
    }

    /**
     * Update session with specific fields
     */
    async updateSessionWithOptions(sessionId: string, update: SessionUpdate): Promise<Session> {
        const res = await this.request('PATCH', `/sessions/${sessionId}`, update as Record<string, unknown>);
        return (res as { data?: Session }).data as Session;
    }

    /**
     * Delete multiple sessions
     */
    async deleteMultipleSessions(sessionIds: string[]): Promise<{ deleted: string[]; failed: string[] }> {
        const deleted: string[] = [];
        const failed: string[] = [];
        
        for (const sessionId of sessionIds) {
            try {
                await this.deleteSession(sessionId);
                deleted.push(sessionId);
            } catch {
                failed.push(sessionId);
            }
        }
        
        return { deleted, failed };
    }

    // ==================== Progress Tracking ====================

    /**
     * Wait for result with progress tracking
     */
    async waitForResultWithProgress(
        promiseId: string,
        callbacks: ProgressCallbacks
    ): Promise<unknown> {
        return new Promise((resolve, reject) => {
            this.poller.start(promiseId, {
                onProgress: callbacks.onProgress,
                onStatus: callbacks.onProgress
                    ? (status) => callbacks.onProgress?.({
                          promiseId,
                          status: (status as { status?: string }).status ?? 'pending',
                          progress: 0,
                          message: 'Processing...',
                      })
                    : undefined,
                onComplete: (result) => {
                    callbacks.onComplete?.(result);
                    resolve(result);
                },
                onError: (error) => {
                    const err = new ApiError(error?.message ?? 'Request failed', 0, error as Record<string, unknown>);
                    callbacks.onError?.(err);
                    reject(err);
                },
            });
        });
    }

    /**
     * Get current progress of a request
     */
    async getRequestProgress(promiseId: string): Promise<ProgressInfo> {
        const status = await this.getRequestStatus(promiseId);
        const st = status as { status?: string; progress?: number; message?: string };
        
        return {
            promiseId,
            status: st.status ?? 'unknown',
            progress: st.progress ?? 0,
            message: st.message ?? 'Unknown status',
        };
    }

    /**
     * Subscribe to progress updates via SSE
     */
    async subscribeToProgress(
        sessionId: string,
        onProgress: (progress: ProgressInfo) => void
    ): Promise<() => void> {
        const response = await fetch(`${this.serverUrl}/sse/${encodeURIComponent(sessionId)}`, {
            headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });

        if (!response.ok || !response.body) {
            throw new ApiError('Failed to subscribe to progress', response.status);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const read = async (): Promise<void> => {
            const { done, value } = await reader.read();
            if (done) return;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        onProgress({
                            promiseId: sessionId,
                            status: data.status ?? 'progress',
                            progress: data.progress ?? 0,
                            message: data.message ?? '',
                            result: data.result,
                        });
                    } catch {
                        // Ignore parse errors
                    }
                }
            }

            await read();
        };

        read();

        // Return unsubscribe function
        return () => {
            reader.cancel();
        };
    }
}
