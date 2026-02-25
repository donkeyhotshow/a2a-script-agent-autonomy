/**
 * TypeScript типы для реальных экшенов симуляций
 * 
 * Все ответы сервера имеют общую структуру с разными типами actions
 */

// Базовые типы
export interface BaseResponse {
  success: boolean;
  data: ResponseData;
}

export interface ResponseData {
  id: string;
  promiseId: string;
  clientId: string;
  status: 'completed' | 'pending' | 'failed';
  priority: number;
  context: RequestContext;
  message: string;
  codeBlocks?: CodeBlock[] | null;
  result?: Result;
  error?: string | null;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface RequestContext {
  task: string;
  action: string;
  version: string;
  session_id: string;
  [key: string]: unknown;
}

export interface CodeBlock {
  filename: string;
  content: string;
  language: string;
}

export interface Result {
  context: ResultContext;
  outcome: 'completed' | 'failed' | 'pending';
  proposedActions: ProposedAction[];
  fallbackActions: FallbackAction[];
  nextSteps?: NextStep[];
  executingAction?: ExecutingAction;
}

export interface ResultContext {
  tasks: Task[];
  version: string;
  session_id: string;
  execution?: ExecutionContext;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  type: TaskType;
  status: 'in_progress' | 'completed' | 'pending';
  progress: number;
}

export type TaskType = 'analyze' | 'generate' | 'graph' | 'hybrid' | 'fix';

export interface ExecutionContext {
  history: ActionHistoryItem[];
  actionId: string;
  currentActionId: string;
}

export interface ActionHistoryItem {
  actionId: string;
  title: string;
  status: string;
  result?: unknown;
}

export interface ProposedAction {
  actionId: string;
  title: string;
  description: string;
  priority: number;
  matchScore: number;
  subActions: SubAction[];
}

export interface SubAction {
  actionId: string;
  title: string;
  description?: string;
  priority?: number;
  input?: string;
  output?: string;
}

export interface FallbackAction {
  mode: 'auto-ai' | 'task-decomposition';
  title: string;
  description: string;
  fallbackType: 'llm_generation' | 'manual';
}

export interface NextStep {
  actionId: string;
  title: string;
}

export interface ExecutingAction {
  actionId: string;
  title: string;
  description?: string;
  priority?: number;
  dsl?: DSLDefinition;
  dslScript?: string;
}

export interface DSLDefinition {
  input: DSLInput;
  script: string;
}

export interface DSLInput {
  rootDir?: string;
  extensions?: string[];
  [key: string]: unknown;
}

// Типы для конкретных экшенов

// ANALYZE экшены
export interface AnalyzeFullResponse extends BaseResponse {
  data: ResponseData & {
    result: Result & {
      proposedActions: AnalyzeAction[];
    };
  };
}

export interface AnalyzeAction extends ProposedAction {
  subActions: AnalyzeSubAction[];
}

export interface AnalyzeSubAction extends SubAction {
  actionId: 'scan-structure' | 'analyze-dependencies' | 'detect-languages' | 'generate-report';
}

// GENERATE экшены  
export interface GenerateCRUDResponse extends BaseResponse {
  data: ResponseData & {
    result: Result & {
      proposedActions: GenerateAction[];
    };
  };
}

export interface GenerateAction extends ProposedAction {
  subActions: GenerateSubAction[];
}

export interface GenerateSubAction extends SubAction {
  actionId: 'generate-model' | 'generate-migration' | 'generate-controller' | 'generate-routes' | 'generate-requests' | 'generate-resource';
}

// GRAPH экшены
export interface GraphBuildResponse extends BaseResponse {
  data: ResponseData & {
    result: Result & {
      proposedActions: GraphAction[];
    };
  };
}

export interface GraphAction extends ProposedAction {
  subActions: GraphSubAction[];
}

export interface GraphSubAction extends SubAction {
  actionId: 'scan-files' | 'extract-entities' | 'build-relations' | 'save-graph' | 'graph-update' | 'graph-visualize';
}

// HYBRID экшены
export interface HybridFixResponse extends BaseResponse {
  data: ResponseData & {
    result: Result & {
      proposedActions: HybridAction[];
    };
  };
}

export interface HybridAction extends ProposedAction {
  subActions: HybridSubAction[];
}

export interface HybridSubAction extends SubAction {
  actionId: string; // various hybrid action IDs
}

// Маппинг экшенов на типы ответов
export type ActionResponseType = 
  | AnalyzeFullResponse
  | GenerateCRUDResponse
  | GraphBuildResponse
  | HybridFixResponse
  | BaseResponse;

// Функция для определения типа ответа по actionId
export function getResponseType(actionId: string): ActionResponseType {
  if (actionId.startsWith('analyze-')) return {} as AnalyzeFullResponse;
  if (actionId.startsWith('generate-')) return {} as GenerateCRUDResponse;
  if (actionId.startsWith('graph-')) return {} as GraphBuildResponse;
  if (actionId.startsWith('hybrid-')) return {} as HybridFixResponse;
  return {} as BaseResponse;
}
