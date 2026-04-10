/**
 * Configuration Schema Index
 * Re-exports all schemas from modular config/schemas/ structure.
 */
export * from "./schemas/index.js";
import { z } from "zod";
export declare const databaseConfigSchema: z.ZodObject<{
    databaseUrl: z.ZodString | z.ZodDefault<z.ZodString>;
    redisUrl: z.ZodString | z.ZodDefault<z.ZodString>;
    postgresUser: z.ZodDefault<z.ZodString>;
    postgresPassword: z.ZodDefault<z.ZodString>;
    postgresDb: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    databaseUrl: string;
    redisUrl: string;
    postgresUser: string;
    postgresPassword: string;
    postgresDb: string;
}, {
    databaseUrl?: string | undefined;
    redisUrl?: string | undefined;
    postgresUser?: string | undefined;
    postgresPassword?: string | undefined;
    postgresDb?: string | undefined;
}>;
export declare const aiHubConfigSchema: z.ZodObject<{
    aiHubUrl: z.ZodString | z.ZodDefault<z.ZodString>;
    pollIntervalMs: z.ZodDefault<z.ZodNumber>;
    pollTimeoutMs: z.ZodDefault<z.ZodNumber>;
    openaiApiKey: z.ZodOptional<z.ZodString>;
    openaiModel: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    aiHubUrl: string;
    pollIntervalMs: number;
    pollTimeoutMs: number;
    openaiModel: string;
    openaiApiKey?: string | undefined;
}, {
    aiHubUrl?: string | undefined;
    pollIntervalMs?: number | undefined;
    pollTimeoutMs?: number | undefined;
    openaiApiKey?: string | undefined;
    openaiModel?: string | undefined;
}>;
export declare const securityConfigSchema: z.ZodObject<{
    jwtSecret: z.ZodString;
    jwtExpiresIn: z.ZodDefault<z.ZodString>;
    jwtRefreshExpiresIn: z.ZodDefault<z.ZodString>;
    encryptionKey: z.ZodOptional<z.ZodString>;
    skipAuth: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    apiKeyPrefix: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    jwtSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    skipAuth: boolean;
    apiKeyPrefix: string;
    encryptionKey?: string | undefined;
}, {
    jwtSecret: string;
    jwtExpiresIn?: string | undefined;
    jwtRefreshExpiresIn?: string | undefined;
    encryptionKey?: string | undefined;
    skipAuth?: string | boolean | undefined;
    apiKeyPrefix?: string | undefined;
}>;
export declare const serverConfigSchema: z.ZodObject<{
    nodeEnv: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    host: z.ZodDefault<z.ZodString>;
    defaultEmail: z.ZodDefault<z.ZodString>;
    defaultPassword: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nodeEnv: "development" | "production" | "test";
    host: string;
    defaultEmail: string;
    defaultPassword: string;
}, {
    nodeEnv?: "development" | "production" | "test" | undefined;
    host?: string | undefined;
    defaultEmail?: string | undefined;
    defaultPassword?: string | undefined;
}>;
export declare const storageConfigSchema: z.ZodObject<{
    gitSshKeyPath: z.ZodDefault<z.ZodString>;
    gitCloneBasePath: z.ZodDefault<z.ZodString>;
    fileCachePath: z.ZodDefault<z.ZodString>;
    maxFileSizeMb: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    gitSshKeyPath: string;
    gitCloneBasePath: string;
    fileCachePath: string;
    maxFileSizeMb: number;
}, {
    gitSshKeyPath?: string | undefined;
    gitCloneBasePath?: string | undefined;
    fileCachePath?: string | undefined;
    maxFileSizeMb?: number | undefined;
}>;
export declare const loggingConfigSchema: z.ZodObject<{
    logLevel: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
    logFormat: z.ZodDefault<z.ZodEnum<["json", "pretty", "text"]>>;
}, "strip", z.ZodTypeAny, {
    logLevel: "error" | "warn" | "info" | "debug";
    logFormat: "json" | "pretty" | "text";
}, {
    logLevel?: "error" | "warn" | "info" | "debug" | undefined;
    logFormat?: "json" | "pretty" | "text" | undefined;
}>;
export declare const rateLimitConfigSchema: z.ZodObject<{
    windowMs: z.ZodDefault<z.ZodNumber>;
    maxRequests: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    windowMs: number;
    maxRequests: number;
}, {
    windowMs?: number | undefined;
    maxRequests?: number | undefined;
}>;
export declare const queueConfigSchema: z.ZodObject<{
    concurrency: z.ZodDefault<z.ZodNumber>;
    indexingConcurrency: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    concurrency: number;
    indexingConcurrency: number;
}, {
    concurrency?: number | undefined;
    indexingConcurrency?: number | undefined;
}>;
export declare const sessionConfigSchema: z.ZodObject<{
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    maxInactiveMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeoutMs: number;
    maxInactiveMs: number;
}, {
    timeoutMs?: number | undefined;
    maxInactiveMs?: number | undefined;
}>;
export declare const requestProcessorConfigSchema: z.ZodObject<{
    intervalMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    intervalMs: number;
}, {
    intervalMs?: number | undefined;
}>;
export declare const featuresConfigSchema: z.ZodDefault<z.ZodObject<{
    core: z.ZodDefault<z.ZodLiteral<true>>;
    aiHub: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        polling: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        openai: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    }, "strip", z.ZodTypeAny, {
        openai: boolean;
        enabled: boolean;
        polling: boolean;
    }, {
        openai?: string | boolean | undefined;
        enabled?: string | boolean | undefined;
        polling?: string | boolean | undefined;
    }>>;
    p2p: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        crdt: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        relay: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        crdt: boolean;
        relay: boolean;
    }, {
        enabled?: string | boolean | undefined;
        crdt?: string | boolean | undefined;
        relay?: string | boolean | undefined;
    }>>;
    daemon: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        requestProcessing: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        requestProcessing: boolean;
    }, {
        enabled?: string | boolean | undefined;
        requestProcessing?: string | boolean | undefined;
    }>>;
    actions: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        fileOperations: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        gitOperations: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        scriptExecution: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        mcpCalls: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        fileOperations: boolean;
        gitOperations: boolean;
        scriptExecution: boolean;
        mcpCalls: boolean;
    }, {
        enabled?: string | boolean | undefined;
        fileOperations?: string | boolean | undefined;
        gitOperations?: string | boolean | undefined;
        scriptExecution?: string | boolean | undefined;
        mcpCalls?: string | boolean | undefined;
    }>>;
    transform: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        grayRoom: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        pipeline: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        interruptHandlers: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        grayRoom: boolean;
        pipeline: boolean;
        interruptHandlers: boolean;
    }, {
        enabled?: string | boolean | undefined;
        grayRoom?: string | boolean | undefined;
        pipeline?: string | boolean | undefined;
        interruptHandlers?: string | boolean | undefined;
    }>>;
    ai: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        rag: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        agentSwing: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        episodicMemory: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        rag: boolean;
        agentSwing: boolean;
        episodicMemory: boolean;
    }, {
        enabled?: string | boolean | undefined;
        rag?: string | boolean | undefined;
        agentSwing?: string | boolean | undefined;
        episodicMemory?: string | boolean | undefined;
    }>>;
    monitoring: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        metrics: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        logging: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        healthChecks: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        notifications: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    }, "strip", z.ZodTypeAny, {
        logging: boolean;
        enabled: boolean;
        metrics: boolean;
        healthChecks: boolean;
        notifications: boolean;
    }, {
        logging?: string | boolean | undefined;
        enabled?: string | boolean | undefined;
        metrics?: string | boolean | undefined;
        healthChecks?: string | boolean | undefined;
        notifications?: string | boolean | undefined;
    }>>;
    security: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        auth: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        rateLimiting: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        validation: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    }, "strip", z.ZodTypeAny, {
        validation: boolean;
        enabled: boolean;
        auth: boolean;
        rateLimiting: boolean;
    }, {
        validation?: string | boolean | undefined;
        enabled?: string | boolean | undefined;
        auth?: string | boolean | undefined;
        rateLimiting?: string | boolean | undefined;
    }>>;
    storage: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        database: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        redis: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        fileCache: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        gitRepos: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    }, "strip", z.ZodTypeAny, {
        database: boolean;
        enabled: boolean;
        redis: boolean;
        fileCache: boolean;
        gitRepos: boolean;
    }, {
        database?: string | boolean | undefined;
        enabled?: string | boolean | undefined;
        redis?: string | boolean | undefined;
        fileCache?: string | boolean | undefined;
        gitRepos?: string | boolean | undefined;
    }>>;
    api: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        rest: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        websocket: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        graphql: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        rest: boolean;
        websocket: boolean;
        graphql: boolean;
    }, {
        enabled?: string | boolean | undefined;
        rest?: string | boolean | undefined;
        websocket?: string | boolean | undefined;
        graphql?: string | boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    ai: {
        enabled: boolean;
        rag: boolean;
        agentSwing: boolean;
        episodicMemory: boolean;
    };
    security: {
        validation: boolean;
        enabled: boolean;
        auth: boolean;
        rateLimiting: boolean;
    };
    storage: {
        database: boolean;
        enabled: boolean;
        redis: boolean;
        fileCache: boolean;
        gitRepos: boolean;
    };
    core: true;
    aiHub: {
        openai: boolean;
        enabled: boolean;
        polling: boolean;
    };
    p2p: {
        enabled: boolean;
        crdt: boolean;
        relay: boolean;
    };
    daemon: {
        enabled: boolean;
        requestProcessing: boolean;
    };
    actions: {
        enabled: boolean;
        fileOperations: boolean;
        gitOperations: boolean;
        scriptExecution: boolean;
        mcpCalls: boolean;
    };
    transform: {
        enabled: boolean;
        grayRoom: boolean;
        pipeline: boolean;
        interruptHandlers: boolean;
    };
    monitoring: {
        logging: boolean;
        enabled: boolean;
        metrics: boolean;
        healthChecks: boolean;
        notifications: boolean;
    };
    api: {
        enabled: boolean;
        rest: boolean;
        websocket: boolean;
        graphql: boolean;
    };
}, {
    ai?: {
        enabled?: string | boolean | undefined;
        rag?: string | boolean | undefined;
        agentSwing?: string | boolean | undefined;
        episodicMemory?: string | boolean | undefined;
    } | undefined;
    security?: {
        validation?: string | boolean | undefined;
        enabled?: string | boolean | undefined;
        auth?: string | boolean | undefined;
        rateLimiting?: string | boolean | undefined;
    } | undefined;
    storage?: {
        database?: string | boolean | undefined;
        enabled?: string | boolean | undefined;
        redis?: string | boolean | undefined;
        fileCache?: string | boolean | undefined;
        gitRepos?: string | boolean | undefined;
    } | undefined;
    core?: true | undefined;
    aiHub?: {
        openai?: string | boolean | undefined;
        enabled?: string | boolean | undefined;
        polling?: string | boolean | undefined;
    } | undefined;
    p2p?: {
        enabled?: string | boolean | undefined;
        crdt?: string | boolean | undefined;
        relay?: string | boolean | undefined;
    } | undefined;
    daemon?: {
        enabled?: string | boolean | undefined;
        requestProcessing?: string | boolean | undefined;
    } | undefined;
    actions?: {
        enabled?: string | boolean | undefined;
        fileOperations?: string | boolean | undefined;
        gitOperations?: string | boolean | undefined;
        scriptExecution?: string | boolean | undefined;
        mcpCalls?: string | boolean | undefined;
    } | undefined;
    transform?: {
        enabled?: string | boolean | undefined;
        grayRoom?: string | boolean | undefined;
        pipeline?: string | boolean | undefined;
        interruptHandlers?: string | boolean | undefined;
    } | undefined;
    monitoring?: {
        logging?: string | boolean | undefined;
        enabled?: string | boolean | undefined;
        metrics?: string | boolean | undefined;
        healthChecks?: string | boolean | undefined;
        notifications?: string | boolean | undefined;
    } | undefined;
    api?: {
        enabled?: string | boolean | undefined;
        rest?: string | boolean | undefined;
        websocket?: string | boolean | undefined;
        graphql?: string | boolean | undefined;
    } | undefined;
}>>;
export declare const appConfigSchema: z.ZodObject<{
    database: z.ZodObject<{
        databaseUrl: z.ZodString | z.ZodDefault<z.ZodString>;
        redisUrl: z.ZodString | z.ZodDefault<z.ZodString>;
        postgresUser: z.ZodDefault<z.ZodString>;
        postgresPassword: z.ZodDefault<z.ZodString>;
        postgresDb: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        databaseUrl: string;
        redisUrl: string;
        postgresUser: string;
        postgresPassword: string;
        postgresDb: string;
    }, {
        databaseUrl?: string | undefined;
        redisUrl?: string | undefined;
        postgresUser?: string | undefined;
        postgresPassword?: string | undefined;
        postgresDb?: string | undefined;
    }>;
    aiHub: z.ZodObject<{
        aiHubUrl: z.ZodString | z.ZodDefault<z.ZodString>;
        pollIntervalMs: z.ZodDefault<z.ZodNumber>;
        pollTimeoutMs: z.ZodDefault<z.ZodNumber>;
        openaiApiKey: z.ZodOptional<z.ZodString>;
        openaiModel: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        aiHubUrl: string;
        pollIntervalMs: number;
        pollTimeoutMs: number;
        openaiModel: string;
        openaiApiKey?: string | undefined;
    }, {
        aiHubUrl?: string | undefined;
        pollIntervalMs?: number | undefined;
        pollTimeoutMs?: number | undefined;
        openaiApiKey?: string | undefined;
        openaiModel?: string | undefined;
    }>;
    security: z.ZodObject<{
        jwtSecret: z.ZodString;
        jwtExpiresIn: z.ZodDefault<z.ZodString>;
        jwtRefreshExpiresIn: z.ZodDefault<z.ZodString>;
        encryptionKey: z.ZodOptional<z.ZodString>;
        skipAuth: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        apiKeyPrefix: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        jwtSecret: string;
        jwtExpiresIn: string;
        jwtRefreshExpiresIn: string;
        skipAuth: boolean;
        apiKeyPrefix: string;
        encryptionKey?: string | undefined;
    }, {
        jwtSecret: string;
        jwtExpiresIn?: string | undefined;
        jwtRefreshExpiresIn?: string | undefined;
        encryptionKey?: string | undefined;
        skipAuth?: string | boolean | undefined;
        apiKeyPrefix?: string | undefined;
    }>;
    server: z.ZodObject<{
        nodeEnv: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
        host: z.ZodDefault<z.ZodString>;
        defaultEmail: z.ZodDefault<z.ZodString>;
        defaultPassword: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        nodeEnv: "development" | "production" | "test";
        host: string;
        defaultEmail: string;
        defaultPassword: string;
    }, {
        nodeEnv?: "development" | "production" | "test" | undefined;
        host?: string | undefined;
        defaultEmail?: string | undefined;
        defaultPassword?: string | undefined;
    }>;
    storage: z.ZodObject<{
        gitSshKeyPath: z.ZodDefault<z.ZodString>;
        gitCloneBasePath: z.ZodDefault<z.ZodString>;
        fileCachePath: z.ZodDefault<z.ZodString>;
        maxFileSizeMb: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        gitSshKeyPath: string;
        gitCloneBasePath: string;
        fileCachePath: string;
        maxFileSizeMb: number;
    }, {
        gitSshKeyPath?: string | undefined;
        gitCloneBasePath?: string | undefined;
        fileCachePath?: string | undefined;
        maxFileSizeMb?: number | undefined;
    }>;
    logging: z.ZodObject<{
        logLevel: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
        logFormat: z.ZodDefault<z.ZodEnum<["json", "pretty", "text"]>>;
    }, "strip", z.ZodTypeAny, {
        logLevel: "error" | "warn" | "info" | "debug";
        logFormat: "json" | "pretty" | "text";
    }, {
        logLevel?: "error" | "warn" | "info" | "debug" | undefined;
        logFormat?: "json" | "pretty" | "text" | undefined;
    }>;
    rateLimit: z.ZodObject<{
        windowMs: z.ZodDefault<z.ZodNumber>;
        maxRequests: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        windowMs: number;
        maxRequests: number;
    }, {
        windowMs?: number | undefined;
        maxRequests?: number | undefined;
    }>;
    queue: z.ZodObject<{
        concurrency: z.ZodDefault<z.ZodNumber>;
        indexingConcurrency: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        concurrency: number;
        indexingConcurrency: number;
    }, {
        concurrency?: number | undefined;
        indexingConcurrency?: number | undefined;
    }>;
    session: z.ZodObject<{
        timeoutMs: z.ZodDefault<z.ZodNumber>;
        maxInactiveMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        timeoutMs: number;
        maxInactiveMs: number;
    }, {
        timeoutMs?: number | undefined;
        maxInactiveMs?: number | undefined;
    }>;
    requestProcessor: z.ZodObject<{
        intervalMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        intervalMs: number;
    }, {
        intervalMs?: number | undefined;
    }>;
    features: z.ZodDefault<z.ZodObject<{
        core: z.ZodDefault<z.ZodLiteral<true>>;
        aiHub: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            polling: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            openai: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        }, "strip", z.ZodTypeAny, {
            openai: boolean;
            enabled: boolean;
            polling: boolean;
        }, {
            openai?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            polling?: string | boolean | undefined;
        }>>;
        p2p: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            crdt: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            relay: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            crdt: boolean;
            relay: boolean;
        }, {
            enabled?: string | boolean | undefined;
            crdt?: string | boolean | undefined;
            relay?: string | boolean | undefined;
        }>>;
        daemon: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            requestProcessing: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            requestProcessing: boolean;
        }, {
            enabled?: string | boolean | undefined;
            requestProcessing?: string | boolean | undefined;
        }>>;
        actions: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            fileOperations: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            gitOperations: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            scriptExecution: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            mcpCalls: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            fileOperations: boolean;
            gitOperations: boolean;
            scriptExecution: boolean;
            mcpCalls: boolean;
        }, {
            enabled?: string | boolean | undefined;
            fileOperations?: string | boolean | undefined;
            gitOperations?: string | boolean | undefined;
            scriptExecution?: string | boolean | undefined;
            mcpCalls?: string | boolean | undefined;
        }>>;
        transform: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            grayRoom: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            pipeline: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            interruptHandlers: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            grayRoom: boolean;
            pipeline: boolean;
            interruptHandlers: boolean;
        }, {
            enabled?: string | boolean | undefined;
            grayRoom?: string | boolean | undefined;
            pipeline?: string | boolean | undefined;
            interruptHandlers?: string | boolean | undefined;
        }>>;
        ai: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            rag: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            agentSwing: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            episodicMemory: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            rag: boolean;
            agentSwing: boolean;
            episodicMemory: boolean;
        }, {
            enabled?: string | boolean | undefined;
            rag?: string | boolean | undefined;
            agentSwing?: string | boolean | undefined;
            episodicMemory?: string | boolean | undefined;
        }>>;
        monitoring: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            metrics: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            logging: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            healthChecks: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            notifications: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        }, "strip", z.ZodTypeAny, {
            logging: boolean;
            enabled: boolean;
            metrics: boolean;
            healthChecks: boolean;
            notifications: boolean;
        }, {
            logging?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            metrics?: string | boolean | undefined;
            healthChecks?: string | boolean | undefined;
            notifications?: string | boolean | undefined;
        }>>;
        security: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            auth: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            rateLimiting: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            validation: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        }, "strip", z.ZodTypeAny, {
            validation: boolean;
            enabled: boolean;
            auth: boolean;
            rateLimiting: boolean;
        }, {
            validation?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            auth?: string | boolean | undefined;
            rateLimiting?: string | boolean | undefined;
        }>>;
        storage: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            database: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            redis: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            fileCache: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            gitRepos: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        }, "strip", z.ZodTypeAny, {
            database: boolean;
            enabled: boolean;
            redis: boolean;
            fileCache: boolean;
            gitRepos: boolean;
        }, {
            database?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            redis?: string | boolean | undefined;
            fileCache?: string | boolean | undefined;
            gitRepos?: string | boolean | undefined;
        }>>;
        api: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            rest: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            websocket: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
            graphql: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            rest: boolean;
            websocket: boolean;
            graphql: boolean;
        }, {
            enabled?: string | boolean | undefined;
            rest?: string | boolean | undefined;
            websocket?: string | boolean | undefined;
            graphql?: string | boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        ai: {
            enabled: boolean;
            rag: boolean;
            agentSwing: boolean;
            episodicMemory: boolean;
        };
        security: {
            validation: boolean;
            enabled: boolean;
            auth: boolean;
            rateLimiting: boolean;
        };
        storage: {
            database: boolean;
            enabled: boolean;
            redis: boolean;
            fileCache: boolean;
            gitRepos: boolean;
        };
        core: true;
        aiHub: {
            openai: boolean;
            enabled: boolean;
            polling: boolean;
        };
        p2p: {
            enabled: boolean;
            crdt: boolean;
            relay: boolean;
        };
        daemon: {
            enabled: boolean;
            requestProcessing: boolean;
        };
        actions: {
            enabled: boolean;
            fileOperations: boolean;
            gitOperations: boolean;
            scriptExecution: boolean;
            mcpCalls: boolean;
        };
        transform: {
            enabled: boolean;
            grayRoom: boolean;
            pipeline: boolean;
            interruptHandlers: boolean;
        };
        monitoring: {
            logging: boolean;
            enabled: boolean;
            metrics: boolean;
            healthChecks: boolean;
            notifications: boolean;
        };
        api: {
            enabled: boolean;
            rest: boolean;
            websocket: boolean;
            graphql: boolean;
        };
    }, {
        ai?: {
            enabled?: string | boolean | undefined;
            rag?: string | boolean | undefined;
            agentSwing?: string | boolean | undefined;
            episodicMemory?: string | boolean | undefined;
        } | undefined;
        security?: {
            validation?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            auth?: string | boolean | undefined;
            rateLimiting?: string | boolean | undefined;
        } | undefined;
        storage?: {
            database?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            redis?: string | boolean | undefined;
            fileCache?: string | boolean | undefined;
            gitRepos?: string | boolean | undefined;
        } | undefined;
        core?: true | undefined;
        aiHub?: {
            openai?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            polling?: string | boolean | undefined;
        } | undefined;
        p2p?: {
            enabled?: string | boolean | undefined;
            crdt?: string | boolean | undefined;
            relay?: string | boolean | undefined;
        } | undefined;
        daemon?: {
            enabled?: string | boolean | undefined;
            requestProcessing?: string | boolean | undefined;
        } | undefined;
        actions?: {
            enabled?: string | boolean | undefined;
            fileOperations?: string | boolean | undefined;
            gitOperations?: string | boolean | undefined;
            scriptExecution?: string | boolean | undefined;
            mcpCalls?: string | boolean | undefined;
        } | undefined;
        transform?: {
            enabled?: string | boolean | undefined;
            grayRoom?: string | boolean | undefined;
            pipeline?: string | boolean | undefined;
            interruptHandlers?: string | boolean | undefined;
        } | undefined;
        monitoring?: {
            logging?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            metrics?: string | boolean | undefined;
            healthChecks?: string | boolean | undefined;
            notifications?: string | boolean | undefined;
        } | undefined;
        api?: {
            enabled?: string | boolean | undefined;
            rest?: string | boolean | undefined;
            websocket?: string | boolean | undefined;
            graphql?: string | boolean | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    database: {
        databaseUrl: string;
        redisUrl: string;
        postgresUser: string;
        postgresPassword: string;
        postgresDb: string;
    };
    security: {
        jwtSecret: string;
        jwtExpiresIn: string;
        jwtRefreshExpiresIn: string;
        skipAuth: boolean;
        apiKeyPrefix: string;
        encryptionKey?: string | undefined;
    };
    server: {
        nodeEnv: "development" | "production" | "test";
        host: string;
        defaultEmail: string;
        defaultPassword: string;
    };
    storage: {
        gitSshKeyPath: string;
        gitCloneBasePath: string;
        fileCachePath: string;
        maxFileSizeMb: number;
    };
    logging: {
        logLevel: "error" | "warn" | "info" | "debug";
        logFormat: "json" | "pretty" | "text";
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    queue: {
        concurrency: number;
        indexingConcurrency: number;
    };
    session: {
        timeoutMs: number;
        maxInactiveMs: number;
    };
    requestProcessor: {
        intervalMs: number;
    };
    aiHub: {
        aiHubUrl: string;
        pollIntervalMs: number;
        pollTimeoutMs: number;
        openaiModel: string;
        openaiApiKey?: string | undefined;
    };
    features: {
        ai: {
            enabled: boolean;
            rag: boolean;
            agentSwing: boolean;
            episodicMemory: boolean;
        };
        security: {
            validation: boolean;
            enabled: boolean;
            auth: boolean;
            rateLimiting: boolean;
        };
        storage: {
            database: boolean;
            enabled: boolean;
            redis: boolean;
            fileCache: boolean;
            gitRepos: boolean;
        };
        core: true;
        aiHub: {
            openai: boolean;
            enabled: boolean;
            polling: boolean;
        };
        p2p: {
            enabled: boolean;
            crdt: boolean;
            relay: boolean;
        };
        daemon: {
            enabled: boolean;
            requestProcessing: boolean;
        };
        actions: {
            enabled: boolean;
            fileOperations: boolean;
            gitOperations: boolean;
            scriptExecution: boolean;
            mcpCalls: boolean;
        };
        transform: {
            enabled: boolean;
            grayRoom: boolean;
            pipeline: boolean;
            interruptHandlers: boolean;
        };
        monitoring: {
            logging: boolean;
            enabled: boolean;
            metrics: boolean;
            healthChecks: boolean;
            notifications: boolean;
        };
        api: {
            enabled: boolean;
            rest: boolean;
            websocket: boolean;
            graphql: boolean;
        };
    };
}, {
    database: {
        databaseUrl?: string | undefined;
        redisUrl?: string | undefined;
        postgresUser?: string | undefined;
        postgresPassword?: string | undefined;
        postgresDb?: string | undefined;
    };
    security: {
        jwtSecret: string;
        jwtExpiresIn?: string | undefined;
        jwtRefreshExpiresIn?: string | undefined;
        encryptionKey?: string | undefined;
        skipAuth?: string | boolean | undefined;
        apiKeyPrefix?: string | undefined;
    };
    server: {
        nodeEnv?: "development" | "production" | "test" | undefined;
        host?: string | undefined;
        defaultEmail?: string | undefined;
        defaultPassword?: string | undefined;
    };
    storage: {
        gitSshKeyPath?: string | undefined;
        gitCloneBasePath?: string | undefined;
        fileCachePath?: string | undefined;
        maxFileSizeMb?: number | undefined;
    };
    logging: {
        logLevel?: "error" | "warn" | "info" | "debug" | undefined;
        logFormat?: "json" | "pretty" | "text" | undefined;
    };
    rateLimit: {
        windowMs?: number | undefined;
        maxRequests?: number | undefined;
    };
    queue: {
        concurrency?: number | undefined;
        indexingConcurrency?: number | undefined;
    };
    session: {
        timeoutMs?: number | undefined;
        maxInactiveMs?: number | undefined;
    };
    requestProcessor: {
        intervalMs?: number | undefined;
    };
    aiHub: {
        aiHubUrl?: string | undefined;
        pollIntervalMs?: number | undefined;
        pollTimeoutMs?: number | undefined;
        openaiApiKey?: string | undefined;
        openaiModel?: string | undefined;
    };
    features?: {
        ai?: {
            enabled?: string | boolean | undefined;
            rag?: string | boolean | undefined;
            agentSwing?: string | boolean | undefined;
            episodicMemory?: string | boolean | undefined;
        } | undefined;
        security?: {
            validation?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            auth?: string | boolean | undefined;
            rateLimiting?: string | boolean | undefined;
        } | undefined;
        storage?: {
            database?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            redis?: string | boolean | undefined;
            fileCache?: string | boolean | undefined;
            gitRepos?: string | boolean | undefined;
        } | undefined;
        core?: true | undefined;
        aiHub?: {
            openai?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            polling?: string | boolean | undefined;
        } | undefined;
        p2p?: {
            enabled?: string | boolean | undefined;
            crdt?: string | boolean | undefined;
            relay?: string | boolean | undefined;
        } | undefined;
        daemon?: {
            enabled?: string | boolean | undefined;
            requestProcessing?: string | boolean | undefined;
        } | undefined;
        actions?: {
            enabled?: string | boolean | undefined;
            fileOperations?: string | boolean | undefined;
            gitOperations?: string | boolean | undefined;
            scriptExecution?: string | boolean | undefined;
            mcpCalls?: string | boolean | undefined;
        } | undefined;
        transform?: {
            enabled?: string | boolean | undefined;
            grayRoom?: string | boolean | undefined;
            pipeline?: string | boolean | undefined;
            interruptHandlers?: string | boolean | undefined;
        } | undefined;
        monitoring?: {
            logging?: string | boolean | undefined;
            enabled?: string | boolean | undefined;
            metrics?: string | boolean | undefined;
            healthChecks?: string | boolean | undefined;
            notifications?: string | boolean | undefined;
        } | undefined;
        api?: {
            enabled?: string | boolean | undefined;
            rest?: string | boolean | undefined;
            websocket?: string | boolean | undefined;
            graphql?: string | boolean | undefined;
        } | undefined;
    } | undefined;
}>;
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type AIHubConfig = z.infer<typeof aiHubConfigSchema>;
export type SecurityConfig = z.infer<typeof securityConfigSchema>;
export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type StorageConfig = z.infer<typeof storageConfigSchema>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;
export type QueueConfig = z.infer<typeof queueConfigSchema>;
export type SessionConfig = z.infer<typeof sessionConfigSchema>;
export type RequestProcessorConfig = z.infer<typeof requestProcessorConfigSchema>;
export type FeaturesConfig = z.infer<typeof featuresConfigSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;
//# sourceMappingURL=schema.d.ts.map