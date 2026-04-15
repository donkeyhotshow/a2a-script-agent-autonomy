/**
 * Database Configuration Schema
 */

import { z } from 'zod';
import { urlSchema } from './helpers.js';

export const databaseConfigSchema = z.object({
  databaseUrl: urlSchema().optional(),
  redisUrl: urlSchema('redis://localhost:6379').optional(),
  postgresUser: z.string().default('a2a').optional(),
  postgresPassword: z.string().default('a2a_secret').optional(),
  postgresDb: z.string().default('a2a_server').optional(),
}).partial();

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

