/**
 * Schema Helpers
 * Shared Zod helper schemas for configuration validation.
 */

import { z } from 'zod';

/** Coerce string to boolean */
export const booleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return ['true', '1', 'yes', 'y', 'on', 't'].includes(val.toLowerCase());
  })
  .default(false);

/** Coerce string to integer */
export const intSchema = (min: number, max: number, defaultValue: number) =>
  z.coerce.number().int().min(min).max(max).default(defaultValue);

/** Port number schema (1-65535) */
export const portSchema = (defaultPort: number) => intSchema(1, 65535, defaultPort);

/** URL string schema */
export const urlSchema = (defaultUrl?: string) =>
  defaultUrl ? z.string().url().default(defaultUrl) : z.string().url();

/** String with minimum length */
export const minStringSchema = (min: number) => z.string().min(min);

/** Optional string with minimum length */
export const optionalMinStringSchema = (min: number) => z.string().min(min).optional();

