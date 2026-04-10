/**
 * Schema Helpers
 * Shared Zod helper schemas for configuration validation.
 */
import { z } from 'zod';
/** Coerce string to boolean */
export declare const booleanSchema: z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>;
/** Coerce string to integer */
export declare const intSchema: (min: number, max: number, defaultValue: number) => z.ZodDefault<z.ZodNumber>;
/** Port number schema (1-65535) */
export declare const portSchema: (defaultPort: number) => z.ZodDefault<z.ZodNumber>;
/** URL string schema */
export declare const urlSchema: (defaultUrl?: string) => z.ZodString | z.ZodDefault<z.ZodString>;
/** String with minimum length */
export declare const minStringSchema: (min: number) => z.ZodString;
/** Optional string with minimum length */
export declare const optionalMinStringSchema: (min: number) => z.ZodOptional<z.ZodString>;
//# sourceMappingURL=helpers.d.ts.map