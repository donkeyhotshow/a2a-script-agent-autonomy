import { logger } from '@a2a/server-utils/logger';

export interface McpTool {
  name: string;
  execute(input: unknown): Promise<unknown>;
}

class McpRegistry {
  private tools = new Map<string, McpTool>();

  register(tool: McpTool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): McpTool | undefined {
    return this.tools.get(name);
  }

  listTools(): string[] {
    return [...this.tools.keys()];
  }
}

export const globalMcpRegistry = new McpRegistry();
