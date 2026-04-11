/**
 * Configuration Schemas - Barrel Export
 * All domain-specific schemas + root appConfigSchema.
 */
export { portConfigSchema, type PortConfig } from './ports.schema';
export { databaseConfigSchema, type DatabaseConfig } from './database.schema';
export { aiConfigSchema, type AIConfig } from './ai.schema';
export { securityConfigSchema, type SecurityConfig } from './security.schema';
import { z } from 'zod';
export declare const appConfigSchema: z.ZodObject<{
    ports: z.ZodObject<{
        serverPort: z.ZodDefault<z.ZodNumber>;
        clientApiPort: z.ZodDefault<z.ZodNumber>;
        webPort: z.ZodDefault<z.ZodNumber>;
        proxyPort: z.ZodDefault<z.ZodNumber>;
        localLlmPort: z.ZodDefault<z.ZodNumber>;
        postgresPort: z.ZodDefault<z.ZodNumber>;
        redisPort: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        serverPort: number;
        clientApiPort: number;
        webPort: number;
        proxyPort: number;
        localLlmPort: number;
        postgresPort: number;
        redisPort: number;
    }, {
        serverPort?: number | undefined;
        clientApiPort?: number | undefined;
        webPort?: number | undefined;
        proxyPort?: number | undefined;
        localLlmPort?: number | undefined;
        postgresPort?: number | undefined;
        redisPort?: number | undefined;
    }>;
    database: z.ZodObject<{
        databaseUrl: z.ZodOptional<z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodDefault<z.ZodString>>>;
        redisUrl: z.ZodOptional<z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodDefault<z.ZodString>>>;
        postgresUser: z.ZodOptional<z.ZodOptional<z.ZodDefault<z.ZodString>>>;
        postgresPassword: z.ZodOptional<z.ZodOptional<z.ZodDefault<z.ZodString>>>;
        postgresDb: z.ZodOptional<z.ZodOptional<z.ZodDefault<z.ZodString>>>;
    }, "strip", z.ZodTypeAny, {
        databaseUrl?: string | undefined;
        redisUrl?: string | undefined;
        postgresUser?: string | undefined;
        postgresPassword?: string | undefined;
        postgresDb?: string | undefined;
    }, {
        databaseUrl?: string | undefined;
        redisUrl?: string | undefined;
        postgresUser?: string | undefined;
        postgresPassword?: string | undefined;
        postgresDb?: string | undefined;
    }>;
    ai: z.ZodObject<{
        localLlmUpstreamUrl: z.ZodString | z.ZodDefault<z.ZodString>;
        localLlmModel: z.ZodDefault<z.ZodString>;
        localLlmTimeout: z.ZodDefault<z.ZodNumber>;
        localLlmModels: z.ZodDefault<z.ZodString>;
        localLlmKeepAlive: z.ZodDefault<z.ZodString>;
        localLlmIdleTimeout: z.ZodDefault<z.ZodNumber>;
        localLlmAutoStart: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        llmProvider: z.ZodDefault<z.ZodEnum<["local_hub", "openai", ""]>>;
        useLocalLlm: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        aiHubUrl: z.ZodString | z.ZodDefault<z.ZodString>;
        pollIntervalMs: z.ZodDefault<z.ZodNumber>;
        pollTimeoutMs: z.ZodDefault<z.ZodNumber>;
        openaiApiKey: z.ZodOptional<z.ZodString>;
        openaiModel: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        localLlmUpstreamUrl: string;
        localLlmModel: string;
        localLlmTimeout: number;
        localLlmModels: string;
        localLlmKeepAlive: string;
        localLlmIdleTimeout: number;
        localLlmAutoStart: boolean;
        llmProvider: "" | "local_hub" | "openai";
        useLocalLlm: boolean;
        aiHubUrl: string;
        pollIntervalMs: number;
        pollTimeoutMs: number;
        openaiModel: string;
        openaiApiKey?: string | undefined;
    }, {
        localLlmUpstreamUrl?: string | undefined;
        localLlmModel?: string | undefined;
        localLlmTimeout?: number | undefined;
        localLlmModels?: string | undefined;
        localLlmKeepAlive?: string | undefined;
        localLlmIdleTimeout?: number | undefined;
        localLlmAutoStart?: string | boolean | undefined;
        llmProvider?: "" | "local_hub" | "openai" | undefined;
        useLocalLlm?: string | boolean | undefined;
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
    proxy: z.ZodObject<{
        proxyHost: z.ZodDefault<z.ZodString>;
        storageDir: z.ZodDefault<z.ZodString>;
        promisesDir: z.ZodOptional<z.ZodString>;
        forwardTimeoutSeconds: z.ZodDefault<z.ZodNumber>;
        promiseTtlSeconds: z.ZodDefault<z.ZodNumber>;
        promiseMaxWorkers: z.ZodDefault<z.ZodNumber>;
        aiHubConfig: z.ZodOptional<z.ZodString>;
        localLlmServerHeader: z.ZodDefault<z.ZodString>;
        simulationEnabled: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
        simulationDataPath: z.ZodDefault<z.ZodString>;
        healthCheckInterval: z.ZodDefault<z.ZodNumber>;
        healthCheckTimeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        proxyHost: string;
        storageDir: string;
        forwardTimeoutSeconds: number;
        promiseTtlSeconds: number;
        promiseMaxWorkers: number;
        localLlmServerHeader: string;
        simulationEnabled: boolean;
        simulationDataPath: string;
        healthCheckInterval: number;
        healthCheckTimeout: number;
        promisesDir?: string | undefined;
        aiHubConfig?: string | undefined;
    }, {
        proxyHost?: string | undefined;
        storageDir?: string | undefined;
        promisesDir?: string | undefined;
        forwardTimeoutSeconds?: number | undefined;
        promiseTtlSeconds?: number | undefined;
        promiseMaxWorkers?: number | undefined;
        aiHubConfig?: string | undefined;
        localLlmServerHeader?: string | undefined;
        simulationEnabled?: string | boolean | undefined;
        simulationDataPath?: string | undefined;
        healthCheckInterval?: number | undefined;
        healthCheckTimeout?: number | undefined;
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
        logLevel: "info" | "error" | "warn" | "debug";
        logFormat: "json" | "pretty" | "text";
    }, {
        logLevel?: "info" | "error" | "warn" | "debug" | undefined;
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
}, "strip", z.ZodTypeAny, {
    ports: {
        serverPort: number;
        clientApiPort: number;
        webPort: number;
        proxyPort: number;
        localLlmPort: number;
        postgresPort: number;
        redisPort: number;
    };
    database: {
        databaseUrl?: string | undefined;
        redisUrl?: string | undefined;
        postgresUser?: string | undefined;
        postgresPassword?: string | undefined;
        postgresDb?: string | undefined;
    };
    ai: {
        localLlmUpstreamUrl: string;
        localLlmModel: string;
        localLlmTimeout: number;
        localLlmModels: string;
        localLlmKeepAlive: string;
        localLlmIdleTimeout: number;
        localLlmAutoStart: boolean;
        llmProvider: "" | "local_hub" | "openai";
        useLocalLlm: boolean;
        aiHubUrl: string;
        pollIntervalMs: number;
        pollTimeoutMs: number;
        openaiModel: string;
        openaiApiKey?: string | undefined;
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
    proxy: {
        proxyHost: string;
        storageDir: string;
        forwardTimeoutSeconds: number;
        promiseTtlSeconds: number;
        promiseMaxWorkers: number;
        localLlmServerHeader: string;
        simulationEnabled: boolean;
        simulationDataPath: string;
        healthCheckInterval: number;
        healthCheckTimeout: number;
        promisesDir?: string | undefined;
        aiHubConfig?: string | undefined;
    };
    storage: {
        gitSshKeyPath: string;
        gitCloneBasePath: string;
        fileCachePath: string;
        maxFileSizeMb: number;
    };
    logging: {
        logLevel: "info" | "error" | "warn" | "debug";
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
}, {
    ports: {
        serverPort?: number | undefined;
        clientApiPort?: number | undefined;
        webPort?: number | undefined;
        proxyPort?: number | undefined;
        localLlmPort?: number | undefined;
        postgresPort?: number | undefined;
        redisPort?: number | undefined;
    };
    database: {
        databaseUrl?: string | undefined;
        redisUrl?: string | undefined;
        postgresUser?: string | undefined;
        postgresPassword?: string | undefined;
        postgresDb?: string | undefined;
    };
    ai: {
        localLlmUpstreamUrl?: string | undefined;
        localLlmModel?: string | undefined;
        localLlmTimeout?: number | undefined;
        localLlmModels?: string | undefined;
        localLlmKeepAlive?: string | undefined;
        localLlmIdleTimeout?: number | undefined;
        localLlmAutoStart?: string | boolean | undefined;
        llmProvider?: "" | "local_hub" | "openai" | undefined;
        useLocalLlm?: string | boolean | undefined;
        aiHubUrl?: string | undefined;
        pollIntervalMs?: number | undefined;
        pollTimeoutMs?: number | undefined;
        openaiApiKey?: string | undefined;
        openaiModel?: string | undefined;
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
    proxy: {
        proxyHost?: string | undefined;
        storageDir?: string | undefined;
        promisesDir?: string | undefined;
        forwardTimeoutSeconds?: number | undefined;
        promiseTtlSeconds?: number | undefined;
        promiseMaxWorkers?: number | undefined;
        aiHubConfig?: string | undefined;
        localLlmServerHeader?: string | undefined;
        simulationEnabled?: string | boolean | undefined;
        simulationDataPath?: string | undefined;
        healthCheckInterval?: number | undefined;
        healthCheckTimeout?: number | undefined;
    };
    storage: {
        gitSshKeyPath?: string | undefined;
        gitCloneBasePath?: string | undefined;
        fileCachePath?: string | undefined;
        maxFileSizeMb?: number | undefined;
    };
    logging: {
        logLevel?: "info" | "error" | "warn" | "debug" | undefined;
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
}>;
export type AppConfig = z.infer<typeof appConfigSchema>;
export * from './ports.schema';
export * from './database.schema';
export * from './ai.schema';
export * from './security.schema';
export * from './server.schema';
export * from './proxy.schema';
export * from './storage.schema';
export * from './logging.schema';
export * from './rate-limit.schema';
export * from './queue.schema';
export * from './session.schema';
export * from './request-processor.schema';
export { booleanSchema, intSchema, portSchema, urlSchema, minStringSchema, optionalMinStringSchema } from './helpers';
//# sourceMappingURL=index.d.ts.map