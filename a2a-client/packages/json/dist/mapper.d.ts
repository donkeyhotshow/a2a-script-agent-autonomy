/**
 * @a2a/json - VueFlow Mapper
 * Converts UnifiedResponse to VueFlow nodes and edges
 */
import type { UnifiedResponse, VueFlowNode, VueFlowEdge } from './types.js';
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
/**
 * Convert UnifiedResponse to VueFlow edges
 * @param response - UnifiedResponse from server
 * @param nodes - Previously created nodes (to get IDs)
 * @returns Array of VueFlow edges
 */
export declare function convertToVueFlowEdges(response: UnifiedResponse, nodes?: VueFlowNode[]): VueFlowEdge[];
/**
 * Convert full UnifiedResponse to VueFlow graph (nodes + edges)
 * @param response - UnifiedResponse from server
 * @returns Object with nodes and edges arrays
 */
export declare function convertToVueFlowGraph(response: UnifiedResponse): {
    nodes: VueFlowNode[];
    edges: VueFlowEdge[];
};
/**
 * Get node status color for styling
 * @param status - Node status
 * @returns Color hex code
 */
export declare function getStatusColor(status: string): string;
/**
 * Get node type icon for display
 * @param nodeType - VueFlow node type
 * @returns Icon identifier
 */
export declare function getNodeTypeIcon(nodeType: string): string;
//# sourceMappingURL=mapper.d.ts.map