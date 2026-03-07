import express, {Express, Request, Response, NextFunction} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import {logger, requestLogger} from './utils/logger.js';
import {errorHandler} from './middleware/error.middleware.js';
import routes from './routes/index.js';

const app: Express = express();

app.use(helmet({contentSecurityPolicy: false, crossOriginEmbedderPolicy: false}));
app.use(cors({origin: true, credentials: true}));
app.use(compression());
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended: true, limit: '10mb'}));

app.use(requestLogger);

app.get('/health', (_req: Request, res: Response) => {
    res.json({status: 'ok', timestamp: new Date().toISOString(), version: process.env.npm_package_version || '1.0.0'});
});

app.use('/api/v1', routes);

app.use((_req: Request, res: Response) => {
    res.status(404).json({success: false, error: {code: 'NOT_FOUND', message: 'Not found'}});
});

app.use(errorHandler);

export default app;
