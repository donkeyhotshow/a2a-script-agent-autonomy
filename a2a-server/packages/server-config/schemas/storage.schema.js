/**
 * Storage Configuration Schema
 */
import { z } from 'zod';
import { intSchema } from './helpers.js';
export const storageConfigSchema = z.object({
    gitSshKeyPath: z.string().default('./ssh_keys'),
    gitCloneBasePath: z.string().default('./repos'),
    fileCachePath: z.string().default('./file_cache'),
    maxFileSizeMb: intSchema(1, 1000, 10),
});
//# sourceMappingURL=storage.schema.js.map