import { logger } from '../utils/logger.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPMessage {
  method: string;
  params?: any;
  id?: number | string;
}

interface RegisteredServer {
  endpoint: string;
  status: 'connected' | 'error';
}

/**
 * MCPManagerService
 * Manages connections to external MCP servers and discovery of their tools.
 *
 * Реализация по умолчанию использует HTTP JSON‑RPC‑подобный интерфейс:
 * - GET  <endpoint>/tools      → список инструментов
 * - POST <endpoint>/invoke     → вызов инструмента { method, params, id }
 */
export class MCPManagerService {
  private connectedServers: Map<string, RegisteredServer> = new Map();
  private tools: Map<string, { server: string; tool: MCPTool }> = new Map();

  /**
   * Registers an external MCP server and discovers its tools.
   */
  public async registerServer(name: string, endpoint: string): Promise<void> {
    logger.info('MCPManager: Registering server', { name, endpoint });

    const server: RegisteredServer = { endpoint, status: 'connected' };

    try {
      const toolsEndpoint = new URL('/tools', endpoint).toString();
      const res = await fetch(toolsEndpoint, { method: 'GET' });

      if (!res.ok) {
        logger.warn('MCPManager: Tools endpoint returned non-OK status', {
          name,
          endpoint: toolsEndpoint,
          status: res.status,
        });
      } else {
        const discovered = (await res.json()) as MCPTool[] | { tools: MCPTool[] };
        const toolsArray = Array.isArray(discovered)
          ? discovered
          : Array.isArray(discovered.tools)
            ? discovered.tools
            : [];

        for (const tool of toolsArray) {
          this.tools.set(tool.name, { server: name, tool });
        }

        logger.info('MCPManager: Discovered tools', {
          server: name,
          count: toolsArray.length,
        });
      }
    } catch (error) {
      logger.warn('MCPManager: Failed to discover tools, server will still be registered', {
        name,
        endpoint,
        error,
      });
      server.status = 'error';
    }

    this.connectedServers.set(name, server);
  }

  /**
   * Lists all available tools from all registered servers.
   */
  public listTools(): MCPTool[] {
    return Array.from(this.tools.values()).map((t) => t.tool);
  }

  /**
   * Executes a tool via the MCP server using HTTP POST to /invoke.
   * В случае ошибки не валит процесс, а возвращает структурированный результат с error.
   */
  public async executeTool(toolName: string, params: any): Promise<any> {
    const registryEntry = this.tools.get(toolName);
    if (!registryEntry) {
      throw new Error(`Tool ${toolName} not found`);
    }

    const server = this.connectedServers.get(registryEntry.server);
    if (!server) {
      throw new Error(`Server ${registryEntry.server} is not registered`);
    }

    const message: MCPMessage = {
      method: toolName,
      params,
      id: Date.now(),
    };

    const invokeUrl = new URL('/invoke', server.endpoint).toString();

    logger.info('MCPManager: Executing tool', {
      tool: toolName,
      server: registryEntry.server,
      endpoint: invokeUrl,
    });

    try {
      const res = await fetch(invokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!res.ok) {
        logger.warn('MCPManager: Tool execution failed with non-OK status', {
          tool: toolName,
          server: registryEntry.server,
          status: res.status,
        });
        return {
          success: false,
          error: `HTTP ${res.status}`,
          server: registryEntry.server,
          tool: toolName,
        };
      }

      const data = await res.json();
      return data;
    } catch (error) {
      logger.warn('MCPManager: Tool execution failed', {
        tool: toolName,
        server: registryEntry.server,
        error,
      });

      return {
        success: false,
        error: String(error),
        server: registryEntry.server,
        tool: toolName,
      };
    }
  }
}

export const mcpManagerService = new MCPManagerService();
