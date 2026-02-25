/**
 * @a2a/json - Unified JSON Parser for A2A Protocol
 * 
 * A package for parsing, validating and converting server responses
 * to VueFlow-compatible nodes and edges.
 * 
 * @example
 * ```typescript
 * import { parseResponse, convertToVueFlowGraph } from '@a2a/json';
 * 
 * // Parse server response
 * const parsed = parseResponse(jsonData);
 * 
 * // Convert to VueFlow
 * const { nodes, edges } = convertToVueFlowGraph(parsed.data);
 * ```
 */

// ============================================
// Types
// ============================================

// Re-export all types
export type {
  // Task types
  TaskType,
  TaskStatus,
  ProtocolError,
  Task,
  
  // Context
  ContextBlock,
  
  // Response types
  ResponseType,
  BaseResponse,
  
  // Action types
  Action,
  FallbackAction,
  ActionProposalResult,
  ActionProposalResponse,
  ExecutingAction,
  NextStep,
  ActionExecutingResult,
  ActionExecutingResponse,
  ActionProgressResult,
  ActionProgressResponse,
  ActionCompletedResult,
  ActionCompletedResponse,
  ActionError,
  ActionErrorResult,
  ActionErrorResponse,
  
  // Unified response
  UnifiedResponse,
  
  // VueFlow types
  VueFlowNode,
  VueFlowEdge,
  
  // Parsed response
  ParsedResponse,
  
  // Validation
  ValidationResult,
} from './types.js';

// ============================================
// Parser
// ============================================

export {
  parseResponse,
  parseResponseString,
  detectResponseType,
  isResponseType,
  isActionProposalResponse,
  isActionExecutingResponse,
  isActionProgressResponse,
  isActionCompletedResponse,
  isActionErrorResponse,
  extractActionId,
  extractSummary,
} from './parser.js';

export type { ParseOptions } from './parser.js';

// ============================================
// Validator
// ============================================

export {
  validateResponse,
  validateResponseType,
  getResponseType,
  isUnifiedResponse,
} from './validator.js';

// Re-export Zod schemas for advanced usage
export {
  baseResponseSchema,
  taskSchema,
  protocolErrorSchema,
  contextBlockSchema,
  actionSchema,
  fallbackActionSchema,
  actionProposalResultSchema,
  actionProposalResponseSchema,
  actionExecutingResultSchema,
  actionExecutingResponseSchema,
  actionProgressResultSchema,
  actionProgressResponseSchema,
  actionCompletedResultSchema,
  actionCompletedResponseSchema,
  actionErrorSchema,
  actionErrorResultSchema,
  actionErrorResponseSchema,
  unifiedResponseSchema,
} from './validator.js';

// ============================================
// Mapper (VueFlow)
// ============================================

export {
  convertToVueFlowNodes,
  convertToVueFlowEdges,
  convertToVueFlowGraph,
  resetNodeCounter,
  getStatusColor,
  getNodeTypeIcon,
} from './mapper.js';

// ============================================
// Version
// ============================================

export const VERSION = '1.0.0';
