#!/usr/bin/env node
/**
 * A2A Unified Service Orchestrator
 * Manages all project services with health gating and graceful shutdown
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

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

// Service definitions
const services = {
  postgres: {
    name: 'PostgreSQL',
    color: colors.blue,
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
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
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
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
    port: parseInt(process.env.OLLAMA_PORT, 10) || 11435,
    healthCheck: async () => {
      try {
        const response = await fetch(`http://localhost:${process.env.OLLAMA_PORT || 11435}/api/tags`);
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
    port: parseInt(process.env.SERVER_PORT, 10) || 3000,
    cwd: resolve(rootDir, 'a2a-server'),
    command: 'npm',
    args: ['run', 'dev:no-auth'],
    env: { ...process.env, PORT: process.env.SERVER_PORT || '3000' },
    healthCheck: async () => {
      try {
        const response = await fetch(`http://localhost:${process.env.SERVER_PORT || 3000}/health`);
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
    port: parseInt(process.env.CLIENT_API_PORT, 10) || 3001,
    cwd: resolve(rootDir, 'a2a-client/packages/api-server'),
    command: 'npm',
    args: ['run', 'dev'],
    env: { ...process.env, PORT: process.env.CLIENT_API_PORT || '3001' },
    healthCheck: async () => {
      try {
        const response = await fetch(`http://localhost:${process.env.CLIENT_API_PORT || 3001}/health`);
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
    port: parseInt(process.env.WEB_PORT, 10) || 5173,
    cwd: resolve(rootDir, 'a2a-client'),
    command: 'npm',
    args: ['run', 'dev'],
    env: { ...process.env },
    healthCheck: async () => {
      try {
        const response = await fetch(`http://localhost:${process.env.WEB_PORT || 5173}`, { method: 'HEAD' });
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
    port: parseInt(process.env.PROXY_PORT, 10) || 11434,
    cwd: resolve(rootDir, 'ai-integration'),
    command: 'python',
    args: ['-m', 'proxy'],
    env: {
      ...process.env,
      PROXY_PORT: process.env.PROXY_PORT || '11434',
      OLLAMA_HOST: `http://localhost:${process.env.OLLAMA_PORT || 11435}`,
    },
    healthCheck: async () => {
      try {
        const response = await fetch(`http://localhost:${process.env.PROXY_PORT || 11434}/api/tags`);
        return response.ok;
      } catch {
        return false;
      }
    },
    dependsOn: ['ollama'],
    optional: true,
  },
};

// State management
const state = {
  processes: new Map(),
  healthStatus: new Map(),
  shuttingDown: false,
  startTime: Date.now(),
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

// Health checking
async function checkHealth(serviceKey, maxAttempts = 30) {
  const service = services[serviceKey];
  if (!service.healthCheck) return true;

  logOrchestrator(`Checking health for ${service.name}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (state.shuttingDown) return false;
    
    const isHealthy = await service.healthCheck();
    if (isHealthy) {
      state.healthStatus.set(serviceKey, true);
      log(serviceKey, '✓ Healthy', 'success');
      return true;
    }
    
    if (attempt === maxAttempts) {
      if (service.optional) {
        log(serviceKey, '⚠ Health check failed, but service is optional', 'warn');
        return true;
      }
      log(serviceKey, `✗ Health check failed after ${maxAttempts} attempts`, 'error');
      return false;
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  return false;
}

async function waitForDependencies(serviceKey) {
  const service = services[serviceKey];
  if (!service.dependsOn || service.dependsOn.length === 0) return true;

  logOrchestrator(`${service.name} waiting for dependencies: ${service.dependsOn.map(d => services[d].name).join(', ')}`);
  
  for (const depKey of service.dependsOn) {
    const isHealthy = state.healthStatus.get(depKey);
    if (!isHealthy) {
      const depHealthy = await checkHealth(depKey);
      if (!depHealthy && !services[depKey].optional) {
        log(serviceKey, `Dependency ${services[depKey].name} is not healthy`, 'error');
        return false;
      }
    }
  }
  
  return true;
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
async function startService(serviceKey) {
  if (state.shuttingDown) return false;
  
  const service = services[serviceKey];
  
  // Check if already running
  if (state.processes.has(serviceKey)) {
    log(serviceKey, 'Already running');
    return true;
  }

  // Wait for dependencies
  const depsReady = await waitForDependencies(serviceKey);
  if (!depsReady) {
    log(serviceKey, 'Dependencies not ready', 'error');
    return false;
  }

  // Start the service
  if (service.command) {
    spawnService(serviceKey);
    
    // Wait for health check
    const isHealthy = await checkHealth(serviceKey);
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

// Main commands
async function startAll(includeProxy = false) {
  logOrchestrator('🚀 Starting A2A Development Stack...', 'success');
  logOrchestrator(`Mode: ${includeProxy ? 'Full (with AI Proxy)' : 'Standard'}`);
  
  try {
    // Start Docker infrastructure
    await startDockerServices(includeProxy ? 'full' : null);
    
    // Wait for infrastructure
    logOrchestrator('Waiting for infrastructure...');
    await checkHealth('postgres');
    await checkHealth('redis');
    
    if (includeProxy) {
      await checkHealth('ollama');
    }
    
    // Start application services
    await startService('server');
    await startService('clientApi');
    await startService('web');
    
    if (includeProxy) {
      await startService('proxy');
    }
    
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
    await startDockerServices();
    await checkHealth('postgres');
    await checkHealth('redis');
    await startService('server');
    
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
    await startService('clientApi');
    await startService('web');
    
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
    await startDockerServices('ai');
    await checkHealth('ollama');
    await startService('proxy');
    
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
    const isRunning = state.processes.has(key) || (key === 'postgres' || key === 'redis' || key === 'ollama');
    const isHealthy = state.healthStatus.get(key);
    const status = isHealthy 
      ? `${colors.green}● Running${colors.reset}` 
      : isRunning 
        ? `${colors.yellow}○ Starting${colors.reset}` 
        : `${colors.red}○ Stopped${colors.reset}`;
    
    console.log(`  ${service.color}${service.name.padEnd(15)}${colors.reset} ${status.padEnd(20)} http://localhost:${service.port}`);
  });
  
  console.log(colors.bright + '═'.repeat(60) + colors.reset);
  console.log(colors.dim + '  Press Ctrl+C to stop all services' + colors.reset);
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
  proxy             Start AI proxy + Ollama only
  full              Start everything including AI proxy
  status            Show service status
  stop              Stop all services

Environment Variables:
  SERVER_PORT       Server port (default: 3000)
  CLIENT_API_PORT   Client API port (default: 3001)
  WEB_PORT          Web UI port (default: 5173)
  PROXY_PORT        AI Proxy port (default: 11434)
  OLLAMA_PORT       Ollama port (default: 11435)
  POSTGRES_PORT     PostgreSQL port (default: 5432)
  REDIS_PORT        Redis port (default: 6379)
`);
    process.exit(0);
}
