"use strict";
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
Object.defineProperty(exports, "__esModule", {value: true});
exports.VERSION = exports.getNodeTypeIcon = exports.getStatusColor = exports.resetNodeCounter = exports.convertToVueFlowGraph = exports.convertToVueFlowEdges = exports.convertToVueFlowNodes = exports.unifiedResponseSchema = exports.actionErrorResponseSchema = exports.actionErrorResultSchema = exports.actionErrorSchema = exports.actionCompletedResponseSchema = exports.actionCompletedResultSchema = exports.actionProgressResponseSchema = exports.actionProgressResultSchema = exports.actionExecutingResponseSchema = exports.actionExecutingResultSchema = exports.actionProposalResponseSchema = exports.actionProposalResultSchema = exports.fallbackActionSchema = exports.actionSchema = exports.contextBlockSchema = exports.protocolErrorSchema = exports.taskSchema = exports.baseResponseSchema = exports.isUnifiedResponse = exports.getResponseType = exports.validateResponseType = exports.validateResponse = exports.extractSummary = exports.extractActionId = exports.isActionErrorResponse = exports.isActionCompletedResponse = exports.isActionProgressResponse = exports.isActionExecutingResponse = exports.isActionProposalResponse = exports.isResponseType = exports.detectResponseType = exports.parseResponseString = exports.parseResponse = void 0;
// ============================================
// Parser
// ============================================
var parser_js_1 = require("./parser.js");
Object.defineProperty(exports, "parseResponse", {
    enumerable: true, get: function () {
        return parser_js_1.parseResponse;
    }
});
Object.defineProperty(exports, "parseResponseString", {
    enumerable: true, get: function () {
        return parser_js_1.parseResponseString;
    }
});
Object.defineProperty(exports, "detectResponseType", {
    enumerable: true, get: function () {
        return parser_js_1.detectResponseType;
    }
});
Object.defineProperty(exports, "isResponseType", {
    enumerable: true, get: function () {
        return parser_js_1.isResponseType;
    }
});
Object.defineProperty(exports, "isActionProposalResponse", {
    enumerable: true, get: function () {
        return parser_js_1.isActionProposalResponse;
    }
});
Object.defineProperty(exports, "isActionExecutingResponse", {
    enumerable: true, get: function () {
        return parser_js_1.isActionExecutingResponse;
    }
});
Object.defineProperty(exports, "isActionProgressResponse", {
    enumerable: true, get: function () {
        return parser_js_1.isActionProgressResponse;
    }
});
Object.defineProperty(exports, "isActionCompletedResponse", {
    enumerable: true, get: function () {
        return parser_js_1.isActionCompletedResponse;
    }
});
Object.defineProperty(exports, "isActionErrorResponse", {
    enumerable: true, get: function () {
        return parser_js_1.isActionErrorResponse;
    }
});
Object.defineProperty(exports, "extractActionId", {
    enumerable: true, get: function () {
        return parser_js_1.extractActionId;
    }
});
Object.defineProperty(exports, "extractSummary", {
    enumerable: true, get: function () {
        return parser_js_1.extractSummary;
    }
});
// ============================================
// Validator
// ============================================
var validator_js_1 = require("./validator.js");
Object.defineProperty(exports, "validateResponse", {
    enumerable: true, get: function () {
        return validator_js_1.validateResponse;
    }
});
Object.defineProperty(exports, "validateResponseType", {
    enumerable: true, get: function () {
        return validator_js_1.validateResponseType;
    }
});
Object.defineProperty(exports, "getResponseType", {
    enumerable: true, get: function () {
        return validator_js_1.getResponseType;
    }
});
Object.defineProperty(exports, "isUnifiedResponse", {
    enumerable: true, get: function () {
        return validator_js_1.isUnifiedResponse;
    }
});
// Re-export Zod schemas for advanced usage
var validator_js_2 = require("./validator.js");
Object.defineProperty(exports, "baseResponseSchema", {
    enumerable: true, get: function () {
        return validator_js_2.baseResponseSchema;
    }
});
Object.defineProperty(exports, "taskSchema", {
    enumerable: true, get: function () {
        return validator_js_2.taskSchema;
    }
});
Object.defineProperty(exports, "protocolErrorSchema", {
    enumerable: true, get: function () {
        return validator_js_2.protocolErrorSchema;
    }
});
Object.defineProperty(exports, "contextBlockSchema", {
    enumerable: true, get: function () {
        return validator_js_2.contextBlockSchema;
    }
});
Object.defineProperty(exports, "actionSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionSchema;
    }
});
Object.defineProperty(exports, "fallbackActionSchema", {
    enumerable: true, get: function () {
        return validator_js_2.fallbackActionSchema;
    }
});
Object.defineProperty(exports, "actionProposalResultSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionProposalResultSchema;
    }
});
Object.defineProperty(exports, "actionProposalResponseSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionProposalResponseSchema;
    }
});
Object.defineProperty(exports, "actionExecutingResultSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionExecutingResultSchema;
    }
});
Object.defineProperty(exports, "actionExecutingResponseSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionExecutingResponseSchema;
    }
});
Object.defineProperty(exports, "actionProgressResultSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionProgressResultSchema;
    }
});
Object.defineProperty(exports, "actionProgressResponseSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionProgressResponseSchema;
    }
});
Object.defineProperty(exports, "actionCompletedResultSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionCompletedResultSchema;
    }
});
Object.defineProperty(exports, "actionCompletedResponseSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionCompletedResponseSchema;
    }
});
Object.defineProperty(exports, "actionErrorSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionErrorSchema;
    }
});
Object.defineProperty(exports, "actionErrorResultSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionErrorResultSchema;
    }
});
Object.defineProperty(exports, "actionErrorResponseSchema", {
    enumerable: true, get: function () {
        return validator_js_2.actionErrorResponseSchema;
    }
});
Object.defineProperty(exports, "unifiedResponseSchema", {
    enumerable: true, get: function () {
        return validator_js_2.unifiedResponseSchema;
    }
});
// ============================================
// Mapper (VueFlow)
// ============================================
var mapper_js_1 = require("./mapper.js");
Object.defineProperty(exports, "convertToVueFlowNodes", {
    enumerable: true, get: function () {
        return mapper_js_1.convertToVueFlowNodes;
    }
});
Object.defineProperty(exports, "convertToVueFlowEdges", {
    enumerable: true, get: function () {
        return mapper_js_1.convertToVueFlowEdges;
    }
});
Object.defineProperty(exports, "convertToVueFlowGraph", {
    enumerable: true, get: function () {
        return mapper_js_1.convertToVueFlowGraph;
    }
});
Object.defineProperty(exports, "resetNodeCounter", {
    enumerable: true, get: function () {
        return mapper_js_1.resetNodeCounter;
    }
});
Object.defineProperty(exports, "getStatusColor", {
    enumerable: true, get: function () {
        return mapper_js_1.getStatusColor;
    }
});
Object.defineProperty(exports, "getNodeTypeIcon", {
    enumerable: true, get: function () {
        return mapper_js_1.getNodeTypeIcon;
    }
});
// ============================================
// Version
// ============================================
exports.VERSION = '1.0.0';
