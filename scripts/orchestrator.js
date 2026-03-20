#!/usr/bin/env node
/**
 * A2A Unified Service Orchestrator
 * Manages all project services with health gating, port management, and graceful shutdown
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Import Port Manager
const { 
  allocatePort, 
  detectPortConflicts, 
  getPortSuggestions, 
  releaseAllPorts,
  DEFAULT_PORTS,
  killAllBatches,
} = await import('./port-manager.js');

// Color codes for logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Configuration
const HEALTH_CHECK_CONFIG = {
  maxAttempts: 20,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  timeoutMs: 60000,
};

// Service definitions (ports will be dynamically allocated)
let services = {};

// State management
const state = {
  processes: new Map(),
  healthStatus: new Map(),
  shuttingDown: false,
  startTime: Date.now(),
  portAllocations: new Map(),
};

// Logging utilities
function log(serviceKey, message, level = 'info') {
  const service = services[serviceKey];
  const color = service?.color || colors.white;
  const name = service?.name || serviceKey.toUpperCase();
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  
  const levelColors = {
    info: colors.reset,
    warn: colors.yellow,
    error: colors.red,
    success: colors.green,
  };

  const prefix = `${colors.dim}[${timestamp}]${colors.reset} ${color}${colors.bright}[${name}]${colors.reset}`;
  const levelStr = level !== 'info' ? `${levelColors[level]}[${level.toUpperCase()}]${colors.reset} ` : '';
  
  console.log(`${prefix} ${levelStr}${message}`);
}

function logOrchestrator(message, level = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const levelColors = {
    info: colors.cyan,
    warn: colors.yellow,
    error: colors.red,
    success: colors.green,
  };
  
  const prefix = `${colors.dim}[${timestamp}]${colors.reset} ${colors.bright}${colors.cyan}[ORCHESTRATOR]${colors.reset}`;
  const levelStr = level !== 'info' ? `${levelColors[level]}[${level.toUpperCase()}]${colors.reset} ` : '';
  
  console.log(`${prefix} ${levelStr}${message}`);
}

// Exponential backoff calculation
function calculateBackoff(attempt, config = HEALTH_CHECK_CONFIG) {
  const delay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelayMs
  );
  return Math.round(delay);
}

// Health checking with exponential backoff
async function checkHealth(serviceKey, customConfig = {}) {
  const service = services[serviceKey];
  if (!service.healthCheck) return true;

  const config = { ...HEALTH_CHECK_CONFIG, ...customConfig };
  logOrchestrator(`Checking health for ${service.name}...`);
  
  const startTime = Date.now();
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    if (state.shuttingDown) return false;
    
    // Check timeout
    if (Date.now() - startTime > config.timeoutMs) {
      log(serviceKey, `Health check timed out after ${config.timeoutMs}ms`, 'error');
      return false;
    }
    
    try {
      const isHealthy = await service.healthCheck();
      if (isHealthy) {
        state.healthStatus.set(serviceKey, true);
        log(serviceKey, `✓ Healthy (attempt ${attempt})`, 'success');
        return true;
      }
    } catch (err) {
      console.error(`Health check failed for ${url}:`, err.message || err);
    }
    
    if (attempt === config.maxAttempts) {
      if (service.optional) {
        log(serviceKey, '⚠ Health check failed, but service is optional', 'warn');
        return true;
      }
      log(serviceKey, `✗ Health check failed after ${config.maxAttempts} attempts`, 'error');
      return false;
    }
    
    const delay = calculateBackoff(attempt, config);
    if (attempt < config.maxAttempts) {
      log(serviceKey, `Retrying in ${delay}ms... (${attempt}/${config.maxAttempts})`, 'warn');
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  return false;
}

// Health gating with automatic retries
async function waitForDependencies(serviceKey, config = HEALTH_CHECK_CONFIG) {
  const service = services[serviceKey];
  if (!service.dependsOn || service.dependsOn.length === 0) return true;

  const depNames = service.dependsOn.map(d => services[d]?.name || d).join(', ');
  logOrchestrator(`${service.name} waiting for dependencies: ${depNames}`);
  
  for (const depKey of service.dependsOn) {
    const depService = services[depKey];
    if (!depService) {
      log(serviceKey, `Unknown dependency: ${depKey}`, 'error');
      return false;
    }
    
    // Check if already healthy
    const isHealthy = state.healthStatus.get(depKey);
    if (isHealthy) {
      log(serviceKey, `Dependency ${depService.name} is healthy`, 'success');
      continue;
    }
    
    // If dependency has a process, wait for it to become healthy
    if (state.processes.has(depKey) || depService.external) {
      const depHealthy = await checkHealth(depKey, config);
      if (!depHealthy && !depService.optional) {
        log(serviceKey, `Dependency ${depService.name} is not healthy`, 'error');
        return false;
      }
    } else {
      log(serviceKey, `Dependency ${depService.name} is not running`, 'error');
      return false;
    }
  }
  
  return true;
}

// Port allocation and conflict detection
async function initializePorts() {
  logOrchestrator('Initializing port allocation...');
  
  const killed = killAllBatches();
  if (killed.length > 0) {
    logOrchestrator(`Cleaned up ${killed.length} cached PID${killed.length === 1 ? '' : 's'} before port allocation`, 'warn');
  }
  
  // Check for port conflicts
  const { conflicts, warnings, available } = await detectPortConflicts();
  
  if (conflicts.length > 0) {
    logOrchestrator(`⚠️  Detected ${conflicts.length} port conflict(s)`, 'warn');
    const suggestions = await getPortSuggestions(conflicts);
    
    for (const conflict of conflicts) {
      const suggestion = suggestions.find(s => s.service === conflict.service);
      if (suggestion) {
        logOrchestrator(`  ${conflict.service}: ${conflict.port} → ${suggestion.suggestedPort}`, 'warn');
      }
    }
  }
  
  // Allocate ports for all services
  const allocations = {};
  
  for (const [serviceKey, defaultConfig] of Object.entries(DEFAULT_PORTS)) {
    try {
      // Check if port is specified in environment
      const envPort = process.env[defaultConfig.envVar || `${serviceKey.toUpperCase()}_PORT`];
      const preferredPort = envPort ? parseInt(envPort, 10) : undefined;
      
      const allocation = await allocatePort(serviceKey, preferredPort);
      allocations[serviceKey] = allocation;
      
      if (!allocation.isDefault) {
        logOrchestrator(`${serviceKey}: allocated alternative port ${allocation.port}`, 'warn');
      }
      
      state.portAllocations.set(serviceKey, allocation);
    } catch (err) {
      logOrchestrator(`Failed to allocate port for ${serviceKey}: ${err.message}`, 'error');
      throw err;
    }
  }
  
  // Update environment variables with allocated ports
  for (const [serviceKey, allocation] of Object.entries(allocations)) {
    const envVar = DEFAULT_PORTS[serviceKey]?.envVar || `${serviceKey.toUpperCase()}_PORT`;
    process.env[envVar] = String(allocation.port);
  }
  
  return allocations;
}

// Create service definitions with allocated ports
function createServiceDefinitions(allocations) {
  const buildEnv = (serviceKey, overrides = {}) => {
    const env = {...process.env, ...overrides};
    const allocation = allocations[serviceKey];
    if (allocation?.port) {
      env.PORT = String(allocation.port);
    }
    return env;
  };

  return {
    postgres: {
      name: 'PostgreSQL',
      color: colors.blue,
      port: allocations.postgres?.port || 5432,
      external: true,
      healthCheck: async () => {
        try {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          await execAsync(`docker exec a2a-postgres pg_isready -U ${process.env.POSTGRES_USER || 'a2a'}`);
          return true;
        } catch {
          return false;
        }
      },
    },
    redis: {
      name: 'Redis',
      color: colors.yellow,
      port: allocations.redis?.port || 6379,
      external: true,
      healthCheck: async () => {
        try {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          await execAsync('docker exec a2a-redis redis-cli ping');
          return true;
        } catch {
          return false;
        }
      },
    },
    ollama: {
      name: 'Ollama',
      color: colors.magenta,
      port: allocations.ollama?.port || 11435,
      external: true,
      healthCheck: async () => {
        try {
          const response = await fetch(`http://localhost:${allocations.ollama?.port || 11435}/api/tags`);
          return response.ok;
        } catch {
          return false;
        }
      },
      optional: true,
    },
    server: {
      name: 'A2A Server',
      color: colors.green,
      port: allocations.server?.port || 3000,
      cwd: resolve(rootDir, 'a2a-server'),
      command: 'npm',
      args: ['run', 'dev:no-auth'],
      env: buildEnv('server'),
      healthCheck: async () => {
        try {
          const port = allocations.server?.port || 3000;
          const response = await fetch(`http://localhost:${port}/health`);
          return response.ok;
        } catch {
          return false;
        }
      },
      dependsOn: ['postgres', 'redis'],
    },
    clientApi: {
      name: 'Client API',
      color: colors.cyan,
      port: allocations.clientApi?.port || 3001,
      cwd: resolve(rootDir, 'a2a-client/packages/sdk'),
      command: 'npm',
      args: ['run', 'dev'],
      env: buildEnv('clientApi'),
      healthCheck: async () => {
        try {
          const port = allocations.clientApi?.port || 3001;
          const response = await fetch(`http://localhost:${port}/health`);
          return response.ok;
        } catch {
          return false;
        }
      },
      dependsOn: ['server'],
    },
    web: {
      name: 'Web UI',
      color: colors.white,
      port: allocations.web?.port || 5173,
      cwd: resolve(rootDir, 'a2a-client'),
      command: 'npm',
      args: ['run', 'dev'],
      env: buildEnv('web'),
      healthCheck: async () => {
        try {
          const port = allocations.web?.port || 5173;
          const response = await fetch(`http://localhost:${port}`, { method: 'HEAD' });
          return response.status < 500;
        } catch {
          return false;
        }
      },
      dependsOn: ['clientApi'],
    },
    proxy: {
      name: 'AI Proxy',
      color: colors.magenta,
      port: allocations.proxy?.port || 11434,
      cwd: resolve(rootDir, 'ai-integration'),
      command: 'python',
      args: ['-m', 'proxy'],
      env: {
        ...process.env,
        OLLAMA_HOST: `http://localhost:${allocations.ollama?.port || 11435}`,
      },
      healthCheck: async () => {
        try {
          const port = allocations.proxy?.port || 11434;
          const response = await fetch(`http://localhost:${port}/api/tags`);
          return response.ok;
        } catch {
          return false;
        }
      },
      dependsOn: ['ollama'],
      optional: true,
    },
  };
}

// Process management
function spawnService(serviceKey) {
  const service = services[serviceKey];
  
  logOrchestrator(`Starting ${service.name} on port ${service.port}...`);
  
  const proc = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: service.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  state.processes.set(serviceKey, proc);

  // Handle stdout
  proc.stdout?.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) log(serviceKey, line);
    });
  });

  // Handle stderr
  proc.stderr?.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) log(serviceKey, line, 'warn');
    });
  });

  // Handle exit
  proc.on('exit', (code, signal) => {
    state.processes.delete(serviceKey);
    state.healthStatus.set(serviceKey, false);
    
    if (!state.shuttingDown && code !== 0 && code !== null) {
      log(serviceKey, `Process exited with code ${code}`, 'error');
      
      // Auto-restart if not shutting down (optional, can be disabled)
      if (!service.optional && !state.shuttingDown) {
        logOrchestrator(`Restarting ${service.name} in 3 seconds...`, 'warn');
        setTimeout(() => {
          if (!state.shuttingDown) {
            spawnService(serviceKey);
          }
        }, 3000);
      }
    } else if (signal) {
      log(serviceKey, `Process terminated by ${signal}`, state.shuttingDown ? 'info' : 'warn');
    }
  });

  proc.on('error', (err) => {
    log(serviceKey, `Failed to start: ${err.message}`, 'error');
    state.processes.delete(serviceKey);
  });

  return proc;
}

// Service lifecycle
async function startService(serviceKey, config = HEALTH_CHECK_CONFIG) {
  if (state.shuttingDown) return false;
  
  const service = services[serviceKey];
  
  // Check if already running
  if (state.processes.has(serviceKey)) {
    log(serviceKey, 'Already running');
    return true;
  }

  // Wait for dependencies with health gating
  const depsReady = await waitForDependencies(serviceKey, config);
  if (!depsReady) {
    log(serviceKey, 'Dependencies not ready', 'error');
    return false;
  }

  // Start the service
  if (service.command) {
    spawnService(serviceKey);
    
    // Wait for health check
    const isHealthy = await checkHealth(serviceKey, config);
    return isHealthy;
  }
  
  return true;
}

async function stopService(serviceKey) {
  const proc = state.processes.get(serviceKey);
  if (!proc) return;

  const service = services[serviceKey];
  logOrchestrator(`Stopping ${service.name}...`);

  // Try graceful shutdown first
  proc.kill('SIGTERM');
  
  // Force kill after timeout
  setTimeout(() => {
    if (!proc.killed) {
      log(serviceKey, 'Force killing...', 'warn');
      proc.kill('SIGKILL');
    }
  }, 5000);
}

// Docker management
async function startDockerServices(profile = null) {
  logOrchestrator('Starting Docker infrastructure services...');
  
  const args = ['compose', 'up', '-d'];
  if (profile) {
    args.push('--profile', profile);
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('docker', args, {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
      logOrchestrator(data.toString().trim());
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
      logOrchestrator(data.toString().trim(), 'warn');
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Docker compose failed: ${stderr}`));
      }
    });
  });
}

async function stopDockerServices() {
  logOrchestrator('Stopping Docker services...');
  
  return new Promise((resolve) => {
    const proc = spawn('docker', ['compose', 'down'], {
      cwd: rootDir,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
    
    proc.on('exit', () => resolve());
    proc.on('error', () => resolve());
  });
}

// Save port allocations to .env file
function savePortAllocations() {
  try {
    const envPath = resolve(rootDir, '.env.local');
    const lines = [
      '# Auto-generated port allocations',
      `# Generated at ${new Date().toISOString()}`,
      '',
    ];
    
    for (const [serviceKey, allocation] of state.portAllocations) {
      const envVar = DEFAULT_PORTS[serviceKey]?.envVar || `${serviceKey.toUpperCase()}_PORT`;
      lines.push(`${envVar}=${allocation.port}`);
    }
    
    writeFileSync(envPath, lines.join('\n'), { flag: 'w' });
    logOrchestrator(`Port allocations saved to .env.local`);
  } catch (err) {
    logOrchestrator(`Failed to save port allocations: ${err.message}`, 'warn');
  }
}

// Main commands
async function startAll(includeProxy = false) {
  logOrchestrator('🚀 Starting A2A Development Stack...', 'success');
  logOrchestrator(`Mode: ${includeProxy ? 'Full (with AI Proxy)' : 'Standard'}`);
  
  try {
    // Initialize ports
    const allocations = await initializePorts();
    services = createServiceDefinitions(allocations);
    
    // Start Docker infrastructure
    await startDockerServices(includeProxy ? 'full' : null);
    
    // Wait for infrastructure with health gating
    logOrchestrator('Waiting for infrastructure with health gating...');
    const infraConfig = { ...HEALTH_CHECK_CONFIG, maxAttempts: 60, timeoutMs: 120000 };
    
    const postgresHealthy = await checkHealth('postgres', infraConfig);
    if (!postgresHealthy) throw new Error('PostgreSQL failed to start');
    
    const redisHealthy = await checkHealth('redis', infraConfig);
    if (!redisHealthy) throw new Error('Redis failed to start');
    
    if (includeProxy) {
      const ollamaHealthy = await checkHealth('ollama', infraConfig);
      if (!ollamaHealthy && !services.ollama.optional) {
        throw new Error('Ollama failed to start');
      }
    }
    
    // Start application services with health gating
    logOrchestrator('Starting application services...');
    
    const serverStarted = await startService('server');
    if (!serverStarted) throw new Error('Server failed to start');
    
    const clientApiStarted = await startService('clientApi');
    if (!clientApiStarted) throw new Error('Client API failed to start');
    
    const webStarted = await startService('web');
    if (!webStarted) throw new Error('Web UI failed to start');
    
    if (includeProxy) {
      const proxyStarted = await startService('proxy');
      if (!proxyStarted && !services.proxy.optional) {
        throw new Error('AI Proxy failed to start');
      }
    }
    
    // Save port allocations
    savePortAllocations();
    
    const duration = ((Date.now() - state.startTime) / 1000).toFixed(1);
    logOrchestrator(`✓ All services started in ${duration}s`, 'success');
    printStatus();
    
  } catch (error) {
    logOrchestrator(`Failed to start services: ${error.message}`, 'error');
    await shutdown();
    process.exit(1);
  }
}

async function startServerOnly() {
  logOrchestrator('🚀 Starting Server Only...', 'success');
  
  try {
    const allocations = await initializePorts();
    services = createServiceDefinitions(allocations);
    
    await startDockerServices();
    
    const infraConfig = { ...HEALTH_CHECK_CONFIG, maxAttempts: 60, timeoutMs: 120000 };
    await checkHealth('postgres', infraConfig);
    await checkHealth('redis', infraConfig);
    
    const serverStarted = await startService('server');
    if (!serverStarted) throw new Error('Server failed to start');
    
    savePortAllocations();
    
    logOrchestrator('✓ Server started', 'success');
    printStatus();
    
  } catch (error) {
    logOrchestrator(`Failed to start server: ${error.message}`, 'error');
    await shutdown();
    process.exit(1);
  }
}

async function startClientOnly() {
  logOrchestrator('🚀 Starting Client Only...', 'success');
  
  try {
    const allocations = await initializePorts();
    services = createServiceDefinitions(allocations);
    
    const clientApiStarted = await startService('clientApi');
    if (!clientApiStarted) throw new Error('Client API failed to start');
    
    const webStarted = await startService('web');
    if (!webStarted) throw new Error('Web UI failed to start');
    
    savePortAllocations();
    
    logOrchestrator('✓ Client started', 'success');
    printStatus();
    
  } catch (error) {
    logOrchestrator(`Failed to start client: ${error.message}`, 'error');
    await shutdown();
    process.exit(1);
  }
}

async function startProxyOnly() {
  logOrchestrator('🚀 Starting AI Proxy Only...', 'success');
  
  try {
    const allocations = await initializePorts();
    services = createServiceDefinitions(allocations);
    
    await startDockerServices('ai');
    
    const infraConfig = { ...HEALTH_CHECK_CONFIG, maxAttempts: 60, timeoutMs: 120000 };
    await checkHealth('ollama', infraConfig);
    
    const proxyStarted = await startService('proxy');
    if (!proxyStarted) throw new Error('AI Proxy failed to start');
    
    savePortAllocations();
    
    logOrchestrator('✓ Proxy started', 'success');
    printStatus();
    
  } catch (error) {
    logOrchestrator(`Failed to start proxy: ${error.message}`, 'error');
    await shutdown();
    process.exit(1);
  }
}

function printStatus() {
  console.log('\n' + colors.bright + '═'.repeat(60) + colors.reset);
  console.log(colors.bright + '  SERVICE STATUS' + colors.reset);
  console.log(colors.bright + '═'.repeat(60) + colors.reset);
  
  Object.entries(services).forEach(([key, service]) => {
    const isRunning = state.processes.has(key) || service.external;
    const isHealthy = state.healthStatus.get(key);
    const allocation = state.portAllocations.get(key);
    
    const status = isHealthy 
      ? `${colors.green}● Running${colors.reset}` 
      : isRunning 
        ? `${colors.yellow}○ Starting${colors.reset}` 
        : `${colors.red}○ Stopped${colors.reset}`;
    
    const portIndicator = allocation && !allocation.isDefault 
      ? `${colors.yellow}${service.port}*${colors.reset}` 
      : service.port;
    
    console.log(`  ${service.color}${service.name.padEnd(15)}${colors.reset} ${status.padEnd(20)} http://localhost:${portIndicator}`);
  });
  
  console.log(colors.bright + '═'.repeat(60) + colors.reset);
  console.log(colors.dim + '  Press Ctrl+C to stop all services' + colors.reset);
  if (Array.from(state.portAllocations.values()).some(a => !a.isDefault)) {
    console.log(colors.dim + '  * Non-default port' + colors.reset);
  }
  console.log('');
}

async function shutdown() {
  if (state.shuttingDown) return;
  state.shuttingDown = true;
  
  logOrchestrator('🛑 Shutting down gracefully...', 'warn');
  
  // Stop application services in reverse order
  const appServices = ['web', 'clientApi', 'server', 'proxy'];
  for (const serviceKey of appServices) {
    await stopService(serviceKey);
  }
  
  // Give processes time to stop
  await new Promise(r => setTimeout(r, 2000));
  
  // Stop Docker services
  await stopDockerServices();
  
  // Release all port reservations
  releaseAllPorts();
  
  logOrchestrator('✓ All services stopped', 'success');
  process.exit(0);
}

// Signal handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => {
  logOrchestrator(`Uncaught exception: ${err.message}`, 'error');
  shutdown();
});

// CLI
const command = process.argv[2] || 'all';

switch (command) {
  case 'all':
  case 'dev':
    startAll();
    break;
  case 'server':
  case 'dev:server':
    startServerOnly();
    break;
  case 'client':
  case 'dev:client':
    startClientOnly();
    break;
  case 'proxy':
  case 'dev:proxy':
    startProxyOnly();
    break;
  case 'full':
    startAll(true);
    break;
  case 'status':
    printStatus();
    break;
  case 'stop':
    shutdown();
    break;
  default:
    console.log(`
${colors.bright}A2A Unified Service Orchestrator${colors.reset}

Usage: node scripts/orchestrator.js [command]

Commands:
  all, dev          Start all services (default)
  server            Start server + infrastructure only
  client            Start client services only
  proxy             Start AI proxy only
  full              Start all services with AI proxy
  status            Show service status
  stop              Stop all services

Features:
  • Dynamic port allocation if default ports are busy
  • Health gating with exponential backoff
  • Automatic port conflict detection
  • Port reservation system with file locks
`);
    process.exit(1);
}
