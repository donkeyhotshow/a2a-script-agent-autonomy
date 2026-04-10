/**
 * Security Configuration Schema
 */
import { z } from 'zod';
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
export type SecurityConfig = z.infer<typeof securityConfigSchema>;
//# sourceMappingURL=security.schema.d.ts.map