/**
 * Port Configuration
 * Centralized port management for all A2A services
 */

import type { PortMetadata } from './types.js';

/** Service identifier type */
export type ServiceKey = 
  | 'server'
  | 'clientApi'
  | 'web'
  | 'proxy'
  | 'ollama'
  | 'postgres'
  | 'redis';

/** Port configuration for a service (alias for PortMetadata) */
export type PortConfig = PortMetadata;

/** Port allocation result */
export interface PortAllocation {
  port: number;
  isDefault: boolean;
  reserved: boolean;
}

/** Port conflict information */
export interface PortConflict {
  service: ServiceKey;
  port: number;
  issue: 'in-use' | 'reserved' | 'unavailable';
  message: string;
}

/** Port suggestion for conflict resolution */
export interface PortSuggestion {
  service: ServiceKey;
  defaultPort: number;
  suggestedPort: number;
  inRange: boolean;
}

/**
 * Default port configuration for all services
 */
export const PORT_CONFIG: Record<ServiceKey, PortConfig> = {
  // Infrastructure services (highest priority)
  postgres: {
    port: 5432,
    range: [5432, 5442],
    priority: 0,
    name: 'PostgreSQL',
    description: 'Primary database',
    envVar: 'POSTGRES_PORT',
    category: 'infrastructure',
  },
  redis: {
    port: 6379,
    range: [6379, 6389],
    priority: 0,
    name: 'Redis',
    description: 'Cache and session store',
    envVar: 'REDIS_PORT',
    category: 'infrastructure',
  },
  
  // Core services
  server: {
    port: 3000,
    range: [3000, 3010],
    priority: 1,
    name: 'A2A Server',
    description: 'Main API server',
    envVar: 'SERVER_PORT',
    healthPath: '/health',
    category: 'core',
  },
  clientApi: {
    port: 3001,
    range: [3001, 3011],
    priority: 2,
    name: 'Client API',
    description: 'Client-side API server',
    envVar: 'CLIENT_API_PORT',
    healthPath: '/health',
    category: 'client',
  },
  web: {
    port: 5173,
    range: [5173, 5183],
    priority: 3,
    name: 'Web UI',
    description: 'Vite development server',
    envVar: 'WEB_PORT',
    category: 'client',
  },
  
  // AI services (optional)
  proxy: {
    port: 11434,
    range: [11434, 11444],
    priority: 4,
    name: 'AI Proxy',
    description: 'Python AI integration proxy',
    envVar: 'PROXY_PORT',
    healthPath: '/api/tags',
    optional: true,
    category: 'ai',
  },
  ollama: {
    port: 11435,
    range: [11435, 11445],
    priority: 5,
    name: 'Ollama',
    description: 'Local LLM server',
    envVar: 'OLLAMA_PORT',
    healthPath: '/api/tags',
    optional: true,
    category: 'ai',
  },
};

/**
 * Dynamic port allocation ranges by category
 */
export const CATEGORY_RANGES: Record<string, [number, number]> = {
  core: [3000, 3099],
  client: [5173, 5272],
  ai: [11434, 11533],
  infrastructure: [5432, 5531],
};

/**
 * Get port configuration for a service
 */
export function getPortConfig(service: ServiceKey): PortConfig {
  const config = PORT_CONFIG[service];
  if (!config) {
    throw new Error(`Unknown service: ${service}`);
  }
  return config;
}

/**
 * Get default port for a service
 */
export function getDefaultPort(service: ServiceKey): number {
  return getPortConfig(service).port;
}

/**
 * Get port range for a service
 */
export function getPortRange(service: ServiceKey): [number, number] {
  return getPortConfig(service).range;
}

/**
 * Get environment variable name for a service port
 */
export function getPortEnvVar(service: ServiceKey): string {
  return getPortConfig(service).envVar;
}

/**
 * Check if a service is optional
 */
export function isOptionalService(service: ServiceKey): boolean {
  return getPortConfig(service).optional ?? false;
}

/**
 * Get services sorted by priority
 */
export function getServicesByPriority(): ServiceKey[] {
  return (Object.keys(PORT_CONFIG) as ServiceKey[])
    .sort((a, b) => PORT_CONFIG[a].priority - PORT_CONFIG[b].priority);
}

/**
 * Get services by category
 */
export function getServicesByCategory(category: PortConfig['category']): ServiceKey[] {
  return (Object.keys(PORT_CONFIG) as ServiceKey[])
    .filter(key => PORT_CONFIG[key].category === category);
}

/**
 * Get all required (non-optional) services
 */
export function getRequiredServices(): ServiceKey[] {
  return (Object.keys(PORT_CONFIG) as ServiceKey[])
    .filter(key => !PORT_CONFIG[key].optional);
}

/**
 * Validate a port number is within a service's allowed range
 */
export function isPortInRange(service: ServiceKey, port: number): boolean {
  const [min, max] = getPortRange(service);
  return port >= min && port <= max;
}

/**
 * Generate .env file content with port assignments
 */
export function generateEnvContent(ports: Partial<Record<ServiceKey, number>>): string {
  const lines: string[] = [
    '# ===========================================',
    '# Service Ports (Auto-generated)',
    '# ===========================================',
    '',
  ];
  
  for (const [service, port] of Object.entries(ports)) {
    const config = PORT_CONFIG[service as ServiceKey];
    if (config) {
      lines.push(`# ${config.name}`);
      lines.push(`${config.envVar}=${port}`);
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/**
 * Parse port assignments from environment variables
 */
export function parseEnvPorts(env: Record<string, string | undefined> = process.env): Partial<Record<ServiceKey, number>> {
  const ports: Partial<Record<ServiceKey, number>> = {};
  
  for (const [service, config] of Object.entries(PORT_CONFIG)) {
    const envValue = env[config.envVar];
    if (envValue) {
      const port = parseInt(envValue, 10);
      if (!isNaN(port)) {
        ports[service as ServiceKey] = port;
      }
    }
  }
  
  return ports;
}

/**
 * Port allocation summary for logging
 */
export interface PortAllocationSummary {
  service: ServiceKey;
  name: string;
  requestedPort: number;
  allocatedPort: number;
  isDefault: boolean;
  source: 'env' | 'default' | 'dynamic';
}

/**
 * Create port allocation summary
 */
export function createAllocationSummary(
  service: ServiceKey,
  allocatedPort: number,
  isDefault: boolean,
  envPort?: number
): PortAllocationSummary {
  const config = getPortConfig(service);
  return {
    service,
    name: config.name,
    requestedPort: envPort || config.port,
    allocatedPort,
    isDefault,
    source: envPort ? 'env' : isDefault ? 'default' : 'dynamic',
  };
}
