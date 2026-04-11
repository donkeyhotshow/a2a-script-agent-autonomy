/**
 * Request Processor Configuration Schema
 */

import { z } from 'zod';
import { intSchema } from './helpers';

export const requestProcessorConfigSchema = z.object({
  intervalMs: intSchema(100, 60000, 5000),
});

export type RequestProcessorConfig = z.infer<typeof requestProcessorConfigSchema>;

