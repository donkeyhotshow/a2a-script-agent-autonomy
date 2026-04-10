import { z } from "zod";

export const GrayRoomTriggerSchema = z.enum([
  "pre_request", // Before LLM request
  "post_response", // After LLM response
  "post_transform", // After response transform
  "manual", // Manual trigger only
  "conditional", // Based on conditions
]);

export const GrayRoomTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  trigger: GrayRoomTriggerSchema,
  conditions: z
    .array(
      z.object({
        type: z.enum([
          "context_key",
          "result_outcome",
          "interrupt_reason",
          "custom",
        ]),
        key: z.string().optional(),
        value: z.any().optional(),
        operator: z.enum([
          "equals",
          "contains",
          "exists",
          "not_exists",
          "greater_than",
          "less_than",
        ]),
      }),
    )
    .optional(),
  actions: z.array(
    z.object({
      type: z.enum([
        "interrupt",
        "analyze",
        "rag_page",
        "compress_history",
        "custom",
      ]),
      params: z.record(z.any()).optional(),
    }),
  ),
  priority: z.number().default(1),
  enabled: z.boolean().default(true),
  maxRuns: z.number().optional(), // Limit executions per session
  cooldown: z.number().optional(), // Cooldown in milliseconds
});

export const GrayRoomConfigSchema = z.object({
  version: z.string().default("1.0"),
  defaultOptions: z.object({
    maxInterruptTurns: z.number().default(5),
    aiHubUrl: z.string().optional(),
    model: z.string().optional(),
    promptsTransformsPath: z.string(),
    timeout: z.number().default(300000), // 5 minutes
  }),
  tasks: z.array(GrayRoomTaskSchema),
  globalConditions: z
    .array(
      z.object({
        type: z.string(),
        params: z.record(z.any()),
      }),
    )
    .optional(),
  logging: z
    .object({
      level: z.enum(["debug", "info", "warn", "error"]).default("info"),
      enableTracing: z.boolean().default(true),
    })
    .optional(),
});

export type GrayRoomTrigger = z.infer<typeof GrayRoomTriggerSchema>;
export type GrayRoomTask = z.infer<typeof GrayRoomTaskSchema>;
export type GrayRoomConfig = z.infer<typeof GrayRoomConfigSchema>;

export interface GrayRoomContext {
  sessionId: string;
  ticketId?: string;
  triggerPoint: GrayRoomTrigger;
  context: Record<string, any>;
  result?: any;
  trace?: any[];
}

export interface GrayRoomTaskResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  executedAt: Date;
}
