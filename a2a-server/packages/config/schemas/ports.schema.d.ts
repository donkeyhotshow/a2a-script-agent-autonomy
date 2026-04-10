/**
 * Ports Configuration Schema
 */
import { z } from 'zod';
export declare const portConfigSchema: z.ZodObject<{
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
export type PortConfig = z.infer<typeof portConfigSchema>;
//# sourceMappingURL=ports.schema.d.ts.map