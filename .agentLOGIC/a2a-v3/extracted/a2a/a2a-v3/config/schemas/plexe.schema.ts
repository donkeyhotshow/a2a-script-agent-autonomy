/**
 * Plexe ML Configuration Schema
 */

import { z } from 'zod';

export const plexeConfigSchema = z.object({
  apiUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
});

export type PlexeConfig = z.infer<typeof plexeConfigSchema>;

