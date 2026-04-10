/**
 * Database Configuration Schema
 */
import { z } from 'zod';
export declare const databaseConfigSchema: z.ZodObject<{
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
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
//# sourceMappingURL=database.schema.d.ts.map