#!/usr/bin/env node
/**
 * Port Manager Service
 * Manages port allocation, reservation, and conflict detection
 */

import { createServer } from 'net';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Lock files directory
const LOCK_DIR = resolve(homedir(), '.a2a', 'port-locks');

// Default port configuration
export const DEFAULT_PORTS = {
  server: { port: 3000, range: [3000, 3010], priority: 1, envVar: 'SERVER_PORT' },
  clientApi: { port: 3001, range: [3001, 3011], priority: 2, envVar: 'CLIENT_API_PORT' },
  web: { port: 5173, range: [5173, 5183], priority: 3, envVar: 'WEB_PORT' },
  proxy: { port: 11434, range: [11434, 11444], priority: 4, envVar: 'PROXY_PORT' },
  ollama: { port: 11435, range: [11435, 11445], priority: 5, envVar: 'OLLAMA_PORT' },
  postgres: { port: 5432, range: [5432, 5442], priority: 0, envVar: 'POSTGRES_PORT' },
  redis: { port: 6379, range: [6379, 6389], priority: 0, envVar: 'REDIS_PORT' },
};

// Ensure lock directory exists
function ensureLockDir() {
  if (!existsSync(LOCK_DIR)) {
    mkdirSync(LOCK_DIR, { recursive: true });
  }
}

// Get lock file path for a port
function getLockFilePath(port) {
  return resolve(LOCK_DIR, `port-${port}.lock`);
}

// Get metadata file path for a port
function getMetadataFilePath(port) {
  return resolve(LOCK_DIR, `port-${port}.json`);
}

function readMetadata(port) {
  const metadataFile = getMetadataFilePath(port);
  if (!existsSync(metadataFile)) {
    return null;
  }

  try {
    const raw = readFileSync(metadataFile, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.pids)) {
      data.pids = [];
    }
    return data;
  } catch (err) {
    console.warn(`Failed to read port metadata for ${port}:`, err.message || err);
    return null;
  }
}

function writeMetadata(port, metadata) {
  ensureLockDir();
  writeFileSync(getMetadataFilePath(port), JSON.stringify(metadata, null, 2), 'utf8');
}

function deleteMetadata(port) {
  const metadataFile = getMetadataFilePath(port);
  if (existsSync(metadataFile)) {
    unlinkSync(metadataFile);
  }
}

function addPidToMetadata(port, serviceName, pid) {
  const metadata = readMetadata(port) || { port, serviceName, pids: [] };
  metadata.serviceName = serviceName;
  metadata.pids = metadata.pids.filter((entry) => entry.pid !== pid);
  metadata.pids.push({
    pid,
    reservedAt: new Date().toISOString(),
  });
  writeMetadata(port, metadata);
}

function removePidFromMetadata(port, pid) {
  const metadata = readMetadata(port);
  if (!metadata) return;

  metadata.pids = metadata.pids.filter((entry) => entry.pid !== pid);
  if (metadata.pids.length === 0) {
    deleteLockAndMetadata(port);
  } else {
    writeMetadata(port, metadata);
  }
}

function cleanupDeadPids(port) {
  const metadata = readMetadata(port);
  if (!metadata) return null;

  metadata.pids = metadata.pids.filter((entry) => {
    try {
      process.kill(entry.pid, 0);
      return true;
    } catch (err) {
      console.warn(`Failed to check if PID ${entry.pid} is alive:`, err.message || err);
      return false;
    }
  });

  if (metadata.pids.length === 0) {
    deleteMetadata(port);
    return null;
  }

  writeMetadata(port, metadata);
  return metadata;
}

function deleteLockAndMetadata(port) {
  const lockFile = getLockFilePath(port);
  deleteMetadata(port);
  if (existsSync(lockFile)) {
    try {
      unlinkSync(lockFile);
    } catch (err) {
      console.warn(`Failed to remove lock file: ${lockPath}`, err.message || err);
    }
  }
}

export function killPidBatch(port) {
  const metadata = readMetadata(port);
  if (!metadata) return [];

  const killed = [];
  for (const entry of metadata.pids) {
    if (entry.pid === process.pid) continue;
    try {
      process.kill(entry.pid);
      killed.push(entry.pid);
    } catch {}
  }

  deleteLockAndMetadata(port);
  return killed;
}

export function killAllBatches() {
  ensureLockDir();
  const files = readdirSync(LOCK_DIR);
  const killed = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const port = parseInt(file.match(/port-(\d+)\.json/)?.[1]);
    if (!port) continue;
    killed.push(...killPidBatch(port));
  }

  return killed;
}

/**
 * Check if a port is free (not in use by the system)
 * @param {number} port - Port to check
 * @param {string} host - Host to bind to (default: 127.0.0.1)
 * @returns {Promise<boolean>} - True if port is free
 */
export async function isPortFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    
    server.once('error', (err) => {
      if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

/**
 * Check if a port is reserved by this process or another
 * @param {number} port - Port to check
 * @returns {boolean} - True if port is reserved
 */
export function isPortReserved(port) {
  const metadata = cleanupDeadPids(port);
  return metadata !== null;
}

/**
 * Find a free port in a range
 * @param {number} startPort - Start of range
 * @param {number} endPort - End of range (inclusive)
 * @param {string} host - Host to bind to
 * @returns {Promise<number|null>} - Free port or null if none found
 */
export async function findFreePortInRange(startPort, endPort, host = '127.0.0.1') {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortFree(port) && !isPortReserved(port)) {
      return port;
    }
  }
  return null;
}

/**
 * Reserve a port for a service
 * @param {number} port - Port to reserve
 * @param {string} serviceName - Name of the service
 * @returns {boolean} - True if reservation successful
 */
export function reservePort(port, serviceName) {
  ensureLockDir();
  
  const lockFile = getLockFilePath(port);
  const metadataFile = getMetadataFilePath(port);
  
  // Check if already reserved
  if (existsSync(lockFile)) {
    if (isPortReserved(port)) {
      return false;
    }
  }
  
  try {
    // Create lock file
    writeFileSync(lockFile, String(process.pid), { flag: 'wx' });
    
    // Append PID to metadata
    addPidToMetadata(port, serviceName, process.pid);
    
    return true;
  } catch (err) {
    if (existsSync(lockFile)) {
      try { unlinkSync(lockFile); } catch {}
    }
    if (existsSync(metadataFile)) {
      try { unlinkSync(metadataFile); } catch {}
    }
    return false;
  }
}

/**
 * Release a reserved port
 * @param {number} port - Port to release
 * @returns {boolean} - True if release successful
 */
export function releasePort(port) {
  const lockFile = getLockFilePath(port);
  removePidFromMetadata(port, process.pid);

  try {
    if (existsSync(lockFile)) {
      unlinkSync(lockFile);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get port allocation for a service
 * Uses default port if free, otherwise finds alternative in range
 * @param {string} serviceKey - Service identifier
 * @param {number} [preferredPort] - Preferred port (optional)
 * @returns {Promise<{port: number, isDefault: boolean, reserved: boolean}>}
 */
export async function allocatePort(serviceKey, preferredPort = null) {
  const config = DEFAULT_PORTS[serviceKey];
  if (!config) {
    throw new Error(`Unknown service: ${serviceKey}`);
  }
  
  const targetPort = preferredPort || config.port;
  
  // Try preferred/default port first
  if (await isPortFree(targetPort) && !isPortReserved(targetPort)) {
    const reserved = reservePort(targetPort, serviceKey);
    return { port: targetPort, isDefault: true, reserved };
  }
  
  // Find alternative in range
  const altPort = await findFreePortInRange(config.range[0], config.range[1]);
  if (altPort) {
    const reserved = reservePort(altPort, serviceKey);
    return { port: altPort, isDefault: false, reserved };
  }
  
  throw new Error(`No free port found for ${serviceKey} in range ${config.range.join('-')}`);
}

/**
 * Check for port conflicts across all services
 * @returns {Promise<{conflicts: Array, available: Array, warnings: Array}>}
 */
export async function detectPortConflicts() {
  const conflicts = [];
  const available = [];
  const warnings = [];
  
  for (const [serviceKey, config] of Object.entries(DEFAULT_PORTS)) {
    const isFree = await isPortFree(config.port);
    const metadata = cleanupDeadPids(config.port);
    const isReserved = metadata !== null;
    
    if (!isFree) {
      conflicts.push({
        service: serviceKey,
        port: config.port,
        issue: 'in-use',
        message: `Port ${config.port} for ${serviceKey} is already in use`,
      });
    } else if (isReserved) {
      warnings.push({
        service: serviceKey,
        port: config.port,
        issue: 'reserved',
        message: `Port ${config.port} for ${serviceKey} is reserved by another process`,
      });
    } else {
      available.push({
        service: serviceKey,
        port: config.port,
      });
    }
  }
  
  return { conflicts, available, warnings };
}

/**
 * Get suggested port alternatives for conflicting services
 * @param {Array} conflicts - Array of conflict objects from detectPortConflicts
 * @returns {Promise<Array>} - Array of suggestions
 */
export async function getPortSuggestions(conflicts) {
  const suggestions = [];
  
  for (const conflict of conflicts) {
    const config = DEFAULT_PORTS[conflict.service];
    if (!config) continue;
    
    const altPort = await findFreePortInRange(config.range[0], config.range[1]);
    if (altPort) {
      suggestions.push({
        service: conflict.service,
        defaultPort: conflict.port,
        suggestedPort: altPort,
        inRange: altPort >= config.range[0] && altPort <= config.range[1],
      });
    }
  }
  
  return suggestions;
}

/**
 * Release all ports reserved by this process
 */
export function releaseAllPorts() {
  ensureLockDir();
  
  try {
    const files = readdirSync(LOCK_DIR);
    let released = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const port = parseInt(file.match(/port-(\d+)\.json/)?.[1]);
      if (!port) continue;

      const metadata = readMetadata(port);
      if (metadata && metadata.pids.some((entry) => entry.pid === process.pid)) {
        removePidFromMetadata(port, process.pid);
        released++;
      }
    }

    return released;
  } catch {
    return 0;
  }
}

/**
 * Get all reserved ports with metadata
 * @returns {Array} - Array of reserved port metadata
 */
export function getReservedPorts() {
  ensureLockDir();
  
  const reserved = [];
  
  try {
    const files = readdirSync(LOCK_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const port = parseInt(file.match(/port-(\d+)\.json/)?.[1]);
      if (!port) continue;

      const metadata = readMetadata(port);
      if (!metadata) continue;

      metadata.pids.forEach((entry) => {
        reserved.push({
          port,
          serviceName: metadata.serviceName,
          pid: entry.pid,
          reservedAt: entry.reservedAt,
        });
      });
    }
  } catch {}
  
  return reserved;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'check': {
      const port = parseInt(process.argv[3]);
      if (!port) {
        console.error('Usage: port-manager check <port>');
        process.exit(1);
      }
      const free = await isPortFree(port);
      const reserved = isPortReserved(port);
      console.log(`Port ${port}: ${free ? 'free' : 'in-use'}${reserved ? ', reserved' : ''}`);
      process.exit(free && !reserved ? 0 : 1);
      break;
    }
    
    case 'allocate': {
      const service = process.argv[3];
      if (!service) {
        console.error('Usage: port-manager allocate <service>');
        process.exit(1);
      }
      try {
        const result = await allocatePort(service);
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
      break;
    }
    
    case 'release': {
      const port = parseInt(process.argv[3]);
      if (!port) {
        console.error('Usage: port-manager release <port>');
        process.exit(1);
      }
      const success = releasePort(port);
      console.log(success ? `Port ${port} released` : `Failed to release port ${port}`);
      process.exit(success ? 0 : 1);
      break;
    }
    
    case 'kill-batch': {
      const port = parseInt(process.argv[3]);
      if (!port) {
        console.error('Usage: port-manager kill-batch <port>');
        process.exit(1);
      }
      const killed = killPidBatch(port);
      if (killed.length === 0) {
        console.log(`No cached PIDs found for port ${port}`);
      } else {
        console.log(`Killed ${killed.length} cached PID${killed.length === 1 ? '' : 's'} for port ${port}`);
      }
      process.exit(0);
      break;
    }

    case 'kill-all': {
      const killed = killAllBatches();
      if (killed.length === 0) {
        console.log('No cached PID packs to kill');
      } else {
        console.log(`Killed ${killed.length} cached PIDs across all ports`);
      }
      process.exit(0);
      break;
    }
    
    case 'conflicts': {
      const { conflicts, available, warnings } = await detectPortConflicts();
      const suggestions = await getPortSuggestions(conflicts);
      
      console.log('Port Conflict Report');
      console.log('='.repeat(50));
      
      if (conflicts.length > 0) {
        console.log('\n❌ Conflicts:');
        conflicts.forEach(c => console.log(`  ${c.service}: ${c.message}`));
      }
      
      if (warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        warnings.forEach(w => console.log(`  ${w.service}: ${w.message}`));
      }
      
      if (suggestions.length > 0) {
        console.log('\n💡 Suggestions:');
        suggestions.forEach(s => {
          console.log(`  ${s.service}: ${s.defaultPort} → ${s.suggestedPort}`);
        });
      }
      
      if (available.length > 0) {
        console.log('\n✅ Available:');
        available.forEach(a => console.log(`  ${a.service}: ${a.port}`));
      }
      
      process.exit(conflicts.length > 0 ? 1 : 0);
      break;
    }
    
    case 'list': {
      const reserved = getReservedPorts();
      console.log('Reserved Ports:');
      reserved.forEach(r => {
        console.log(`  ${r.port} - ${r.serviceName} (PID: ${r.pid})`);
      });
      if (reserved.length === 0) {
        console.log('  No ports reserved');
      }
      process.exit(0);
      break;
    }
    
    default:
      console.log('Port Manager - Usage:');
      console.log('  port-manager check <port>        - Check if port is free');
      console.log('  port-manager allocate <service>  - Allocate port for service');
      console.log('  port-manager release <port>      - Release a reserved port');
      console.log('  port-manager kill-batch <port>   - Kill cached PIDs for a port');
      console.log('  port-manager kill-all            - Kill cached PIDs across all ports');
      console.log('  port-manager conflicts           - Detect port conflicts');
      console.log('  port-manager list                - List reserved ports');
      process.exit(1);
    }
}
