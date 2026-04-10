/**
 * AI/LLM Configuration Schema
 */
import { z } from 'zod';
import { booleanSchema, intSchema, urlSchema } from './helpers.js';
export const aiConfigSchema = z.object({
    localLlmUpstreamUrl: urlSchema('http://localhost:11435'),
    localLlmModel: z.string().default('qwen3:8b'),
    localLlmTimeout: intSchema(1, 3600, 60),
    localLlmModels: z.string().default('~/.a2a/local-llm-models'),
    localLlmKeepAlive: z.string().default('5m'),
    localLlmIdleTimeout: intSchema(0, 86400, 300),
    localLlmAutoStart: booleanSchema.default(true),
    llmProvider: z.enum(['local_hub', 'openai', '']).default(''),
    useLocalLlm: booleanSchema.default(false),
    aiHubUrl: urlSchema('http://localhost:11434'),
    pollIntervalMs: intSchema(100, 60000, 2000),
    pollTimeoutMs: intSchema(1000, 600000, 120000),
    openaiApiKey: z.string().optional(),
    openaiModel: z.string().default('gpt-4o-mini'),
});
//# sourceMappingURL=ai.schema.js.map