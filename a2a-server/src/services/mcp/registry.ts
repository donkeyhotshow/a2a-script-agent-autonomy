import { logger } from '../../utils/logger.js';

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

// Seed with default tools (placeholder for the 28 tools)
globalMcpRegistry.registerTool({
  name: 'code_search',
  description: 'Search for code patterns in the repository',
  parameters: { query: 'string' },
  execute: async (args) => {
    // Implementation would go here
    return { results: [], count: 0 };
  }
});
