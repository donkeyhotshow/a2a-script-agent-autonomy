/**
 * Database Configuration Schema
 */

import { z } from 'zod';
import { urlSchema } from './helpers.js';

export const databaseConfigSchema = z.object({
  databaseUrl: urlSchema(),
  redisUrl: urlSchema('redis://localhost:6379'),
  postgresUser: z.string().default('a2a'),
  postgresPassword: z.string().default('a2a_secret'),
  postgresDb: z.string().default('a2a_server'),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

