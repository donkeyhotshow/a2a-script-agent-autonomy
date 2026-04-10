/**
 * AI Proxy Configuration Schema
 */
import { z } from 'zod';
export declare const proxyConfigSchema: z.ZodObject<{
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
export type ProxyConfig = z.infer<typeof proxyConfigSchema>;
//# sourceMappingURL=proxy.schema.d.ts.map