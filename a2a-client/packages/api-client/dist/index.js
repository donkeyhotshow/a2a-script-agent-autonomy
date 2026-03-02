"use strict";
/**
 * @a2a/api-client - HTTP client for A2A server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : {"default": mod};
};
Object.defineProperty(exports, "__esModule", {value: true});
exports.parseMessage = exports.parseFileBlock = exports.serializeFileBlock = exports.buildFileResponseContext = exports.buildConfirmContext = exports.buildContinueContext = exports.buildNewTaskContext = exports.createExecuteCode = exports.handleActionResponse = exports.PromisePoller = exports.AsyncApiClient = exports.ApiClient = exports.ApiError = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const protocol_1 = require("./protocol");
const async_client_1 = require("./async-client");
Object.defineProperty(exports, "AsyncApiClient", {
    enumerable: true, get: function () {
        return async_client_1.AsyncApiClient;
    }
});
Object.defineProperty(exports, "PromisePoller", {
    enumerable: true, get: function () {
        return async_client_1.PromisePoller;
    }
});
const action_handler_1 = require("./action-handler");
Object.defineProperty(exports, "handleActionResponse", {
    enumerable: true, get: function () {
        return action_handler_1.handleActionResponse;
    }
});
Object.defineProperty(exports, "createExecuteCode", {
    enumerable: true, get: function () {
        return action_handler_1.createExecuteCode;
    }
});

class ApiError extends Error {
    constructor(message, status, data = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

exports.ApiError = ApiError;

class ApiClient {
    constructor(config = {}) {
        this.serverUrl = (config.serverUrl ?? 'http://localhost:3000/api/v1').replace(/\/?$/, '');
        this.token = config.token;
        this.clientId = config.clientId;
        this.timeout = config.timeout ?? 30000;
        this.async = new async_client_1.AsyncApiClient(config);
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

    _sendBody(context, files = []) {
        const body = {context};
        if (files.length)
            body.files = files.map((f) => ({path: f.path, content: f.content}));
        return body;
    }

    async createSession(projectId) {
        const res = await this.request('POST', '/sessions', {project_id: projectId});
        return res.data ?? res;
    }

    async createCard(card) {
        const projectId = card.project?.id ?? card.projectId;
        if (!projectId)
            throw new ApiError('projectId required', 400);
        const req = card.userRequest?.original ?? card.request?.raw ?? '';
        const arch = card.architecturalFeatures ?? card.architectural_features;
        return this.createCardByProject(projectId, req, arch);
    }

    async createCardByProject(projectId, userRequest, architecturalFeatures) {
        const session = (await this.createSession(projectId));
        const sid = session.session_id;
        if (!sid)
            throw new ApiError('No session_id in response', 500);
        const task = Array.isArray(userRequest) ? userRequest : [String(userRequest ?? '')];
        const msg = (await this.sendMessage(sid, task, architecturalFeatures));
        const status = msg.tasks?.length ? 'task_created' : 'processing';
        return {...msg, status, card: {cardId: sid}};
    }

    async reportCommands(sessionId, _commandResults) {
        return this.continueSession(sessionId);
    }

    async answerQuestions(sessionId, _answers) {
        return this.confirmSession(sessionId);
    }

    async getSession(sessionId) {
        const res = await this.request('GET', `/sessions/${sessionId}`);
        return res.data ?? res;
    }

    async sendMessage(sessionId, newTask, architecturalFeatures) {
        const context = (0, protocol_1.buildNewTaskContext)(sessionId, newTask, architecturalFeatures);
        const body = {context, new_task: newTask};
        const res = await this.request('POST', `/sessions/${sessionId}/message`, body);
        return res.data ?? res;
    }

    async getSessionContext(sessionId) {
        const res = await this.request('GET', `/sessions/${sessionId}/context`);
        return res.data ?? res;
    }

    async continueSession(sessionId) {
        const context = (0, protocol_1.buildContinueContext)(sessionId);
        const res = await this.request('POST', `/sessions/${sessionId}/continue`, {context});
        return res.data ?? res;
    }

    async confirmSession(sessionId, files = []) {
        const context = (0, protocol_1.buildConfirmContext)(sessionId);
        const body = this._sendBody(context, files);
        const res = await this.request('POST', `/sessions/${sessionId}/confirm`, body);
        return res.data ?? res;
    }

    async sendFiles(sessionId, files) {
        const context = (0, protocol_1.buildFileResponseContext)(sessionId);
        const body = this._sendBody(context, files);
        const res = await this.request('POST', `/sessions/${sessionId}/files`, body);
        return res.data ?? res;
    }

    async deleteSession(sessionId) {
        await this.request('DELETE', `/sessions/${sessionId}`);
    }

    async invoke(opts) {
        const res = await this.request('POST', '/invoke', {
            markdown: opts.markdown,
            context: opts.context ?? {},
            files: opts.files ?? [],
        });
        return res.data ?? res;
    }
}

exports.ApiClient = ApiClient;
var protocol_2 = require("./protocol");
Object.defineProperty(exports, "buildNewTaskContext", {
    enumerable: true, get: function () {
        return protocol_2.buildNewTaskContext;
    }
});
Object.defineProperty(exports, "buildContinueContext", {
    enumerable: true, get: function () {
        return protocol_2.buildContinueContext;
    }
});
Object.defineProperty(exports, "buildConfirmContext", {
    enumerable: true, get: function () {
        return protocol_2.buildConfirmContext;
    }
});
Object.defineProperty(exports, "buildFileResponseContext", {
    enumerable: true, get: function () {
        return protocol_2.buildFileResponseContext;
    }
});
Object.defineProperty(exports, "serializeFileBlock", {
    enumerable: true, get: function () {
        return protocol_2.serializeFileBlock;
    }
});
Object.defineProperty(exports, "parseFileBlock", {
    enumerable: true, get: function () {
        return protocol_2.parseFileBlock;
    }
});
Object.defineProperty(exports, "parseMessage", {
    enumerable: true, get: function () {
        return protocol_2.parseMessage;
    }
});
