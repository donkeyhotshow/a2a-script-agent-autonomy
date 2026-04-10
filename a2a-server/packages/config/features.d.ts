/**
 * Feature Flags Management
 *
 * Provides utilities for checking feature enablement and conditional service loading.
 * Core systems cannot be disabled - they are always enabled.
 */
import type { FeaturesConfig } from "./schema.js";
/**
 * Feature flag checker with caching
 */
export declare class FeatureManager {
    private config;
    constructor(config: FeaturesConfig);
    /**
     * Check if a feature is enabled
     */
    isEnabled(featurePath: string): boolean;
    /**
     * Get feature configuration object
     */
    getFeatureConfig(featurePath: string): any;
    /**
     * Check if AI Hub features are enabled
     */
    get aiHub(): {
        enabled: boolean;
        polling: boolean;
        openai: boolean;
    };
    /**
     * Check if P2P features are enabled
     */
    get p2p(): {
        enabled: boolean;
        crdt: boolean;
        relay: boolean;
    };
    /**
     * Check if daemon features are enabled
     */
    get daemon(): {
        enabled: boolean;
        llmPolling: boolean;
        requestProcessing: boolean;
    };
    /**
     * Check if action features are enabled
     */
    get actions(): {
        enabled: boolean;
        fileOperations: boolean;
        gitOperations: boolean;
        scriptExecution: boolean;
        mcpCalls: boolean;
    };
    /**
     * Check if transform features are enabled
     */
    get transform(): {
        enabled: boolean;
        grayRoom: boolean;
        pipeline: boolean;
        interruptHandlers: boolean;
    };
    /**
     * Check if AI features are enabled
     */
    get ai(): {
        enabled: boolean;
        embeddings: boolean;
        rag: boolean;
        agentSwing: boolean;
        episodicMemory: boolean;
    };
    /**
     * Check if monitoring features are enabled
     */
    get monitoring(): {
        enabled: boolean;
        metrics: boolean;
        logging: boolean;
        healthChecks: boolean;
        notifications: boolean;
    };
    /**
     * Check if security features are enabled
     */
    get security(): {
        enabled: boolean;
        auth: boolean;
        rateLimiting: boolean;
        validation: boolean;
    };
    /**
     * Check if storage features are enabled
     */
    get storage(): {
        enabled: boolean;
        database: boolean;
        redis: boolean;
        fileCache: boolean;
        gitRepos: boolean;
    };
    /**
     * Check if API features are enabled
     */
    get api(): {
        enabled: boolean;
        rest: boolean;
        websocket: boolean;
        graphql: boolean;
    };
}
/**
 * Create a feature manager instance
 */
export declare function createFeatureManager(config: FeaturesConfig): FeatureManager;
/**
 * Utility function for conditional service loading
 */
export declare function loadServiceIfEnabled<T>(featurePath: string, featureManager: FeatureManager, serviceLoader: () => Promise<T>, fallback?: T): Promise<T | undefined>;
/**
 * Utility function for conditional middleware loading
 */
export declare function loadMiddlewareIfEnabled(featurePath: string, featureManager: FeatureManager, middlewareFactory: () => any): any | null;
//# sourceMappingURL=features.d.ts.map