import { GrayRoomConfig } from "./types";

export const defaultGrayRoomConfig: GrayRoomConfig = {
  version: "1.0",
  defaultOptions: {
    maxInterruptTurns: 5,
    promptsTransformsPath: "./prompts",
    timeout: 300000,
  },
  tasks: [
    {
      id: "pre_request_context_scan",
      name: "Pre-request Context Scan",
      description: "Scan project structure before LLM request",
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
            reason: "auto_context_scan",
            schema: "context_enrichment",
          },
        },
      ],
      priority: 10,
      enabled: true,
    },
    {
      id: "post_response_validation",
      name: "Post-response Validation",
      description: "Validate LLM response and trigger corrections if needed",
      trigger: "post_response",
      conditions: [
        {
          type: "result_outcome",
          key: "outcome",
          value: "incomplete",
          operator: "equals",
        },
      ],
      actions: [
        {
          type: "analyze",
          params: {
            type: "response_quality",
          },
        },
        {
          type: "interrupt",
          params: {
            reason: "response_validation_failed",
            schema: "correction",
          },
        },
      ],
      priority: 5,
      enabled: true,
      maxRuns: 3,
    },
    {
      id: "post_transform_optimization",
      name: "Post-transform Optimization",
      description: "Optimize execution plan after transformation",
      trigger: "post_transform",
      conditions: [
        {
          type: "interrupt_reason",
          key: "optimization_needed",
          operator: "exists",
        },
      ],
      actions: [
        {
          type: "interrupt",
          params: {
            reason: "optimize_execution",
            schema: "optimization",
          },
        },
      ],
      priority: 3,
      enabled: false, // Disabled by default
      cooldown: 10000, // 10 seconds cooldown
    },
  ],
  logging: {
    level: "info",
    enableTracing: true,
  },
};
