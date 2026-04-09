/**
 * Session Configuration Schema
 */
import { z } from 'zod';
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
export type SessionConfig = z.infer<typeof sessionConfigSchema>;
//# sourceMappingURL=session.schema.d.ts.map