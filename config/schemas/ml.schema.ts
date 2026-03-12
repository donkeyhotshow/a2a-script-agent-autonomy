/**
 * ML/Embeddings Configuration Schema
 */

import { z } from 'zod';
import { intSchema } from './helpers.js';

export const mlConfigSchema = z.object({
  embeddingDimension: intSchema(1, 4096, 768),
  chunkMaxTokens: intSchema(1, 4096, 512),
  chunkOverlapTokens: intSchema(0, 1024, 50),
});

export type MLConfig = z.infer<typeof mlConfigSchema>;

