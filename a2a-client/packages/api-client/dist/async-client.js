"use strict";
/**
 * @a2a/api-client - Async HTTP client (Promise/Polling)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : {"default": mod};
};
Object.defineProperty(exports, "__esModule", {value: true});
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
        this.activePollers.set(promiseId, {timerId: null, callbacks, attempts: 0});
        this._poll(promiseId);
    }

    async _poll(promiseId) {
        const pollState = this.activePollers.get(promiseId);
        if (!pollState)
            return;
        pollState.attempts++;
        try {
            const status = await this.api.getRequestStatus(promiseId);
            pollState.callbacks.onStatus?.(status);
            const st = status;
            if (st.status === 'completed') {
                const result = await this.api.getRequestResult(promiseId);
                pollState.callbacks.onComplete?.(result);
                this.stop(promiseId);
            } else if (st.status === 'failed') {
                const result = (await this.api.getRequestResult(promiseId));
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
            pollState.callbacks.onError?.({message: error.message});
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
    }

    async request(method, path, body = null) {
        const url = `${this.serverUrl}${path}`;
        const headers = {'Content-Type': 'application/json'};
        if (this.token)
            headers['Authorization'] = `Bearer ${this.token}`;
        if (this.clientId)
            headers['X-Client-ID'] = this.clientId;
        const options = {method, headers, timeout: this.timeout};
        if (body)
            options.body = JSON.stringify(body);
        try {
            const response = await (0, node_fetch_1.default)(url, options);
            const data = (await response.json().catch(() => ({})));
            if (!response.ok) {
                const err = data?.error;
                throw new ApiError(err?.message ?? 'Request failed', response.status, data);
            }
            return data;
        } catch (err) {
            if (err.name === 'AbortError')
                throw new ApiError('Request timeout', 408);
            throw err;
        }
    }

    async createSession(projectId, title) {
        const res = await this.request('POST', '/sessions', {projectId, title});
        return res.data;
    }

    async getSession(sessionId) {
        const res = await this.request('GET', `/sessions/${sessionId}`);
        return res.data;
    }

    async listSessions(projectId, options = {}) {
        const params = new URLSearchParams({projectId});
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
        const {projectPath, task, packageJson, composerJson} = opts;
        const codeBlocks = [];
        if (packageJson)
            codeBlocks.push({path: 'package.json', content: packageJson});
        if (composerJson)
            codeBlocks.push({path: 'composer.json', content: composerJson});
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
                    reject(new ApiError(error?.message ?? 'Request failed', 0, error));
                },
            });
        });
    }

    async sendCodeBlocks(opts, callbacks = {}) {
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
                    reject(new ApiError(error?.message ?? 'Request failed', 0, error));
                },
            });
        });
    }

    async runSessionWithRAG(opts, callbacks = {}) {
        const {projectPath, task, rag, maxIterations = 10} = opts;
        let packageJson = null;
        let composerJson = null;
        try {
            packageJson = fs_1.default.readFileSync(path_1.default.join(projectPath, 'package.json'), 'utf-8');
        } catch {
        }
        try {
            composerJson = fs_1.default.readFileSync(path_1.default.join(projectPath, 'composer.json'), 'utf-8');
        } catch {
        }
        let result = (await this.startSession({
            projectPath,
            task,
            packageJson,
            composerJson
        }, {onStatus: callbacks.onStatus}));
        let graph = result?.graph ?? {entities: [], relations: []};
        let iteration = 1;
        while (result?.outcome === 'graph_incomplete' && iteration < maxIterations) {
            callbacks.onIteration?.(iteration, result);
            const codeBlocks = [];
            if (rag && result.questions?.length) {
                for (const question of result.questions) {
                    const searchResults = await rag.searcher.search(question, {limit: 3});
                    for (const searchResult of searchResults) {
                        const filePath = searchResult.chunk.filePath;
                        try {
                            const content = fs_1.default.readFileSync(path_1.default.join(projectPath, filePath), 'utf-8');
                            codeBlocks.push({path: filePath, content});
                        } catch {
                        }
                    }
                }
            }
            if (codeBlocks.length === 0)
                break;
            result = (await this.sendCodeBlocks({projectPath, graph, codeBlocks}, {onStatus: callbacks.onStatus}));
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
        let result = (await this.waitForResult(created.promiseId, {onStatus: callbacks.onStatus}));
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
                } catch (error) {
                    callbacks.onError?.({step: step.id, error: error.message});
                    throw new ApiError(`Step ${step.id} failed: ${error.message}`, 0, {step, error});
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
            result = (await this.waitForResult(nextReq.promiseId, {onStatus: callbacks.onStatus}));
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
}

exports.AsyncApiClient = AsyncApiClient;
