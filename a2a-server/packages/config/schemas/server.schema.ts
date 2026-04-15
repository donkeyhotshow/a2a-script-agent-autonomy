// [STUB] server.schema — requires real implementation
import { z } from 'zod';

export const serverSchema = z.object({
  port: z.number().default(3000),
  host: z.string().default('localhost'),
  nodeEnv: z.string().default('development'),
}).passthrough();

export type ServerConfig = z.infer<typeof serverSchema>;
