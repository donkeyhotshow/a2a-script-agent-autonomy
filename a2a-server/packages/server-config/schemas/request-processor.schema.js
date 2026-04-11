/**
 * Request Processor Configuration Schema
 */
import { z } from 'zod';
import { intSchema } from './helpers.js';
export const requestProcessorConfigSchema = z.object({
    intervalMs: intSchema(100, 60000, 5000),
});
