/**
 * AI/LLM Configuration Schema
 */

import { z } from 'zod';
import { booleanSchema, intSchema, urlSchema } from './helpers.js';

export const aiConfigSchema = z.object({
  ollamaHost: urlSchema('http://localhost:11435'),
  ollamaModel: z.string().default('qwen3:8b'),
  ollamaTimeout: intSchema(1, 3600, 60),
  ollamaModels: z.string().default('~/.ollama'),
  ollamaKeepAlive: z.string().default('5m'),
  ollamaIdleTimeout: intSchema(0, 86400, 300),
  ollamaAutoStart: booleanSchema.default(true),
  llmProvider: z.enum(['ollama', 'openai', '']).default(''),
  useOllama: booleanSchema.default(false),
  aiHubUrl: urlSchema('http://localhost:11434'),
  pollIntervalMs: intSchema(100, 60000, 2000),
  pollTimeoutMs: intSchema(1000, 600000, 120000),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().default('gpt-4o-mini'),
});

export type AIConfig = z.infer<typeof aiConfigSchema>;

