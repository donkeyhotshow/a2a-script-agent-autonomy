import { GrayRoomConfig } from "../src/types.js";

export const productionGrayRoomConfig: GrayRoomConfig = {
  version: "1.0",
  defaultOptions: {
    maxInterruptTurns: 10,
    aiHubUrl: process.env.AI_HUB_URL,
    model: "gpt-4",
    promptsTransformsPath: "./prompts/transforms",
    timeout: 600000, // 10 minutes
  },
  tasks: [
    // High priority context scanning before any LLM request
    {
      id: "context_preparation",
      name: "Context Preparation",
      description: "Prepare comprehensive context before LLM interaction",
      trigger: "pre_request",
      conditions: [
        {
          type: "context_key",
          key: "projectRoot",
          operator: "exists",
        },
      ],
      actions: [
        {
          type: "interrupt",
          params: {
            reason: "prepare_context",
            schema: "context_builder",
          },
        },
      ],
      priority: 100,
      enabled: true,
    },

    // Quality validation after LLM response
    {
      id: "response_quality_check",
      name: "Response Quality Check",
      description: "Validate LLM response quality and completeness",
      trigger: "post_response",
      conditions: [
        {
          type: "result_outcome",
          key: "confidence",
          operator: "less_than",
          value: 0.7,
        },
      ],
      actions: [
        {
          type: "analyze",
          params: {
            type: "quality_assessment",
          },
        },
        {
          type: "interrupt",
          params: {
            reason: "quality_improvement",
            schema: "response_refinement",
          },
        },
      ],
      priority: 50,
      enabled: true,
      maxRuns: 2,
    },

    // Error handling for failed transformations
    {
      id: "transformation_error_recovery",
      name: "Transformation Error Recovery",
      description: "Handle and recover from transformation failures",
      trigger: "post_transform",
      conditions: [
        {
          type: "result_outcome",
          key: "outcome",
          value: "failed",
          operator: "equals",
        },
      ],
      actions: [
        {
          type: "interrupt",
          params: {
            reason: "error_recovery",
            schema: "error_handler",
          },
        },
      ],
      priority: 80,
      enabled: true,
      cooldown: 30000, // 30 seconds cooldown
    },

    // Performance optimization for long conversations
    {
      id: "history_optimization",
      name: "History Optimization",
      description: "Compress and optimize conversation history",
      trigger: "conditional",
      conditions: [
        {
          type: "context_key",
          key: "history.length",
          operator: "greater_than",
          value: 50,
        },
      ],
      actions: [
        {
          type: "compress_history",
          params: {
            strategy: "summarize_old_messages",
          },
        },
      ],
      priority: 20,
      enabled: true,
      cooldown: 60000, // 1 minute cooldown
    },

    // Manual trigger for debugging
    {
      id: "debug_analysis",
      name: "Debug Analysis",
      description: "Manual trigger for debugging workflow issues",
      trigger: "manual",
      conditions: [],
      actions: [
        {
          type: "analyze",
          params: {
            type: "debug_diagnostics",
          },
        },
        {
          type: "rag_page",
          params: {
            content: "debug_logs",
            persist: true,
          },
        },
      ],
      priority: 1,
      enabled: false, // Disabled by default, enable for debugging
    },
  ],
  globalConditions: [
    {
      type: "rate_limit",
      params: {
        maxRequestsPerMinute: 10,
      },
    },
  ],
  logging: {
    level: "info",
    enableTracing: true,
  },
};
