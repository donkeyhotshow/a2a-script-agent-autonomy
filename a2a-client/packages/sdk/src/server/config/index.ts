/**
 * Lightweight configuration provider for the API server.
 *
 * Keeps defaults close to how the service is started and still allows overriding
 * via environment variables for easier testing / runtime configuration.
 */

const toBoolean = (env: string | undefined, fallback: boolean): boolean => {
    if (env === undefined) return fallback;
    const normalized = env.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const toNumber = (env: string | undefined, fallback: number): number => {
    if (!env) return fallback;
    const parsed = Number(env);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringArray = (env: string | undefined, fallback: string[]): string[] => {
    if (!env) return fallback;
    return env.split(',').map((entry) => entry.trim()).filter(Boolean);
};

const PORT = toNumber(process.env.PORT, 3001);
const HOST = process.env.HOST || 'localhost';

export interface ApiServerConfig {
    port: number;
    host: string;
    enableLogging: boolean;
    enableCORS: boolean;
    skipAuth: boolean;

    websocketPort: number;
    websocketHost: string;
    websocketPingInterval: number;

    clientApiPort: number;
    clientApiHost: string;
    enableDebug: boolean;

    sessionTimeout: number;
    maxConnectionsPerSession: number;

    defaultProjectPath: string;
    maxFileSize: number;
    allowedFileExtensions: string[];

    terminalMaxHistory: number;
    terminalDefaultShell: string;
    terminalEnableLogging: boolean;

    ragMaxResults: number;
    ragChunkSize: number;
    ragOverlapSize: number;

    fsMaxReadSize: number;
    fsMaxWriteSize: number;
    fsEnableLogging: boolean;

    apiVersion: string;
    enableRateLimit: boolean;
    rateLimitWindow: number;
    rateLimitMax: number;

    defaultSyncMode: boolean;
}

export const config: ApiServerConfig = {
    port: PORT,
    host: HOST,
    enableLogging: toBoolean(process.env.ENABLE_LOGGING, true),
    enableCORS: toBoolean(process.env.ENABLE_CORS, true),
    skipAuth: toBoolean(process.env.SKIP_AUTH, false),

    websocketPort: toNumber(process.env.WS_PORT, 3002),
    websocketHost: process.env.WS_HOST || HOST,
    websocketPingInterval: toNumber(process.env.WS_PING_INTERVAL_MS, 30000),

    clientApiPort: PORT,
    clientApiHost: process.env.CLIENT_API_HOST || HOST,
    enableDebug: toBoolean(process.env.CLIENT_ENABLE_DEBUG, false),

    sessionTimeout: toNumber(process.env.SESSION_TIMEOUT_MS, 10 * 60 * 1000),
    maxConnectionsPerSession: toNumber(process.env.MAX_CONNECTIONS_PER_SESSION, 5),

    defaultProjectPath: process.env.DEFAULT_PROJECT_PATH || process.cwd(),
    maxFileSize: toNumber(process.env.MAX_FILE_SIZE, 10 * 1024 * 1024),
    allowedFileExtensions: toStringArray(
        process.env.ALLOWED_FILE_EXTENSIONS,
        ['.txt', '.md', '.json', '.js', '.ts', '.html', '.css']
    ),

    terminalMaxHistory: toNumber(process.env.TERMINAL_MAX_HISTORY, 100),
    terminalDefaultShell: process.env.TERMINAL_DEFAULT_SHELL || (process.platform === 'win32' ? 'powershell' : 'bash'),
    terminalEnableLogging: toBoolean(process.env.TERMINAL_ENABLE_LOGGING, true),

    ragMaxResults: toNumber(process.env.RAG_MAX_RESULTS, 10),
    ragChunkSize: toNumber(process.env.RAG_CHUNK_SIZE, 1024),
    ragOverlapSize: toNumber(process.env.RAG_OVERLAP_SIZE, 128),

    fsMaxReadSize: toNumber(process.env.FS_MAX_READ_SIZE, 5 * 1024 * 1024),
    fsMaxWriteSize: toNumber(process.env.FS_MAX_WRITE_SIZE, 5 * 1024 * 1024),
    fsEnableLogging: toBoolean(process.env.FS_ENABLE_LOGGING, true),

    apiVersion: process.env.API_VERSION || '1.0.0',
    enableRateLimit: toBoolean(process.env.ENABLE_RATE_LIMIT, true),
    rateLimitWindow: toNumber(process.env.RATE_LIMIT_WINDOW, 60 * 1000),
    rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 100),

    defaultSyncMode: toBoolean(process.env.DEFAULT_SYNC_MODE, false),
};

export default config;
