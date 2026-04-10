/**
 * Queue Configuration Schema
 */
import { z } from 'zod';
export declare const queueConfigSchema: z.ZodObject<{
    concurrency: z.ZodDefault<z.ZodNumber>;
    indexingConcurrency: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    concurrency: number;
    indexingConcurrency: number;
}, {
    concurrency?: number | undefined;
    indexingConcurrency?: number | undefined;
}>;
export type QueueConfig = z.infer<typeof queueConfigSchema>;
//# sourceMappingURL=queue.schema.d.ts.map