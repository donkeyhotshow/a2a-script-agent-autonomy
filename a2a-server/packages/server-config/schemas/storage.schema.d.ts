/**
 * Storage Configuration Schema
 */
import { z } from 'zod';
export declare const storageConfigSchema: z.ZodObject<{
    gitSshKeyPath: z.ZodDefault<z.ZodString>;
    gitCloneBasePath: z.ZodDefault<z.ZodString>;
    fileCachePath: z.ZodDefault<z.ZodString>;
    maxFileSizeMb: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    gitSshKeyPath: string;
    gitCloneBasePath: string;
    fileCachePath: string;
    maxFileSizeMb: number;
}, {
    gitSshKeyPath?: string | undefined;
    gitCloneBasePath?: string | undefined;
    fileCachePath?: string | undefined;
    maxFileSizeMb?: number | undefined;
}>;
export type StorageConfig = z.infer<typeof storageConfigSchema>;
//# sourceMappingURL=storage.schema.d.ts.map