export interface BuildFetchHeadersOptions {
    token?: string;
}

export interface NormalizedSession {
    id: string;
}

export declare function normalizeApiBase(raw?: string | null): string;

export declare function buildClientA2aUrl(apiBase: string | null | undefined, resourcePath?: string): string;

export declare function buildFetchHeaders(options?: BuildFetchHeadersOptions): Record<string, string>;

export declare function normalizeSessionResponse(raw: unknown): NormalizedSession | null;

export declare function normalizeSessionsList(raw: unknown, filterProjectId?: string | null): unknown[];

export declare const DEFAULT_POLL_INTERVAL: number;

export declare const DEFAULT_POLL_TIMEOUT: number;

export declare function isPromiseResolved(result: Record<string, unknown> | null | undefined): boolean;

export declare function isPromiseFailed(result: Record<string, unknown> | null | undefined): boolean;
