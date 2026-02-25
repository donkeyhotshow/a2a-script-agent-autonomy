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
export type { TaskType, TaskStatus, ProtocolError, Task, ContextBlock, ResponseType, BaseResponse, Action, FallbackAction, ActionProposalResult, ActionProposalResponse, ExecutingAction, NextStep, ActionExecutingResult, ActionExecutingResponse, ActionProgressResult, ActionProgressResponse, ActionCompletedResult, ActionCompletedResponse, ActionError, ActionErrorResult, ActionErrorResponse, UnifiedResponse, VueFlowNode, VueFlowEdge, ParsedResponse, ValidationResult, } from './types.js';
export { parseResponse, parseResponseString, detectResponseType, isResponseType, isActionProposalResponse, isActionExecutingResponse, isActionProgressResponse, isActionCompletedResponse, isActionErrorResponse, extractActionId, extractSummary, } from './parser.js';
export type { ParseOptions } from './parser.js';
export { validateResponse, validateResponseType, getResponseType, isUnifiedResponse, } from './validator.js';
export { baseResponseSchema, taskSchema, protocolErrorSchema, contextBlockSchema, actionSchema, fallbackActionSchema, actionProposalResultSchema, actionProposalResponseSchema, actionExecutingResultSchema, actionExecutingResponseSchema, actionProgressResultSchema, actionProgressResponseSchema, actionCompletedResultSchema, actionCompletedResponseSchema, actionErrorSchema, actionErrorResultSchema, actionErrorResponseSchema, unifiedResponseSchema, } from './validator.js';
export { convertToVueFlowNodes, convertToVueFlowEdges, convertToVueFlowGraph, resetNodeCounter, getStatusColor, getNodeTypeIcon, } from './mapper.js';
export declare const VERSION = "1.0.0";
//# sourceMappingURL=index.d.ts.map