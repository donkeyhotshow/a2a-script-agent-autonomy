/**
 * @a2a/api-client - Async HTTP client (Promise/Polling)
 */
export declare class ApiError extends Error {
    status: number;
    data: Record<string, unknown>;

    constructor(message: string, status: number, data?: Record<string, unknown>);
}

export interface PollingOptions {
    interval?: number;
    maxAttempts?: number;
}

export interface PollCallbacks {
    onComplete?: (result: unknown) => void;
    onError?: (error: {
        message?: string;
    }) => void;
    onStatus?: (status: unknown) => void;
}

export declare class PromisePoller {
    private api;
    private interval;
    private maxAttempts;
    private activePollers;

    constructor(apiClient: AsyncApiClient, options?: PollingOptions);

    start(promiseId: string, callbacks: PollCallbacks): void;

    private _poll;

    stop(promiseId: string): void;

    stopAll(): void;

    getActiveCount(): number;
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

export declare class AsyncApiClient {
    serverUrl: string;
    token?: string;
    clientId?: string;
    timeout: number;
    poller: PromisePoller;

    constructor(config?: AsyncApiClientConfig);

    request(method: string, path: string, body?: Record<string, unknown> | null): Promise<Record<string, unknown>>;

    createSession(projectId: string, title?: string): Promise<unknown>;

    getSession(sessionId: string): Promise<unknown>;

    listSessions(projectId: string, options?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<unknown>;

    updateSession(sessionId: string, data: Record<string, unknown>): Promise<unknown>;

    deleteSession(sessionId: string): Promise<unknown>;

    getMessages(sessionId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<unknown>;

    addMessage(sessionId: string, message: Record<string, unknown>): Promise<unknown>;

    createRequest(data: Record<string, unknown>): Promise<{
        promiseId: string;
        requestId?: string;
        status?: string;
    }>;

    getRequestStatus(promiseId: string): Promise<unknown>;

    getRequestResult(promiseId: string): Promise<unknown>;

    cancelRequest(promiseId: string): Promise<unknown>;

    getQueueStats(): Promise<unknown>;

    startSession(opts: {
        projectPath?: string;
        task?: string;
        packageJson?: string | null;
        composerJson?: string | null;
    }, callbacks?: PollCallbacks): Promise<unknown>;

    sendCodeBlocks(opts: {
        projectPath?: string;
        graph?: unknown;
        codeBlocks: Array<{
            path: string;
            content: string;
        }>;
    }, callbacks?: PollCallbacks): Promise<unknown>;

    runSessionWithRAG(opts: {
        projectPath: string;
        task?: string;
        rag?: {
            searcher: {
                search: (q: string, opts: {
                    limit: number;
                }) => Promise<Array<{
                    chunk: {
                        filePath: string;
                    };
                }>>;
            };
        };
        maxIterations?: number;
    }, callbacks?: {
        onIteration?: (n: number, result: unknown) => void;
        onStatus?: PollCallbacks['onStatus'];
        onComplete?: (result: unknown) => void;
    }): Promise<unknown>;

    sendMessage(sessionId: string, message: string, context?: Record<string, unknown>, callbacks?: PollCallbacks): Promise<unknown>;

    invoke(opts: {
        context?: Record<string, unknown>;
        markdown?: string;
        files?: unknown[];
        sessionId?: string;
    }): Promise<unknown>;

    waitForResult(promiseId: string, callbacks?: PollCallbacks): Promise<unknown>;

    executeAction(opts: {
        task: string | string[];
        sessionId: string;
        scriptRunner?: ScriptRunnerLike;
        projectPath?: string;
    }, callbacks?: {
        onStep?: (step: {
            id?: string;
            code?: string;
        }, result: unknown) => void;
        onStatus?: PollCallbacks['onStatus'];
        onComplete?: (result: unknown) => void;
        onError?: (err: {
            step?: string;
            error?: string;
        }) => void;
    }): Promise<unknown>;

    continueAction(sessionId: string, stepId: string, stepResult: unknown, callbacks?: PollCallbacks): Promise<unknown>;
}
