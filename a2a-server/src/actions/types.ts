/**
 * TypeScript types for iterative Actions system
 */

/**
 * DSL script definition
 */
export interface DSLDefinition {
  /** Script name to execute */
  script: string;
  /** Default input parameters */
  input: Record<string, unknown>;
}

/**
 * Action execution context
 */
export interface ActionContext {
  /** Framework name (e.g., 'react', 'vue', 'angular') */
  framework?: string;
  /** Build tool (e.g., 'vite', 'webpack', 'rollup') */
  buildTool?: string;
  /** Alias mappings for commands */
  aliases?: Record<string, string>;
}

/**
 * Individual step in iterative action execution
 */
export interface SubAction {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Detailed description */
  description: string;
  /** Execution priority (lower = higher priority) */
  priority: number;
  /** Input data description */
  input: string;
  /** Output data description */
  output: string;
  /** DSL script definition */
  dsl: DSLDefinition;
  /** TypeScript code for script execution */
  code?: string;
}

/**
 * Main action definition
 */
export interface ActionDefinition {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Detailed description */
  description: string;
  /** Execution priority (lower = higher priority) */
  priority: number;
  /** Execution context */
  context: ActionContext;
  /** Ordered list of sub-actions */
  subActions: SubAction[];
}

/**
 * Status of a step execution
 */
export type StepStatus = 'completed' | 'failed' | 'skipped';

/**
 * History record for an executed step
 */
export interface StepHistory {
  /** Step identifier */
  stepId: string;
  /** Execution status */
  status: StepStatus;
  /** Execution result */
  result: unknown;
}

/**
 * Current state of action execution
 */
export interface ExecutionState {
  /** Action identifier */
  actionId: string;
  /** Current step index in subActions array */
  currentStepIndex: number;
  /** Execution history for all steps */
  history: StepHistory[];
}

/**
 * Result of action search/matching
 */
export interface ActionMatch {
  /** Matched action definition */
  action: ActionDefinition;
  /** Similarity score (0-1, higher = better match) */
  matchScore: number;
}

/**
 * Outcome type for action response
 */
export type ActionOutcome = 
  | 'action_proposal' 
  | 'action_executing' 
  | 'completed' 
  | 'failed';

/**
 * Full response format for action simulation
 */
export interface ActionResponse {
  /** Outcome type */
  outcome: ActionOutcome;
  /** Matched action (if outcome is action_proposal or action_executing) */
  action?: ActionMatch;
  /** Execution state (if outcome is action_executing, completed, or failed) */
  executionState?: ExecutionState;
  /** Error message (if outcome is failed) */
  error?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}
