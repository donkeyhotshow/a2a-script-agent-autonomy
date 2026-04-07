/**
 * Ports Configuration Schema
 */

import { z } from 'zod';
import { portSchema } from './helpers.js';

export const portConfigSchema = z.object({
  serverPort: portSchema(3000),
  clientApiPort: portSchema(3001),
  webPort: portSchema(5173),
  proxyPort: portSchema(11434),
  localLlmPort: portSchema(11435),
  postgresPort: portSchema(5432),
  redisPort: portSchema(6379),
});

export type PortConfig = z.infer<typeof portConfigSchema>;

