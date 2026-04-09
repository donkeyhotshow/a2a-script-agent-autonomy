/**
 * Server Configuration Schema
 */
import { z } from 'zod';
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
export type ServerConfig = z.infer<typeof serverConfigSchema>;
//# sourceMappingURL=server.schema.d.ts.map