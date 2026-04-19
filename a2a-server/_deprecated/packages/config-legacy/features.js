/**
 * Feature Flags Management
 *
 * Provides utilities for checking feature enablement and conditional service loading.
 * Core systems cannot be disabled - they are always enabled.
 */
/**
 * Feature flag checker with caching
 */
export class FeatureManager {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Check if a feature is enabled
     */
    isEnabled(featurePath) {
        const path = featurePath.split(".");
        let current = this.config;
        for (const segment of path) {
            if (current && typeof current === "object" && segment in current) {
                current = current[segment];
            }
            else {
                return false;
            }
        }
        return Boolean(current);
    }
    /**
     * Get feature configuration object
     */
    getFeatureConfig(featurePath) {
        const path = featurePath.split(".");
        let current = this.config;
        for (const segment of path) {
            if (current && typeof current === "object" && segment in current) {
                current = current[segment];
            }
            else {
                return null;
            }
        }
        return current;
    }
    /**
     * Check if AI Hub features are enabled
     */
    get aiHub() {
        return {
            enabled: this.isEnabled("aiHub.enabled"),
            polling: this.isEnabled("aiHub.polling"),
            openai: this.isEnabled("aiHub.openai"),
        };
    }
    /**
     * Check if P2P features are enabled
     */
    get p2p() {
        return {
            enabled: this.isEnabled("p2p.enabled"),
            crdt: this.isEnabled("p2p.crdt"),
            relay: this.isEnabled("p2p.relay"),
        };
    }
    /**
     * Check if daemon features are enabled
     */
    get daemon() {
        return {
            enabled: this.isEnabled("daemon.enabled"),
            llmPolling: this.isEnabled("daemon.llmPolling"),
            requestProcessing: this.isEnabled("daemon.requestProcessing"),
        };
    }
    /**
     * Check if action features are enabled
     */
    get actions() {
        return {
            enabled: this.isEnabled("actions.enabled"),
            fileOperations: this.isEnabled("actions.fileOperations"),
            gitOperations: this.isEnabled("actions.gitOperations"),
            scriptExecution: this.isEnabled("actions.scriptExecution"),
            mcpCalls: this.isEnabled("actions.mcpCalls"),
        };
    }
    /**
     * Check if transform features are enabled
     */
    get transform() {
        return {
            enabled: this.isEnabled("transform.enabled"),
            grayRoom: this.isEnabled("transform.grayRoom"),
            pipeline: this.isEnabled("transform.pipeline"),
            interruptHandlers: this.isEnabled("transform.interruptHandlers"),
        };
    }
    /**
     * Check if AI features are enabled
     */
    get ai() {
        return {
            enabled: this.isEnabled("ai.enabled"),
            embeddings: this.isEnabled("ai.embeddings"),
            rag: this.isEnabled("ai.rag"),
            agentSwing: this.isEnabled("ai.agentSwing"),
            episodicMemory: this.isEnabled("ai.episodicMemory"),
        };
    }
    /**
     * Check if monitoring features are enabled
     */
    get monitoring() {
        return {
            enabled: this.isEnabled("monitoring.enabled"),
            metrics: this.isEnabled("monitoring.metrics"),
            logging: this.isEnabled("monitoring.logging"),
            healthChecks: this.isEnabled("monitoring.healthChecks"),
            notifications: this.isEnabled("monitoring.notifications"),
        };
    }
    /**
     * Check if security features are enabled
     */
    get security() {
        return {
            enabled: this.isEnabled("security.enabled"),
            auth: this.isEnabled("security.auth"),
            rateLimiting: this.isEnabled("security.rateLimiting"),
            validation: this.isEnabled("security.validation"),
        };
    }
    /**
     * Check if storage features are enabled
     */
    get storage() {
        return {
            enabled: this.isEnabled("storage.enabled"),
            database: this.isEnabled("storage.database"),
            redis: this.isEnabled("storage.redis"),
            fileCache: this.isEnabled("storage.fileCache"),
            gitRepos: this.isEnabled("storage.gitRepos"),
        };
    }
    /**
     * Check if API features are enabled
     */
    get api() {
        return {
            enabled: this.isEnabled("api.enabled"),
            rest: this.isEnabled("api.rest"),
            websocket: this.isEnabled("api.websocket"),
            graphql: this.isEnabled("api.graphql"),
        };
    }
}
/**
 * Create a feature manager instance
 */
export function createFeatureManager(config) {
    return new FeatureManager(config);
}
/**
 * Utility function for conditional service loading
 */
export async function loadServiceIfEnabled(featurePath, featureManager, serviceLoader, fallback) {
    if (featureManager.isEnabled(featurePath)) {
        return await serviceLoader();
    }
    return fallback;
}
/**
 * Utility function for conditional middleware loading
 */
export function loadMiddlewareIfEnabled(featurePath, featureManager, middlewareFactory) {
    if (featureManager.isEnabled(featurePath)) {
        return middlewareFactory();
    }
    return null;
}
//# sourceMappingURL=features.js.map