/**
 * Session management utilities for API Client
 */

import type {
    Session,
    SessionMetadata,
    SessionFilter,
    SessionUpdate,
    CreateSessionOptions,
    ProgressInfo,
    ProgressCallbacks
} from './types/session.js';
import {unwrapEnvelope} from './client-api-envelope.js';

/**
 * Lightweight EventEmitter implementation for browser/Node compatibility
 */
class EventEmitter {
    private events: Map<string, Array<(...args: unknown[]) => void>> = new Map();

    on(event: string, listener: (...args: unknown[]) => void): this {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(listener);
        return this;
    }

    off(event: string, listener: (...args: unknown[]) => void): this {
        const listeners = this.events.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        return this;
    }

    emit(event: string, ...args: unknown[]): boolean {
        const listeners = this.events.get(event);
        if (!listeners || listeners.length === 0) {
            return false;
        }
        listeners.forEach(listener => listener(...args));
        return true;
    }

    once(event: string, listener: (...args: unknown[]) => void): this {
        const onceListener = (...args: unknown[]) => {
            this.off(event, onceListener);
            listener(...args);
        };
        return this.on(event, onceListener);
    }
}

export interface SessionManagerConfig {
    serverUrl?: string;
    token?: string;
    clientId?: string;
    timeout?: number;
    polling?: PollingOptions;
    retry?: RetryConfig;
    transformer?: RequestTransformer;
}

export interface PollingOptions {
    interval?: number;
    maxAttempts?: number;
}

export interface RetryConfig {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryOn?: (error: ApiError) => boolean;
}

export interface RequestTransformer {
    transformRequest?: (data: Record<string, unknown>) => Record<string, unknown>;
    transformResponse?: (data: Record<string, unknown>) => Record<string, unknown>;
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

/**
 * Session management client with enhanced features
 */
export class SessionManager extends EventEmitter {
    private serverUrl: string;
    private token?: string;
    private clientId?: string;
    private timeout: number;
    private retryConfig: Required<RetryConfig>;
    sessions: SessionMetadata[] = [];
    currentSessionId?: string;
    currentProjectId?: string;

    constructor(config: SessionManagerConfig = {}) {
        super();
        this.serverUrl = (config.serverUrl ?? 'http://localhost:3000/api/v1').replace(/\/?$/, '');
        this.token = config.token;
        this.clientId = config.clientId;
        this.timeout = config.timeout ?? 30000;
        
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

    /**
     * Make HTTP request with retry logic
     */
    private async request(
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
        
        let lastError: ApiError | null = null;
        
        // Retry loop
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const response = await fetch(url, options as RequestInit);
                let data: Record<string, unknown>;
                try {
                    data = (await response.json()) as Record<string, unknown>;
                } catch (parseErr) {
                    console.error('[SessionManager] JSON parse error:', parseErr, 'Response:', response.status, response.statusText);
                    data = {};
                }
                
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

    // ==================== Session Management ====================

    /**
     * Create a new session with options
     */
    async createSessionWithOptions(options: CreateSessionOptions): Promise<Session> {
        const res = await this.request('POST', '/sessions', {
            projectId: options.projectId,
            title: options.title ?? 'New Session',
            task: options.task,
        });
        const session = unwrapEnvelope<Session>(res) as Session;
        this.emit('sessionCreated', session);
        return session;
    }

    /**
     * Get session with full details
     */
    async getSessionDetails(sessionId: string): Promise<Session> {
        const res = await this.request('GET', `/sessions/${sessionId}`);
        return unwrapEnvelope<Session>(res) as Session;
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
        return unwrapEnvelope<Session>(res) as Session;
    }

    /**
     * Delete multiple sessions
     */
    async deleteMultipleSessions(sessionIds: string[]): Promise<{ deleted: string[]; failed: string[] }> {
        const deleted: string[] = [];
        const failed: string[] = [];
        
        for (const sessionId of sessionIds) {
            try {
                await this.request('DELETE', `/sessions/${sessionId}`);
                deleted.push(sessionId);
            } catch (err) {
                console.error('[SessionManager] Failed to delete session:', sessionId, err);
                failed.push(sessionId);
            }
        }
        
        return { deleted, failed };
    }

    /**
     * Create a new session
     */
    async createSession(projectId: string, title?: string): Promise<unknown> {
        const res = await this.request('POST', '/sessions', {projectId, title});
        const session = unwrapEnvelope(res);
        this.emit('sessionCreated', session);
        return session;
    }

    /**
     * Get session details
     */
    async getSession(sessionId: string): Promise<unknown> {
        const res = await this.request('GET', `/sessions/${sessionId}`);
        return unwrapEnvelope(res);
    }

    /**
     * List sessions
     */
    async listSessions(
        projectId: string,
        options: { status?: string; limit?: number; offset?: number } = {}
    ): Promise<unknown> {
        const params = new URLSearchParams({projectId});
        if (options.status) params.append('status', options.status);
        if (options.limit != null) params.append('limit', String(options.limit));
        if (options.offset != null) params.append('offset', String(options.offset));
        const res = await this.request('GET', `/sessions?${params}`);
        return unwrapEnvelope(res);
    }

    /**
     * Update session
     */
    async updateSession(sessionId: string, data: Record<string, unknown>): Promise<unknown> {
        const res = await this.request('PATCH', `/sessions/${sessionId}`, data);
        return unwrapEnvelope(res);
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId: string): Promise<unknown> {
        const res = await this.request('DELETE', `/sessions/${sessionId}`);
        this.emit('sessionDeleted', sessionId);
        return unwrapEnvelope(res);
    }

    /**
     * Load sessions for a project and emit sessionsLoaded event
     */
    async loadSessions(projectId: string): Promise<SessionMetadata[]> {
        this.currentProjectId = projectId;
        const sessions = await this.listSessionsWithFilter({projectId}) as SessionMetadata[];
        this.sessions = sessions;
        this.emit('sessionsLoaded', sessions);
        return sessions;
    }

    /**
     * Set current session and emit sessionChanged event
     */
    setCurrentSession(sessionId: string): void {
        this.currentSessionId = sessionId;
        this.emit('sessionChanged', sessionId);
    }

    /**
     * Load conversation messages and emit conversationLoaded event
     */
    async loadConversation(sessionId: string): Promise<unknown> {
        const messages = await this.getMessages(sessionId);
        this.emit('conversationLoaded', {sessionId, messages});
        return messages;
    }

    // ==================== Message Management ====================

    /**
     * Get messages from session
     */
    async getMessages(
        sessionId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<unknown> {
        const params = new URLSearchParams();
        if (options.limit != null) params.append('limit', String(options.limit));
        if (options.offset != null) params.append('offset', String(options.offset));
        const query = params.toString() ? `?${params}` : '';
        const res = await this.request('GET', `/sessions/${sessionId}/messages${query}`);
        return unwrapEnvelope(res);
    }

    /**
     * Add message to session
     */
    async addMessage(sessionId: string, message: Record<string, unknown>): Promise<unknown> {
        const res = await this.request('POST', `/sessions/${sessionId}/messages`, message);
        return unwrapEnvelope(res);
    }

    // ==================== Request Management ====================

    /**
     * Create request
     */
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

    /**
     * Get request status
     */
    async getRequestStatus(promiseId: string): Promise<unknown> {
        // FIX: Use correct endpoint path with /api/v1 prefix
        const res = await this.request('GET', `/api/v1/requests/${promiseId}/status`);
        return (res as { data?: unknown }).data ?? res;
    }

    /**
     * Get request result
     */
    async getRequestResult(promiseId: string): Promise<unknown> {
        // FIX: Use correct endpoint path with /api/v1 prefix
        const res = await this.request('GET', `/api/v1/requests/${promiseId}/result`);
        return (res as { data?: unknown }).data ?? res;
    }

    /**
     * Cancel request
     */
    async cancelRequest(promiseId: string): Promise<unknown> {
        // FIX: Use correct endpoint path with /api/v1 prefix
        const res = await this.request('DELETE', `/api/v1/requests/${promiseId}`);
        return (res as { data?: unknown }).data ?? res;
    }

    /**
     * Get queue stats
     */
    async getQueueStats(): Promise<unknown> {
        // FIX: Use correct endpoint path with /api/v1 prefix
        const res = await this.request('GET', '/api/v1/requests/queue/stats');
        return (res as { data?: unknown }).data ?? res;
    }

    // ==================== Progress Tracking ====================

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
     * Wait for result with progress tracking
     */
    async waitForResultWithProgress(
        promiseId: string,
        callbacks: ProgressCallbacks
    ): Promise<unknown> {
        // This would need to be implemented with a polling mechanism
        // For now, return a simple promise
        return new Promise((resolve, reject) => {
            // Implementation would go here
            resolve(null);
        });
    }
}