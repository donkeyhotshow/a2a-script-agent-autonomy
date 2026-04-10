/**
 * Request Processor Configuration Schema
 */
import { z } from 'zod';
export declare const requestProcessorConfigSchema: z.ZodObject<{
    intervalMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    intervalMs: number;
}, {
    intervalMs?: number | undefined;
}>;
export type RequestProcessorConfig = z.infer<typeof requestProcessorConfigSchema>;
//# sourceMappingURL=request-processor.schema.d.ts.map