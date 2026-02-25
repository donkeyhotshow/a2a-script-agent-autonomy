class ToolsListHandler {
    constructor(server) {
        this.server = server;
    }

    handleInitialize(id, params) {
        console.log('MCP Server: Handling initialize request');

        return {
            jsonrpc: '2.0',
            id,
            result: {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {
                        listChanged: true
                    },
                    sampling: {}
                },
                serverInfo: {
                    name: 'mcp-terminal-server',
                    version: '2.0.0',
                    description: 'MCP Terminal Server with comprehensive terminal, file, search, atomic, and archive operations'
                }
            }
        };
    }

    handleToolsList(id) {
        return this.server.handleToolsList(id);
    }
}

module.exports = {ToolsListHandler};















