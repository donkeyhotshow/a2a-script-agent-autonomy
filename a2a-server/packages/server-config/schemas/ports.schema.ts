/**
 * Ports Configuration Schema
 */

import { z } from 'zod';

const intSchema = (min: number, max: number, defaultValue: number) =>
  z.coerce.number().int().min(min).max(max).default(defaultValue);

export const portConfigSchema = z.object({
  serverPort: intSchema(1, 65535, 3000),
  clientApiPort: intSchema(1, 65535, 3100),
  webPort: intSchema(1, 65535, 3200),
  proxyPort: intSchema(1, 65535, 3300),
  localLlmPort: intSchema(1, 65535, 11435),
  postgresPort: intSchema(1, 65535, 5432),
  redisPort: intSchema(1, 65535, 6379),
});

export type PortConfig = z.infer<typeof portConfigSchema>;