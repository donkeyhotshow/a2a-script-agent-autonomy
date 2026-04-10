import 'express-async-errors';
import express, {Express, Request, Response} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import {requestLogger} from './utils/logger.js';
import {errorHandler} from './middleware/error.middleware.js';
import {registryAuth} from './middleware/registry-auth.middleware.js';
import routes from './routes/index.js';
import sessionsRouter from './routes/sessions.routes.js';
import {register} from './utils/metrics.js';
import registryRegisterRouter from './registry/register.js';
import registryRouteRouter from './registry/route.js';
import registryHealthRouter from './registry/health.js';
import toolsEvolveRouter from './api/tools-evolve.js';

const app: Express = express();

app.use(helmet({contentSecurityPolicy: false, crossOriginEmbedderPolicy: false}));
const corsOptions = {
  origin: process.env.NODE_ENV !== 'production' || process.env.CORS_PERMISSIVE === '1' ? true : process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false,
  credentials: true
};
app.use(cors(corsOptions));
app.use(compression());
const bodyLimit = process.env.BODY_LIMIT || '1mb';
app.use(express.json({limit: bodyLimit}));
app.use(express.urlencoded({extended: true, limit: bodyLimit}));

app.use(requestLogger);

app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        mode: 'stateless',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
    });
});

// Prometheus metrics endpoint - Protected by registry authentication
// Accessible when SKIP_AUTH is enabled (development) OR valid X-Registry-Token header is provided
app.get('/metrics', registryAuth, async (_req: Request, res: Response) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(String(err));
    }
});

app.use('/api/v1', routes);
app.use('/api/a2a/sessions', sessionsRouter);
app.use('/api/registry/register', registryAuth, registryRegisterRouter);
app.use('/api/registry/route', registryAuth, registryRouteRouter);
app.use('/api/registry', registryAuth, registryHealthRouter);
app.use('/api/tools', toolsEvolveRouter);

app.use((_req: Request, res: Response) => {
    res.status(404).json({success: false, error: {code: 'NOT_FOUND', message: 'Not found'}});
});

app.use(errorHandler);

export default app;
