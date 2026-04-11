/**
 * Security Configuration Schema
 */

import { z } from 'zod';
import { booleanSchema, minStringSchema, optionalMinStringSchema } from './helpers';

export const securityConfigSchema = z.object({
  jwtSecret: minStringSchema(32),
  jwtExpiresIn: z.string().default('1h'),
  jwtRefreshExpiresIn: z.string().default('7d'),
  encryptionKey: optionalMinStringSchema(32),
  skipAuth: booleanSchema.default(false),
  apiKeyPrefix: z.string().default('sk_a2a_'),
});

export type SecurityConfig = z.infer<typeof securityConfigSchema>;

