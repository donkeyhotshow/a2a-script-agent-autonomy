/**
 * Load Balancer Implementation
 * 
 * Реализация балансировщика нагрузки для ProxyClient
 */

import type {LoadBalancerConfig} from './proxy-client.types.js';

export class LoadBalancer {
    private currentIndex = 0;
    private connectionCounts = new Map<string, number>();
    private healthStatus = new Map<string, 'healthy' | 'unhealthy'>();
    private readonly config: Required<LoadBalancerConfig>;
    private healthCheckInterval?: NodeJS.Timeout;

    constructor(
        private urls: string[],
        config: Partial<LoadBalancerConfig> = {}
    ) {
        this.config = {
            strategy: config.strategy ?? 'round_robin',
            weights: config.weights ?? {},
            healthCheckIntervalMs: config.healthCheckIntervalMs ?? 30000,
        };

        // Initialize health status
        for (const url of urls) {
            this.healthStatus.set(url, 'healthy');
            this.connectionCounts.set(url, 0);
        }

        // Start health checks
        this.startHealthChecks();
    }

    getNextUrl(context?: {priority?: string}): string {
        const healthyUrls = this.urls.filter(url => this.healthStatus.get(url) === 'healthy');
        const urlsToUse = healthyUrls.length > 0 ? healthyUrls : this.urls;

        switch (this.config.strategy) {
            case 'round_robin':
                return this.roundRobin(urlsToUse);
            case 'least_connections':
                return this.leastConnections(urlsToUse);
            case 'weighted':
                return this.weighted(urlsToUse);
            case 'priority':
                return this.priorityBased(urlsToUse, context);
            default:
                return this.roundRobin(urlsToUse);
        }
    }

    startConnection(url: string): void {
        const count = this.connectionCounts.get(url) ?? 0;
        this.connectionCounts.set(url, count + 1);
    }

    endConnection(url: string): void {
        const count = this.connectionCounts.get(url) ?? 0;
        this.connectionCounts.set(url, Math.max(0, count - 1));
    }

    private roundRobin(urls: string[]): string {
        const selected = urls[this.currentIndex % urls.length];
        this.currentIndex = (this.currentIndex + 1) % urls.length;
        return selected;
    }

    private leastConnections(urls: string[]): string {
        return urls.reduce((min, url) => {
            const count = this.connectionCounts.get(url) ?? 0;
            const minCount = this.connectionCounts.get(min) ?? 0;
            return count < minCount ? url : min;
        }, urls[0]);
    }

    private weighted(urls: string[]): string {
        const weights = urls.map(url => this.config.weights[url] ?? 1);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < urls.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return urls[i];
            }
        }

        return urls[urls.length - 1];
    }

    private priorityBased(urls: string[], context?: {priority?: string}): string {
        // For high priority, use least connections
        if (context?.priority === 'high') {
            return this.leastConnections(urls);
        }
        return this.roundRobin(urls);
    }

    private startHealthChecks(): void {
        this.healthCheckInterval = setInterval(async () => {
            for (const url of this.urls) {
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 5000);

                    const response = await fetch(`${url}/health`, {
                        method: 'GET',
                        signal: controller.signal,
                    });

                    clearTimeout(timeout);

                    if (response.ok) {
                        this.markHealthy(url);
                    } else {
                        this.markUnhealthy(url);
                    }
                } catch {
                    this.markUnhealthy(url);
                }
            }
        }, this.config.healthCheckIntervalMs);
    }

    /**
     * Mark a URL as healthy
     */
    markHealthy(url: string): void {
        if (this.healthStatus.get(url) !== 'healthy') {
            this.healthStatus.set(url, 'healthy');
        }
    }

    /**
     * Mark a URL as unhealthy
     */
    markUnhealthy(url: string): void {
        if (this.healthStatus.get(url) !== 'unhealthy') {
            this.healthStatus.set(url, 'unhealthy');
        }
    }

    getHealthStatus(): Record<string, 'healthy' | 'unhealthy'> {
        return Object.fromEntries(this.healthStatus);
    }
}
