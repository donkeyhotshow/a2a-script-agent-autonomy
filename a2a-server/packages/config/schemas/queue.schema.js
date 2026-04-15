/**
 * Queue Configuration Schema
 */
import { z } from 'zod';
import { intSchema } from './helpers.js';
export const queueConfigSchema = z.object({
    concurrency: intSchema(1, 100, 5),
    indexingConcurrency: intSchema(1, 50, 2),
});
//# sourceMappingURL=queue.schema.js.map