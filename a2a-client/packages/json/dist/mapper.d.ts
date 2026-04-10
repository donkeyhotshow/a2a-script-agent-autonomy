/**
 * @a2a/json - VueFlow Mapper
 * Converts UnifiedResponse to VueFlow nodes and edges
 *
 * `result.actionId` here is an internal VueFlow correlation id (progress/completed node wiring),
 * not the A2A protocol `execute` action key nor `result.choice`. See packages/json/README.md.
 */
import type { UnifiedResponse, VueFlowNode } from './types.js';
/**
 * Reset node counter (useful for testing)
 */
export declare function resetNodeCounter(): void;
/**
 * Convert UnifiedResponse to VueFlow nodes
 * @param response - UnifiedResponse from server
 * @returns Array of VueFlow nodes
 */
export declare function convertToVueFlowNodes(response: UnifiedResponse): VueFlowNode[];
//# sourceMappingURL=mapper.d.ts.map