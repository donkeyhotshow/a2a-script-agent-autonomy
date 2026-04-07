/**
 * Centralized Configuration Types
 * 
 * TypeScript types for all environment variables across services.
 * Used by root configuration and shared with a2a-server.
 */

// ===========================================
// Service Ports
// ===========================================
export interface PortConfig {
    /** A2A Server API port (Node.js) */
    serverPort: number;
    /** Client API Server port (Node.js) */
    clientApiPort: number;
    /** Web UI Development Server port (Vite) */
    webPort: number;
    /** AI Proxy port (Python Flask) */
    proxyPort: number;
    /** Local LLM upstream Docker port */
    localLlmPort: number;
    /** PostgreSQL port */
    postgresPort: number;
    /** Redis port */
    redisPort: number;
}

/** Port metadata configuration (used in ports.ts) */
export interface PortMetadata {
    /** Default port number */
    port: number;
    /** Port range for dynamic allocation [min, max] */
    range: [number, number];
    /** Service priority (lower = higher priority) */
    priority: number;
    /** Service display name */
    name: string;
    /** Whether the service is optional */
    optional?: boolean;
    /** Service description */
    description?: string;
    /** Environment variable name */
    envVar: string;
    /** Health check endpoint path (if applicable) */
    healthPath?: string;
    /** Service category */
    category: 'core' | 'infrastructure' | 'ai' | 'client';
}

// ===========================================
// Database Configuration
// ===========================================
export interface DatabaseConfig {
    /** PostgreSQL connection URL */
    databaseUrl: string;
    /** Redis connection URL */
    redisUrl: string;
    /** PostgreSQL username */
    postgresUser: string;
    /** PostgreSQL password */
    postgresPassword: string;
    /** PostgreSQL database name */
    postgresDb: string;
}

// ===========================================
// AI/LLM Configuration
// ===========================================
export interface AIConfig {
    /** Local LLM upstream host URL */
    localLlmUpstreamUrl: string;
    /** Default Local LLM upstream model */
    localLlmModel: string;
    /** Local LLM upstream request timeout in seconds */
    localLlmTimeout: number;
    /** Local LLM upstream models directory path */
    localLlmModels: string;
    /** Local LLM upstream keep-alive duration */
    localLlmKeepAlive: string;
    /** Local LLM upstream idle timeout in seconds */
    localLlmIdleTimeout: number;
    /** Auto-start Local LLM upstream on demand */
    localLlmAutoStart: boolean;
    /** LLM provider (compat_llm, openai) */
    llmProvider: 'compat_llm' | 'openai' | '';
    /** Use Local LLM upstream flag */
    useLocalLlm: boolean;
    /** AI Hub/Proxy URL */
    aiHubUrl: string;
    /** Polling interval for async operations (ms) */
    pollIntervalMs: number;
    /** Polling timeout for async operations (ms) */
    pollTimeoutMs: number;
    /** OpenAI API key (optional) */
    openaiApiKey?: string;
    /** OpenAI model */
    openaiModel: string;
}

// ===========================================
// Security Configuration
// ===========================================
export interface SecurityConfig {
    /** JWT secret (min 32 chars) */
    jwtSecret: string;
    /** JWT token expiration */
    jwtExpiresIn: string;
    /** JWT refresh token expiration */
    jwtRefreshExpiresIn: string;
    /** Encryption key for sensitive data (32 chars) */
    encryptionKey?: string;
    /** Skip authentication (development only) */
    skipAuth: boolean;
    /** API key prefix */
    apiKeyPrefix: string;
}

// ===========================================
// A2A Server Configuration
// ===========================================
export interface ServerConfig {
    /** Node environment */
    nodeEnv: 'development' | 'production' | 'test';
    /** Server host */
    host: string;
    /** Default dev email */
    defaultEmail: string;
    /** Default dev password */
    defaultPassword: string;
}

// ===========================================
// AI Proxy Configuration
// ===========================================
export interface ProxyConfig {
    /** Proxy host binding */
    proxyHost: string;
    /** Storage directory for logs */
    storageDir: string;
    /** Promises directory */
    promisesDir: string;
    /** Forward timeout in seconds */
    forwardTimeoutSeconds: number;
    /** Promise TTL in seconds */
    promiseTtlSeconds: number;
    /** Max concurrent promise workers */
    promiseMaxWorkers: number;
    /** Path to AI Hub JSON config */
    aiHubConfig?: string;
    /** Local LLM upstream server header value */
    localLlmServerHeader: string;
    /** Enable simulation mode */
    simulationEnabled: boolean;
    /** Simulation data path */
    simulationDataPath: string;
    /** Health check interval (seconds) */
    healthCheckInterval: number;
    /** Health check timeout (seconds) */
    healthCheckTimeout: number;
}

// ===========================================
// Storage & Paths Configuration
// ===========================================
export interface StorageConfig {
    /** Git SSH keys path */
    gitSshKeyPath: string;
    /** Git clone base path */
    gitCloneBasePath: string;
    /** File cache path */
    fileCachePath: string;
    /** Max file size in MB */
    maxFileSizeMb: number;
}

// ===========================================
// Logging Configuration
// ===========================================
export interface LoggingConfig {
    /** Log level */
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    /** Log format */
    logFormat: 'json' | 'pretty';
}

// ===========================================
// Rate Limiting Configuration
// ===========================================
export interface RateLimitConfig {
    /** Rate limit window in milliseconds */
    windowMs: number;
    /** Max requests per window */
    maxRequests: number;
}

// ===========================================
// Queue Configuration
// ===========================================
export interface QueueConfig {
    /** Queue concurrency */
    concurrency: number;
    /** Indexing concurrency */
    indexingConcurrency: number;
}

// ===========================================
// ML/Embeddings Configuration
// ===========================================
export interface MLConfig {
    /** Embedding dimension */
    embeddingDimension: number;
    /** Max tokens per chunk */
    chunkMaxTokens: number;
    /** Overlap tokens between chunks */
    chunkOverlapTokens: number;
}

// ===========================================
// Session Configuration
// ===========================================
export interface SessionConfig {
    /** Session timeout in milliseconds */
    timeoutMs: number;
    /** Max inactive time in milliseconds */
    maxInactiveMs: number;
}

// ===========================================
// Plexe ML Configuration
// ===========================================
export interface PlexeConfig {
    /** Plexe API URL */
    apiUrl?: string;
    /** Plexe API key */
    apiKey?: string;
}

// ===========================================
// Request Processor Configuration
// ===========================================
export interface RequestProcessorConfig {
    /** Timer interval for request processing (ms) */
    intervalMs: number;
}

/**
 * Configuration Types Index
 * Re-exports generated types from schemas for backward compatibility.
 * Includes ports-specific types and interfaces.
 */

// Schema-generated types (imported from schemas/index.js via schema.ts)
export type { 
  AppConfig, 
  PortConfig, 
  DatabaseConfig, 
  AIConfig, 
  SecurityConfig, 
  ServerConfig, 
  ProxyConfig, 
  StorageConfig, 
  LoggingConfig, 
  RateLimitConfig, 
  QueueConfig, 
  MLConfig, 
  SessionConfig, 
  PlexeConfig, 
  RequestProcessorConfig 
} from './schema.js';

// Ports-specific types and interfaces
export type { 
  ServiceKey,
  PortMetadata,
  PortConfig as PortsPortConfig,
  PortAllocation, 
  PortConflict, 
  PortSuggestion, 
  PortAllocationSummary, 
  CATEGORY_RANGES 
} from './ports.js';



