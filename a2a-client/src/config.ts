import { z } from 'zod';

/**
 * Configuration schema for the A2A Client application
 */
export const ConfigSchema = z.object({
  // Features to enable
  features: z.object({
    rag: z.boolean().default(false),
    embedding: z.boolean().default(false),
    execution: z.boolean().default(false),
    web: z.boolean().default(false),
    storage: z.boolean().default(false),
  }),
  
  // API configuration
  api: z.object({
    timeout: z.number().default(15000),
    maxRetries: z.number().default(3),
    baseDelay: z.number().default(2000),
  }).default({}),
  
  // Polling configuration
  polling: z.object({
    interval: z.number().default(5000),
  }).default({}),
  
  // Logger configuration
  logger: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load configuration from JSON file or environment
 * @param configPath - Path to configuration file (optional)
 * @returns Parsed and validated configuration
 */
export function loadConfig(configPath?: string): Config {
  let configObj: any = {};
  
  if (configPath) {
    try {
      // In real implementation, we would read the file
      // For now, we'll use a default config
      console.log(`Loading config from ${configPath}`);
      // This would be: import fs from 'fs'; configObj = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}, using defaults:`, error);
    }
  }
  
  // Override from environment variables if needed
  // Example: process.env.A2A_FEATURES_RAG === 'true' 
  
  return ConfigSchema.parse(configObj);
}