/**
 * Database Configuration Schema
 */
import { z } from 'zod';
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
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
//# sourceMappingURL=database.schema.d.ts.map