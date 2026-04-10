/**
 * AI/LLM Configuration Schema
 */
import { z } from 'zod';
export declare const aiConfigSchema: z.ZodObject<{
    localLlmUpstreamUrl: z.ZodString | z.ZodDefault<z.ZodString>;
    localLlmModel: z.ZodDefault<z.ZodString>;
    localLlmTimeout: z.ZodDefault<z.ZodNumber>;
    localLlmModels: z.ZodDefault<z.ZodString>;
    localLlmKeepAlive: z.ZodDefault<z.ZodString>;
    localLlmIdleTimeout: z.ZodDefault<z.ZodNumber>;
    localLlmAutoStart: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    llmProvider: z.ZodDefault<z.ZodEnum<["local_hub", "openai", ""]>>;
    useLocalLlm: z.ZodDefault<z.ZodDefault<z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodString]>, boolean, string | boolean>>>;
    aiHubUrl: z.ZodString | z.ZodDefault<z.ZodString>;
    pollIntervalMs: z.ZodDefault<z.ZodNumber>;
    pollTimeoutMs: z.ZodDefault<z.ZodNumber>;
    openaiApiKey: z.ZodOptional<z.ZodString>;
    openaiModel: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    aiHubUrl: string;
    localLlmUpstreamUrl: string;
    localLlmModel: string;
    localLlmTimeout: number;
    localLlmModels: string;
    localLlmKeepAlive: string;
    localLlmIdleTimeout: number;
    localLlmAutoStart: boolean;
    llmProvider: "" | "local_hub" | "openai";
    useLocalLlm: boolean;
    pollIntervalMs: number;
    pollTimeoutMs: number;
    openaiModel: string;
    openaiApiKey?: string | undefined;
}, {
    aiHubUrl?: string | undefined;
    localLlmUpstreamUrl?: string | undefined;
    localLlmModel?: string | undefined;
    localLlmTimeout?: number | undefined;
    localLlmModels?: string | undefined;
    localLlmKeepAlive?: string | undefined;
    localLlmIdleTimeout?: number | undefined;
    localLlmAutoStart?: string | boolean | undefined;
    llmProvider?: "" | "local_hub" | "openai" | undefined;
    useLocalLlm?: string | boolean | undefined;
    pollIntervalMs?: number | undefined;
    pollTimeoutMs?: number | undefined;
    openaiApiKey?: string | undefined;
    openaiModel?: string | undefined;
}>;
export type AIConfig = z.infer<typeof aiConfigSchema>;
//# sourceMappingURL=ai.schema.d.ts.map