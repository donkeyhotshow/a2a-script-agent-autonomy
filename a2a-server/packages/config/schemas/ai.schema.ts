// [STUB] ai.schema — requires real implementation
import { z } from 'zod';

export const aiSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
}).passthrough();

export type AiConfig = z.infer<typeof aiSchema>;
