/**
 * Concurrency-limited promise pool (e.g. for Ollama promise polling per plans/ollama-proxy-integration.md).
 */

export interface PromisePoolOptions {
    concurrency: number;
}

export class PromisePool {
    private concurrency: number;
    private running = 0;
    private queue: Array<() => void> = [];

    constructor(options: PromisePoolOptions) {
        this.concurrency = Math.max(1, options.concurrency);
    }

    async run<T>(fn: () => Promise<T>): Promise<T> {
        await this.acquire();
        try {
            return await fn();
        } finally {
            this.release();
        }
    }

    private acquire(): Promise<void> {
        if (this.running < this.concurrency) {
            this.running += 1;
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.queue.push(resolve);
        });
    }

    private release(): void {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
        } else {
            this.running -= 1;
        }
    }
}
