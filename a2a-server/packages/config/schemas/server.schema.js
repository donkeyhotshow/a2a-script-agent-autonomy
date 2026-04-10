/**
 * Server Configuration Schema
 */
import { z } from 'zod';
export const serverConfigSchema = z.object({
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    host: z.string().default('localhost'),
    defaultEmail: z.string().email().default('dev@localhost'),
    defaultPassword: z.string().default('dev'),
});
//# sourceMappingURL=server.schema.js.map