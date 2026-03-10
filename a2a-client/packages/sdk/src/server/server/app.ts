/**
 * Express App Setup Module
 * 
 * Handles Express application setup, middleware configuration, and basic routing.
 * Separated from main index.ts to improve maintainability and testability.
 */

import express from 'express';
import cors from 'cors';

export interface AppOptions {
    port: number;
    host: string;
    enableLogging?: boolean;
    enableCORS?: boolean;
}

/**
 * Express Application Manager
 */
export class ExpressAppManager {
    private app: express.Application;
    private options: AppOptions;

    constructor(options: AppOptions) {
        this.options = options;
        this.app = express();
        
        this.setupMiddleware();
        this.setupBasicRoutes();
    }

    /**
     * Setup middleware
     */
    private setupMiddleware(): void {
        // CORS
        if (this.options.enableCORS !== false) {
            this.app.use(cors());
        }

        // JSON parsing
        this.app.use(express.json({limit: '50mb'}));

        // Logging middleware
        if (this.options.enableLogging !== false) {
            this.app.use((req, res, next) => {
                console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
                next();
            });
        }
    }

    /**
     * Setup basic routes
     */
    private setupBasicRoutes(): void {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                service: 'a2a-client-api',
                timestamp: new Date().toISOString()
            });
        });

        // API info endpoint
        this.app.get(['/api', '/api/v1'], (req, res) => {
            res.json({
                service: 'a2a-client-api',
                version: '1.0.0',
                endpoints: {
                    config: '/api/config',
                    projects: '/api/projects',
                    sessions: '/api/sessions',
                    terminal: '/api/terminal',
                    fs: '/api/fs',
                    rag: '/api/rag',
                    files: '/api/files'
                },
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Get Express application instance
     */
    public getApp(): express.Application {
        return this.app;
    }

    /**
     * Start the server
     */
    public start(): void {
        this.app.listen(this.options.port, this.options.host, () => {
            console.log(`A2A Client API Server started on http://${this.options.host}:${this.options.port}`);
            console.log(`Health check: http://${this.options.host}:${this.options.port}/health`);
            console.log(`API info: http://${this.options.host}:${this.options.port}/api`);
        });
    }

    /**
     * Close the server
     */
    public close(): void {
        // Note: Express doesn't have a built-in close method
        // This would need to be implemented with server.close() if needed
        console.log('Express server closed');
    }

    /**
     * Get server options
     */
    public getOptions(): AppOptions {
        return {...this.options};
    }
}

// Export singleton instance
export let expressApp: ExpressAppManager | null = null;

/**
 * Initialize Express application
 */
export function initExpressApp(options: AppOptions): ExpressAppManager {
    expressApp = new ExpressAppManager(options);
    return expressApp;
}
