import 'express-async-errors';
import express, {Express, Request, Response} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import {requestLogger} from './utils/logger.js';
import {errorHandler} from './middleware/error.middleware.js';
import routes from './routes/index.js';
import sessionsRouter from './routes/sessions.routes.js';
import {register} from './utils/metrics.js';
import registryRegisterRouter from './api/registry/register.js';
import registryRouteRouter from './api/registry/route.js';
import registryHealthRouter from './api/registry/health.js';
import toolsEvolveRouter from './api/tools-evolve.js';

const app: Express = express();

app.use(helmet({contentSecurityPolicy: false, crossOriginEmbedderPolicy: false}));
app.use(cors({origin: true, credentials: true}));
app.use(compression());
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended: true, limit: '10mb'}));

app.use(requestLogger);

app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        mode: 'stateless',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
    });
});

// Prometheus metrics endpoint
app.get('/metrics', async (_req: Request, res: Response) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(String(err));
    }
});

app.use('/api/v1', routes);
app.use('/api/a2a/sessions', sessionsRouter);
app.use('/api/registry/register', registryRegisterRouter);
app.use('/api/registry/route', registryRouteRouter);
app.use('/api/registry', registryHealthRouter);
app.use('/api/tools', toolsEvolveRouter);

app.use((_req: Request, res: Response) => {
    res.status(404).json({success: false, error: {code: 'NOT_FOUND', message: 'Not found'}});
});

app.use(errorHandler);

export default app;
