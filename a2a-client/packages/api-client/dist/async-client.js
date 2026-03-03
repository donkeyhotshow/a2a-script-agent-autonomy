"use strict";
/**
 * @a2a/api-client - Async HTTP client (Promise/Polling)
 * Enhanced with session management, retry logic, and progress tracking
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncApiClient = exports.PromisePoller = exports.ApiError = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ApiError extends Error {
    constructor(message, status, data = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}
exports.ApiError = ApiError;
class PromisePoller {
    constructor(apiClient, options = {}) {
        this.activePollers = new Map();
        this.api = apiClient;
        this.interval = options.interval ?? 5000;
        this.maxAttempts = options.maxAttempts ?? 720;
    }
    start(promiseId, callbacks) {
        if (this.activePollers.has(promiseId))
            return;
        this.activePollers.set(promiseId, {
            timerId: null,
            callbacks,
            attempts: 0,
            startTime: Date.now()
        });
        this._poll(promiseId);
    }
    _buildProgressInfo(status, attempts, startTime) {
        const st = status;
        const progress = st.progress ?? Math.min((attempts / this.maxAttempts) * 100, 95);
        const elapsed = Date.now() - startTime;
        return {
            promiseId: '', // Will be set by caller
            status: st.status ?? 'pending',
            progress,
            message: st.message ?? `Processing... (${attempts} attempts, ${Math.round(elapsed / 1000)}s elapsed)`,
        };
    }
    async _poll(promiseId) {
        const pollState = this.activePollers.get(promiseId);
        if (!pollState)
            return;
        pollState.attempts++;
        try {
            const status = await this.api.getRequestStatus(promiseId);
            pollState.callbacks.onStatus?.(status);
            // Build and emit progress info
            const progressInfo = {
                promiseId,
                status: status.status ?? 'pending',
                progress: Math.min((pollState.attempts / this.maxAttempts) * 100, 95),
                message: `Status: ${status.status ?? 'unknown'}`,
            };
            pollState.callbacks.onProgress?.(progressInfo);
            const st = status;
            if (st.status === 'completed') {
                const result = await this.api.getRequestResult(promiseId);
                progressInfo.status = 'completed';
                progressInfo.progress = 100;
                progressInfo.message = 'Request completed successfully';
                progressInfo.result = result;
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onComplete?.(result);
                this.stop(promiseId);
            }
            else if (st.status === 'failed') {
                const result = (await this.api.getRequestResult(promiseId));
                progressInfo.status = 'failed';
                progressInfo.error = result?.error?.message ?? 'Request failed';
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onError?.(result?.error ?? { message: 'Request failed' });
                this.stop(promiseId);
            }
            else if (st.status === 'cancelled') {
                progressInfo.status = 'cancelled';
                progressInfo.error = 'Request was cancelled';
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onError?.({ message: 'Request was cancelled' });
                this.stop(promiseId);
            }
            else if (pollState.attempts >= this.maxAttempts) {
                progressInfo.status = 'timeout';
                progressInfo.error = 'Polling timeout exceeded';
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onError?.({ message: 'Polling timeout exceeded' });
                this.stop(promiseId);
            }
            else {
                pollState.timerId = setTimeout(() => this._poll(promiseId), this.interval);
            }
        }
        catch (error) {
            const progressInfo = {
                promiseId,
                status: 'error',
                error: error.message,
            };
            pollState.callbacks.onProgress?.(progressInfo);
            pollState.callbacks.onError?.({ message: error.message });
            this.stop(promiseId);
        }
    }
    stop(promiseId) {
        const pollState = this.activePollers.get(promiseId);
        if (pollState) {
            if (pollState.timerId)
                clearTimeout(pollState.timerId);
            this.activePollers.delete(promiseId);
        }
    }
    stopAll() {
        for (const promiseId of this.activePollers.keys())
            this.stop(promiseId);
    }
    getActiveCount() {
        return this.activePollers.size;
    }
}
exports.PromisePoller = PromisePoller;
class AsyncApiClient {
    constructor(config = {}) {
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
            retryOn: config.retry?.retryOn ?? ((error) => {
                // Retry on network errors or 5xx status codes
                return error.status >= 500 || error.status === 0;
            }),
        };
        this.transformer = config.transformer;
    }
    /**
     * Calculate delay for exponential backoff
     */
    calculateDelay(attempt) {
        const delay = this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
        return Math.min(delay, this.retryConfig.maxDelay);
    }
    /**
     * Check if error is retryable
     */
    isRetryable(error) {
        return this.retryConfig.retryOn(error);
    }
    async request(method, path, body = null) {
        // Apply request transformer if available
        let requestBody = body;
        if (this.transformer?.transformRequest && body) {
            requestBody = this.transformer.transformRequest(body);
        }
        const url = `${this.serverUrl}${path}`;
        const headers = { 'Content-Type': 'application/json' };
        if (this.token)
            headers['Authorization'] = `Bearer ${this.token}`;
        if (this.clientId)
            headers['X-Client-ID'] = this.clientId;
        const options = { method, headers, timeout: this.timeout };
        if (requestBody)
            options.body = JSON.stringify(requestBody);
        let lastError = null;
        // Retry loop
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const response = await (0, node_fetch_1.default)(url, options);
                const data = (await response.json().catch(() => ({})));
                if (!response.ok) {
                    const err = data?.error;
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
            }
            catch (err) {
                if (err.name === 'AbortError') {
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
                    lastError = new ApiError(err.message, 0);
                    continue;
                }
                throw err;
            }
        }
        // If we get here, all retries failed
        throw lastError ?? new ApiError('Request failed after retries', 0);
    }
    async createSession(projectId, title) {
        const res = await this.request('POST', '/sessions', { projectId, title });
        return res.data;
    }
    async getSession(sessionId) {
        const res = await this.request('GET', `/sessions/${sessionId}`);
        return res.data;
    }
    async listSessions(projectId, options = {}) {
        const params = new URLSearchParams({ projectId });
        if (options.status)
            params.append('status', options.status);
        if (options.limit != null)
            params.append('limit', String(options.limit));
        if (options.offset != null)
            params.append('offset', String(options.offset));
        const res = await this.request('GET', `/sessions?${params}`);
        return res.data;
    }
    async updateSession(sessionId, data) {
        const res = await this.request('PATCH', `/sessions/${sessionId}`, data);
        return res.data;
    }
    async deleteSession(sessionId) {
        const res = await this.request('DELETE', `/sessions/${sessionId}`);
        return res.data;
    }
    async getMessages(sessionId, options = {}) {
        const params = new URLSearchParams();
        if (options.limit != null)
            params.append('limit', String(options.limit));
        if (options.offset != null)
            params.append('offset', String(options.offset));
        const query = params.toString() ? `?${params}` : '';
        const res = await this.request('GET', `/sessions/${sessionId}/messages${query}`);
        return res.data;
    }
    async addMessage(sessionId, message) {
        const res = await this.request('POST', `/sessions/${sessionId}/messages`, message);
        return res.data;
    }
    async createRequest(data) {
        const res = await this.request('POST', '/requests', data);
        return res.data ?? res;
    }
    async getRequestStatus(promiseId) {
        const res = await this.request('GET', `/requests/${promiseId}/status`);
        return res.data ?? res;
    }
    async getRequestResult(promiseId) {
        const res = await this.request('GET', `/requests/${promiseId}/result`);
        return res.data ?? res;
    }
    async cancelRequest(promiseId) {
        const res = await this.request('DELETE', `/requests/${promiseId}`);
        return res.data ?? res;
    }
    async getQueueStats() {
        const res = await this.request('GET', '/requests/queue/stats');
        return res.data ?? res;
    }
    async startSession(opts, callbacks = {}) {
        const { projectPath, task, packageJson, composerJson } = opts;
        const codeBlocks = [];
        if (packageJson)
            codeBlocks.push({ path: 'package.json', content: packageJson });
        if (composerJson)
            codeBlocks.push({ path: 'composer.json', content: composerJson });
        const created = await this.createRequest({
            context: { project_path: projectPath, new_task: task ? [task] : undefined },
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
                    reject(new ApiError(error?.message ?? 'Request failed', 0, error));
                },
            });
        });
    }
    async sendCodeBlocks(opts, callbacks = {}) {
        const { projectPath, graph, codeBlocks } = opts;
        const created = await this.createRequest({
            context: { project_path: projectPath, graph },
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
                    reject(new ApiError(error?.message ?? 'Request failed', 0, error));
                },
            });
        });
    }
    async runSessionWithRAG(opts, callbacks = {}) {
        const { projectPath, task, rag, maxIterations = 10 } = opts;
        let packageJson = null;
        let composerJson = null;
        try {
            packageJson = fs_1.default.readFileSync(path_1.default.join(projectPath, 'package.json'), 'utf-8');
        }
        catch {
        }
        try {
            composerJson = fs_1.default.readFileSync(path_1.default.join(projectPath, 'composer.json'), 'utf-8');
        }
        catch {
        }
        let result = (await this.startSession({ projectPath, task, packageJson, composerJson }, { onStatus: callbacks.onStatus }));
        let graph = result?.graph ?? { entities: [], relations: [] };
        let iteration = 1;
        while (result?.outcome === 'graph_incomplete' && iteration < maxIterations) {
            callbacks.onIteration?.(iteration, result);
            const codeBlocks = [];
            if (rag && result.questions?.length) {
                for (const question of result.questions) {
                    const searchResults = await rag.searcher.search(question, { limit: 3 });
                    for (const searchResult of searchResults) {
                        const filePath = searchResult.chunk.filePath;
                        try {
                            const content = fs_1.default.readFileSync(path_1.default.join(projectPath, filePath), 'utf-8');
                            codeBlocks.push({ path: filePath, content });
                        }
                        catch {
                        }
                    }
                }
            }
            if (codeBlocks.length === 0)
                break;
            result = (await this.sendCodeBlocks({ projectPath, graph, codeBlocks }, { onStatus: callbacks.onStatus }));
            if (result?.graph)
                graph = result.graph;
            iteration++;
        }
        callbacks.onComplete?.(result);
        return result;
    }
    async sendMessage(sessionId, message, context = {}, callbacks = {}) {
        const created = await this.createRequest({
            sessionId,
            message,
            context: { version: '1.0', session_id: sessionId, ...context },
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
                    reject(new ApiError(error?.message ?? 'Request failed', 0, error));
                },
            });
        });
    }
    async invoke(opts) {
        const res = await this.request('POST', '/invoke', {
            context: opts.context,
            message: opts.markdown,
            code_blocks: opts.files,
            sessionId: opts.sessionId,
        });
        return res.data ?? res;
    }
    async waitForResult(promiseId, callbacks = {}) {
        return new Promise((resolve, reject) => {
            this.poller.start(promiseId, {
                onStatus: callbacks.onStatus,
                onComplete: (result) => {
                    callbacks.onComplete?.(result);
                    resolve(result);
                },
                onError: (error) => {
                    callbacks.onError?.(error);
                    reject(new ApiError(error?.message ?? 'Request failed', 0, error));
                },
            });
        });
    }
    async executeAction(opts, callbacks = {}) {
        const { task, sessionId, scriptRunner, projectPath } = opts;
        const created = await this.createRequest({
            sessionId,
            context: {
                version: '1.0',
                session_id: sessionId,
                new_task: Array.isArray(task) ? task : [task],
                project_path: projectPath,
            },
        });
        let result = (await this.waitForResult(created.promiseId, { onStatus: callbacks.onStatus }));
        if (!result?.action?.currentStep) {
            callbacks.onComplete?.(result);
            return result;
        }
        while (result?.action?.currentStep) {
            const step = result.action.currentStep;
            callbacks.onStep?.(step, result);
            let stepResult = null;
            if (step.code && scriptRunner) {
                try {
                    stepResult = await scriptRunner.execute(step.code, {
                        projectPath,
                        sessionId,
                        stepId: step.id,
                    });
                }
                catch (error) {
                    callbacks.onError?.({ step: step.id, error: error.message });
                    throw new ApiError(`Step ${step.id} failed: ${error.message}`, 0, { step, error });
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
            result = (await this.waitForResult(nextReq.promiseId, { onStatus: callbacks.onStatus }));
        }
        callbacks.onComplete?.(result);
        return result;
    }
    async continueAction(sessionId, stepId, stepResult, callbacks = {}) {
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
    async createSessionWithOptions(options) {
        const res = await this.request('POST', '/sessions', {
            projectId: options.projectId,
            title: options.title ?? 'New Session',
            task: options.task,
        });
        return res.data;
    }
    /**
     * Get session with full details
     */
    async getSessionDetails(sessionId) {
        const res = await this.request('GET', `/sessions/${sessionId}`);
        return res.data;
    }
    /**
     * List sessions with filter options
     */
    async listSessionsWithFilter(filter) {
        const params = new URLSearchParams();
        if (filter.projectId)
            params.append('projectId', filter.projectId);
        if (filter.status)
            params.append('status', filter.status);
        if (filter.limit != null)
            params.append('limit', String(filter.limit));
        if (filter.offset != null)
            params.append('offset', String(filter.offset));
        const res = await this.request('GET', `/sessions?${params}`);
        return res.data ?? [];
    }
    /**
     * Update session with specific fields
     */
    async updateSessionWithOptions(sessionId, update) {
        const res = await this.request('PATCH', `/sessions/${sessionId}`, update);
        return res.data;
    }
    /**
     * Delete multiple sessions
     */
    async deleteMultipleSessions(sessionIds) {
        const deleted = [];
        const failed = [];
        for (const sessionId of sessionIds) {
            try {
                await this.deleteSession(sessionId);
                deleted.push(sessionId);
            }
            catch {
                failed.push(sessionId);
            }
        }
        return { deleted, failed };
    }
    // ==================== Progress Tracking ====================
    /**
     * Wait for result with progress tracking
     */
    async waitForResultWithProgress(promiseId, callbacks) {
        return new Promise((resolve, reject) => {
            this.poller.start(promiseId, {
                onProgress: callbacks.onProgress,
                onStatus: callbacks.onProgress
                    ? (status) => callbacks.onProgress?.({
                        promiseId,
                        status: status.status ?? 'pending',
                        progress: 0,
                        message: 'Processing...',
                    })
                    : undefined,
                onComplete: (result) => {
                    callbacks.onComplete?.(result);
                    resolve(result);
                },
                onError: (error) => {
                    const err = new ApiError(error?.message ?? 'Request failed', 0, error);
                    callbacks.onError?.(err);
                    reject(err);
                },
            });
        });
    }
    /**
     * Get current progress of a request
     */
    async getRequestProgress(promiseId) {
        const status = await this.getRequestStatus(promiseId);
        const st = status;
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
    async subscribeToProgress(sessionId, onProgress) {
        const response = await (0, node_fetch_1.default)(`${this.serverUrl}/sse/${encodeURIComponent(sessionId)}`, {
            headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });
        if (!response.ok || !response.body) {
            throw new ApiError('Failed to subscribe to progress', response.status);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const read = async () => {
            const { done, value } = await reader.read();
            if (done)
                return;
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
                    }
                    catch {
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
exports.AsyncApiClient = AsyncApiClient;
