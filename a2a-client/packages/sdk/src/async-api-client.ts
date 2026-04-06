/**
 * Polls A2A server request status/result (promiseId) — base URL should end with /api/v1.
 */

import fetch from 'node-fetch';

export interface AsyncApiClientConfig {
    serverUrl?: string;
    token?: string;
    clientId?: string;
    /** Per-request fetch timeout (ms). Omit or 0 — no cap (required for `promiseId` /result polling). */
    timeout?: number;
}

export class AsyncApiClient {
    private readonly serverUrl: string;
    private readonly token?: string;
    private readonly clientId?: string;
    private readonly timeout?: number;

    constructor(config: AsyncApiClientConfig = {}) {
        this.serverUrl = (config.serverUrl ?? 'http://localhost:3000/api/v1').replace(/\/?$/, '');
        this.token = config.token;
        this.clientId = config.clientId;
        this.timeout = config.timeout;
    }

    private async getJson(path: string): Promise<Record<string, unknown>> {
        const url = `${this.serverUrl}${path}`;
        const headers: Record<string, string> = {'Content-Type': 'application/json'};
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        if (this.clientId) headers['X-Client-ID'] = this.clientId;
        const init: RequestInit & { timeout?: number } = { method: 'GET', headers };
        if (this.timeout != null && Number.isFinite(this.timeout) && this.timeout > 0) {
            init.timeout = this.timeout;
        }
        const response = await fetch(url, init);
        const data = (await response.json()) as Record<string, unknown>;
        if (!response.ok) {
            const err = data?.error as { message?: string } | undefined;
            throw new Error(err?.message ?? `HTTP ${response.status}`);
        }
        return data;
    }

    async getRequestStatus(promiseId: string): Promise<Record<string, unknown>> {
        const res = await this.getJson(`/requests/${encodeURIComponent(promiseId)}/status`);
        return (res.data as Record<string, unknown>) ?? res;
    }

    async getRequestResult(promiseId: string): Promise<unknown> {
        const res = await this.getJson(`/requests/${encodeURIComponent(promiseId)}/result`);
        if (res.success === true && res.data !== undefined) return res.data;
        return res;
    }
}
