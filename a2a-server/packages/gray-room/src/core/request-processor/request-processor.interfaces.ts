/**
 * Request Processor Interfaces — stub for gray-room package.
 * The canonical version lives in packages/server/src/request-processor/request-processor.interfaces.ts
 */

export interface ProcessResult {
  outcome: ProcessOutcome;
  response?: Record<string, unknown>;
  context?: Record<string, unknown>;
  execute?: ExecuteCommand;
  interrupt?: Record<string, unknown>;
  error?: string;
  note?: string;
}

export type ProcessOutcome =
  | 'completed'
  | 'failed'
  | 'graph_incomplete'
  | 'action_proposal'
  | 'ai_action_ready';

export interface ExecuteCommand {
  form?: {
    title?: string;
    choices?: Array<{ id: string; label: string }>;
    meta?: Record<string, unknown>;
    input?: unknown[];
  };
  script?: { input: Record<string, unknown>; output: string; code: string };
  message?: string;
  [key: string]: unknown;
}
