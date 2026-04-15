/**
 * Action Handler: mcp-call — ADR-ClawCode-Orchestration §14.2
 *
 * Executes a tool call against a running MCP (Model Context Protocol) server
 * over JSON-RPC / stdio transport without hard-coding individual adapters.
 *
 * Action-Key Shape:
 *   { "execute": { "mcp-call": { "server": "...", "tool": "...", "arguments": {...} } } }
 *
 * The handler resolves the server's stdio command from the MCP_SERVERS environment
 * variable (JSON map of server-name → command array) or from the optional
 * `serverCommand` field supplied directly in the action payload (useful in tests).
 *
 * Example env:
 *   MCP_SERVERS={"google-search-server":["npx","-y","@modelcontextprotocol/server-google-search"]}
 */

import { spawn } from 'node:child_process';
import { logger } from '@a2a/server-utils/logger';

// ── Input / Output types ──────────────────────────────────────────────────────

export interface McpCallInput {
  /** Registered server name (key in MCP_SERVERS registry) */
  server: string;
  /** MCP tool name to invoke */
  tool: string;
  /** Arguments forwarded to the MCP tool */
  arguments?: Record<string, unknown>;
  /**
   * Optional command override — array of [binary, ...args].
   * When supplied, takes precedence over the MCP_SERVERS registry.
   * Intended for tests and local overrides.
   */
  serverCommand?: string[];
  /** Timeout in milliseconds (default: 30 000) */
  timeout?: number;
}

export interface McpCallOutput {
  success: boolean;
  server: string;
  tool: string;
  /** Raw content array returned by the MCP tool (spec §5.2) */
  content?: McpContent[];
  /** Error message when success = false */
  error?: string;
  /** Duration of the call in milliseconds */
  durationMs?: number;
}

/** MCP content block — text or embedded resource */
export interface McpContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
}

// ── MCP JSON-RPC message shapes ───────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    content?: McpContent[];
    [key: string]: unknown;
  };
  error?: { code: number; message: string };
}

// ── Server registry ───────────────────────────────────────────────────────────

function resolveServerCommand(serverName: string): string[] | null {
  const raw = process.env['MCP_SERVERS'];
  if (!raw) return null;
  try {
    const registry = JSON.parse(raw) as Record<string, string[]>;
    return registry[serverName] ?? null;
  } catch (err: unknown) {
    logger.warn('[mcp-call] MCP_SERVERS env is not valid JSON', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ── Core handler ──────────────────────────────────────────────────────────────

/**
 * Execute a tool call against a stdio-transport MCP server.
 *
 * Protocol:
 *  1. Spawn the server process.
 *  2. Send JSON-RPC `initialize` → await `initialized` notification (or first valid response).
 *  3. Send JSON-RPC `tools/call` with the requested tool and arguments.
 *  4. Return the `content` array from the response.
 *  5. Kill the server process.
 */
export async function executeMcpCall(input: McpCallInput): Promise<McpCallOutput> {
  const start = Date.now();
  const timeout = input.timeout ?? 30_000;

  const command =
    input.serverCommand ?? resolveServerCommand(input.server);

  if (!command || command.length === 0) {
    return {
      success: false,
      server: input.server,
      tool: input.tool,
      error: `No command found for MCP server '${input.server}'. Set MCP_SERVERS env or supply serverCommand.`,
    };
  }

  const [bin, ...args] = command;
  if (!bin) {
    return {
      success: false,
      server: input.server,
      tool: input.tool,
      error: `MCP server command for '${input.server}' is an empty array`,
    };
  }
  logger.info(`[mcp-call] Spawning server '${input.server}': ${bin} ${args.join(' ')}`);

  return new Promise<McpCallOutput>((resolve) => {
    const proc = spawn(bin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buffer = '';
    let initDone = false;
    let requestId = 1;

    const done = (output: McpCallOutput): void => {
      proc.kill();
      resolve({ ...output, durationMs: Date.now() - start });
    };

    const timer = setTimeout(() => {
      done({
        success: false,
        server: input.server,
        tool: input.tool,
        error: `MCP call timed out after ${timeout}ms`,
      });
    }, timeout);

    proc.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let msg: JsonRpcResponse;
        try {
          msg = JSON.parse(trimmed) as JsonRpcResponse;
        } catch (err: unknown) {
          if (trimmed.startsWith('{')) {
            logger.debug('[mcp-call] JSON-RPC line looked like JSON but failed to parse', {
              preview: trimmed.slice(0, 200),
              error: err instanceof Error ? err.message : String(err),
            });
          }
          continue;
        }

        if (!initDone) {
          // Server responded to initialize — now send tools/call
          initDone = true;
          const callReq: JsonRpcRequest = {
            jsonrpc: '2.0',
            id: ++requestId,
            method: 'tools/call',
            params: {
              name: input.tool,
              arguments: input.arguments ?? {},
            },
          };
          proc.stdin?.write(JSON.stringify(callReq) + '\n');
          continue;
        }

        if (msg.id === requestId) {
          clearTimeout(timer);
          if (msg.error) {
            done({
              success: false,
              server: input.server,
              tool: input.tool,
              error: `MCP error ${msg.error.code}: ${msg.error.message}`,
            });
          } else {
            done({
              success: true,
              server: input.server,
              tool: input.tool,
              content: msg.result?.['content'] as McpContent[] | undefined,
            });
          }
        }
      }
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      logger.debug(`[mcp-call] stderr: ${chunk.toString('utf8').trim()}`);
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      done({
        success: false,
        server: input.server,
        tool: input.tool,
        error: `Failed to spawn MCP server: ${err.message}`,
      });
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null) {
        done({
          success: false,
          server: input.server,
          tool: input.tool,
          error: `MCP server exited with code ${code}`,
        });
      }
    });

    // Send initialize request
    const initReq: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'a2a-agent', version: '1.0' },
      },
    };
    proc.stdin?.write(JSON.stringify(initReq) + '\n');
  });
}
