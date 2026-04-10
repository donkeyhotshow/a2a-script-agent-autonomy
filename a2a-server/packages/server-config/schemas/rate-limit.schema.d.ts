/**
 * Rate Limiting Configuration Schema
 */
import { z } from 'zod';
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
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;
//# sourceMappingURL=rate-limit.schema.d.ts.map