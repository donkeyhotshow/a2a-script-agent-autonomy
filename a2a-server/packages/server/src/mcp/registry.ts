import { logger } from '@a2a/server-utils/logger';
import { contextDiscoveryService } from '../../../features/src/gray-room/components/context/context-discovery.service.js';

/**
 * MCP 28-Tool Registry (ADR-0075)
 * Central store for MCP-compatible tools.
 */
export interface McpTool {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<any>;
}

export class McpRegistry {
  private static instance: McpRegistry;
  private tools = new Map<string, McpTool>();

  private constructor() {}

  static getInstance(): McpRegistry {
    if (!McpRegistry.instance) {
      McpRegistry.instance = new McpRegistry();
    }
    return McpRegistry.instance;
  }

  registerTool(tool: McpTool) {
    logger.info('[McpRegistry] Registering tool', { name: tool.name });
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): McpTool | undefined {
    return this.tools.get(name);
  }

  listTools(): McpTool[] {
    return Array.from(this.tools.values());
  }

  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    logger.info('[McpRegistry] Executing tool', { name, args });
    return await tool.execute(args);
  }
}

export const globalMcpRegistry = McpRegistry.getInstance();

// ADR-0094: JIT Context Search tool
globalMcpRegistry.registerTool({
  name: 'context_search',
  description: 'Search for code patterns, symbols, and keywords in the repository (JIT Context)',
  parameters: { query: 'string' },
  execute: async (args) => {
    const rootPath = process.cwd();
    const results = await contextDiscoveryService.searchSymbols(args.query, rootPath);
    return { results, count: results.length };
  }
});
