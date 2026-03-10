/**
 * A2A Client API Server - Main Entry Point
 *
 * Exposes client-side tools (terminal, fs-utils, etc.) via REST API
 * This runs on the client machine to provide local file system and terminal access
 *
 * Uses modular services and routes:
 * - Services: config, projects, sessions, upstream, transforms
 * - Routes: config, sessions, terminal
 */

import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';

// Import services from ./services
import {
    // Config service
    loadConfig,
    saveConfig,
    // Projects service
    loadProjects,
    saveProjects,
    safePath,
    // Session service
    getSessionDir,
    listSessions,
    loadSession,
    findSessionInAllProjects,
    saveSession,
    deleteSession,
    // Upstream service
    serverFetch,
    getServerBaseUrl,
    // Session transforms
    updateSessionWithServerResponse,
    updateSessionWithStatusResponse,
} from './services/index.js';

// Import routes from ./server/routes
import {
    configRoutes,
    sessionsRoutes,
} from './server/routes/index.js';

// Import setupRoutes function separately
import { setupRoutes } from './server/routes/index.js';

// Import WebSocket server manager
import { WebSocketServerManager } from './server/websocket-server.js';

// Re-export services for external use
export {
    // Config
    loadConfig,
    saveConfig,
    // Projects
    loadProjects,
    saveProjects,
    safePath,
    // Sessions
    getSessionDir,
    listSessions,
    loadSession,
    findSessionInAllProjects,
    saveSession,
    deleteSession,
    // Upstream
    serverFetch,
    getServerBaseUrl,
    // Transforms
    updateSessionWithServerResponse,
    updateSessionWithStatusResponse,
};

// Re-export routes
export {
    setupRoutes,
    configRoutes,
    sessionsRoutes,
};

// Express app instance
let app: Application | null = null;
let websocketServer: WebSocketServerManager | null = null;

// WebSocket connections map (for broadcasting)
export const wsConnections = new Map<string, Set<any>>();

/**
 * Create and configure Express application
 */
export function createApp(): Application {
    const expressApp = express();

    // CORS middleware
    expressApp.use(cors());

    // JSON middleware
    expressApp.use(express.json({ limit: '50mb' }));

    // Logging middleware
    expressApp.use((req: Request, res: Response, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });

    // Setup routes using the modular setupRoutes function
    expressApp.use(setupRoutes({
        prefix: '/api/v1',
        enableAuth: true,
        enableSessionValidation: true,
    }));

    // Health check (redundant with routes, but ensures it's always available)
    expressApp.get('/health', (req: Request, res: Response) => {
        res.json({
            status: 'ok',
            service: 'a2a-client-api',
            timestamp: new Date().toISOString(),
        });
    });

    return expressApp;
}

/**
 * Initialize WebSocket server
 */
export function initWebSocketServer(port: number = 3002): WebSocketServerManager {
    websocketServer = new WebSocketServerManager();
    return websocketServer;
}

/**
 * Start the server
 */
export function startServer(options?: {
    port?: number;
    host?: string;
    enableWebSocket?: boolean;
}): { app: Application; websocketServer?: WebSocketServerManager } {
    const port = options?.port || Number(process.env.PORT) || 3001;
    const host = options?.host || process.env.HOST || 'localhost';
    const enableWebSocket = options?.enableWebSocket !== false;

    // Create Express app
    app = createApp();

    // Initialize WebSocket if enabled
    if (enableWebSocket) {
        websocketServer = initWebSocketServer();
    }

    // Start listening
    app.listen(port, host, () => {
        console.log(`A2A Client API Server started on http://${host}:${port}`);
        console.log(`Health check: http://${host}:${port}/health`);
        console.log(`API info: http://${host}:${port}/api`);

        if (websocketServer) {
            const wsInfo = websocketServer.getServerInfo();
            console.log(`WebSocket Server: ${wsInfo.wsUrl}`);
        }
    });

    return { app, websocketServer: websocketServer || undefined };
}

/**
 * Get the current app instance
 */
export function getApp(): Application | null {
    return app;
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServerManager | null {
    return websocketServer;
}

// Export wsConnections for external use (e.g., WebSocket message handlers)
export { wsConnections as connectionsMap };

// Default export for convenience
export default {
    // Services
    loadConfig,
    saveConfig,
    loadProjects,
    saveProjects,
    safePath,
    getSessionDir,
    listSessions,
    loadSession,
    findSessionInAllProjects,
    saveSession,
    deleteSession,
    serverFetch,
    getServerBaseUrl,
    updateSessionWithServerResponse,
    updateSessionWithStatusResponse,
    // Routes
    setupRoutes,
    configRoutes,
    sessionsRoutes,
    // App functions
    createApp,
    initWebSocketServer,
    startServer,
    getApp,
    getWebSocketServer,
};
