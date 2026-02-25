#!/usr/bin/env node

/**
 * server-wrapper-simple.cjs
 *
 * Simplified MCP server wrapper for production use.
 * Provides maximum reliability with minimum complexity.
 *
 * Features:
 * - ✅ Simple stdin/stdout proxy
 * - ✅ Filters only valid JSON-RPC from stdout
 * - ✅ No heartbeat timeouts that kill the server
 * - ✅ Minimal logic for maximum reliability
 */

const { spawn } = require('child_process');
const path = require('path');

// Get the path to the MCP server
const serverPath = path.join(__dirname, '..', '..', 'mcp-server.cjs');

// Start the MCP server as a child process
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: path.dirname(serverPath)
});

// Proxy stdin to child process
process.stdin.pipe(server.stdin);

// Filter and proxy stdout - only valid JSON-RPC messages
server.stdout.on('data', (data) => {
  const output = data.toString();

  // Split by lines and filter for JSON-RPC messages
  const lines = output.split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(line.trim());

      // Check if it's a valid JSON-RPC message (request, response, or error)
      if (parsed.jsonrpc === '2.0' && ('id' in parsed || parsed.method)) {
        process.stdout.write(line + '\n');
      }
      // Ignore other output (debug messages, etc.)
    } catch (e) {
      // Not valid JSON, ignore it
    }
  }
});

// Handle server process events
server.on('error', (error) => {
  console.error(`Server wrapper error: ${error.message}`);
  process.exit(1);
});

server.on('exit', (code, signal) => {
  console.error(`MCP server exited with code ${code}, signal ${signal}`);
  process.exit(code || 1);
});

// Handle wrapper process termination
process.on('SIGINT', () => {
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});

// Log startup
console.error(`Server wrapper started, launching: ${serverPath}`);
