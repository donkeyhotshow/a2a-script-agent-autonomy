#!/usr/bin/env node

import { spawn, execFileSync } from 'child_process';
import net from 'net';
import fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Configuration - hardcoded as requested
const SERVICES = {
  'ai-integration': {
    port: 11434,
    startCmd: 'cd ai-integration && npm run dev',
    healthEndpoint: '/health',
    dependencies: ['compat_llm'],
    logfile: path.join(__dirname, '..', 'ai-integration', 'logs', 'ai-integration.log')
  },
  'a2a-server': {
    port: 3000,
    startCmd: 'cd a2a-server && npm run dev',
    healthEndpoint: '/health',
    dependencies: ['ai-integration'],
    logfile: path.join(__dirname, '..', 'a2a-server', 'logs', 'a2a-server.log')
  },
  'client-api': {
    port: 3001,
    startCmd: 'cd a2a-client && npm run dev',
    healthEndpoint: '/api/a2a/projects',
    dependencies: ['a2a-server'],
    logfile: path.join(__dirname, '..', 'a2a-client', 'logs', 'client-api.log')
  },
  'web-ui': {
    port: 5173,
    startCmd: 'cd a2a-client && npm run dev:web',
    healthEndpoint: '/api/a2a/projects',
    dependencies: ['client-api'],
    logfile: path.join(__dirname, '..', 'a2a-client', 'logs', 'web-ui.log')
  }
};

const PID_FILE = path.join(__dirname, '..', '.pids.txt');

// Daemon configs
// Add restart policy to services
SERVICES['ai-integration'].restartPolicy = {enabled: true, maxRestarts: 5, delayMs: 10000};
SERVICES['a2a-server'].restartPolicy = {enabled: true, maxRestarts: 5, delayMs: 10000};
SERVICES['client-api'].restartPolicy = {enabled: true, maxRestarts: 5, delayMs: 10000};
SERVICES['web-ui'].restartPolicy = {enabled: true, maxRestarts: 5, delayMs: 10000};
const DAEMON_PID_FILE = path.join(__dirname, '..', 'runbook-daemon.pid');
const LOCK_FILE = path.join(__dirname, '..', 'runbook-daemon.lock');
const STATE_FILE = path.join(__dirname, '..', 'runbook-state.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'runbook-daemon.log');
const IPC_PORT = 9999;
const MONITOR_INTERVAL = 30000; // 30s

function daemonLog(message) {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
  console.log(`[DAEMON] [${timestamp}] ${message}`);
}

function cliLog(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

let currentLog = cliLog; // Default to CLI log

function log(message) {
  currentLog(message);
}

function isDaemonRunning() {
  if (!fs.existsSync(DAEMON_PID_FILE)) return false;

  const daemonPidStr = fs.readFileSync(DAEMON_PID_FILE, 'utf8').trim();
  const daemonPid = parseInt(daemonPidStr);

  if (!Number.isInteger(daemonPid) || daemonPid <= 0) {
    fs.unlinkSync(DAEMON_PID_FILE);
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
    return false;
  }

  try {
    process.kill(daemonPid, 0);
    return true;
  } catch (e) {
    fs.unlinkSync(DAEMON_PID_FILE);
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
    return false;
  }
}

function acquireLock() {
  try {
    const fd = fs.openSync(LOCK_FILE, 'wx');
    fs.closeSync(fd);
    return true;
  } catch (e) {
    return false;
  }
}

function releaseLock() {
  if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) return { services: {}, daemonPid: process.pid, lastMonitor: 0 };
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    return { services: {}, daemonPid: process.pid, lastMonitor: 0 };
  }
}

function writeState(state) {
  state.daemonPid = process.pid;
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function writeDaemonPid() {
  fs.writeFileSync(DAEMON_PID_FILE, String(process.pid));
}

async function sendIPCCommand(req) {
  return new Promise((resolve, reject) => {
    const client = net.connect(IPC_PORT, '127.0.0.1', () => {
      client.write(JSON.stringify(req) + '\n');
    });

    let buffer = '';
    client.on('data', (data) => {
      buffer += data.toString();
      if (buffer.includes('\n')) {
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        try {
          const res = JSON.parse(lines[0]);
          client.end();
          resolve(res);
        } catch (e) {
          reject(e);
        }
      }
    });

    client.on('error', reject);
    client.on('end', () => {
      if (buffer) resolve({error: 'Incomplete response'});
    });

    setTimeout(() => reject(new Error('IPC timeout')), 10000);
  });
}

function handleIPC(socket) {
  let buffer = '';
  socket.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) {
        try {
          const req = JSON.parse(line);
          const res = handleCommand(req.cmd, req.services || []);
          socket.write(JSON.stringify(res) + '\n');
        } catch (e) {
          socket.write(JSON.stringify({error: e.message}) + '\n');
        }
      }
    }
  });
  socket.on('end', () => socket.end());
}

async function handleCommand(cmd, services) {
  try {
    switch (cmd) {
      case 'start':
        await startCommand(services);
        return {status: 'ok'};
      case 'stop':
        stopCommand(services);
        return {status: 'ok'};
      case 'restart':
        stopCommand(services);
        setTimeout(() => startCommand(services), 2000);
        return {status: 'ok', note: 'async'};
      case 'status':
        // Capture output
        const status = [];
        const oldLog = currentLog;
        currentLog = (msg) => status.push(msg);
        showStatus();
        log = oldLog;
        return {status: 'ok', data: status};
      case 'shutdown':
        process.exit(0);
      default:
        return {error: 'Unknown cmd'};
    }
  } catch (e) {
    return {error: e.message};
  }
}

function monitorServices() {
  const state = readState();
  const now = Date.now();
  if (now - state.lastMonitor < MONITOR_INTERVAL / 2) return state;
  state.lastMonitor = now;
  for (const serviceName of Object.keys(SERVICES)) {
    const service = SERVICES[serviceName];
    const serviceState = state.services[serviceName] || {restarts: 0, healthy: false};
    if (!serviceState.healthy && service.restartPolicy?.enabled && serviceState.restarts < service.restartPolicy.maxRestarts) {
      log(`Restarting ${serviceName} (attempt ${serviceState.restarts + 1})`);
      serviceState.restarts++;
      stopService(serviceName);
      setTimeout(() => startService(serviceName).then(() => {
        serviceState.healthy = true;
      }).catch(() => {
        serviceState.healthy = false;
      }), service.restartPolicy.delayMs || 5000);
    }
    // TODO: Async health in monitor
    serviceState.healthy = false; // Conservative
    state.services[serviceName] = serviceState;
  }
  writeState(state);
  return state;
}

function shutdown() {
  log('Shutting down daemon...');
  // Close server would be passed
  const running = getRunningServices();
  Object.keys(running).forEach(pid => killProcess(pid));
  releaseLock();
  if (fs.existsSync(DAEMON_PID_FILE)) fs.unlinkSync(DAEMON_PID_FILE);
  process.exit(0);
}

let daemonServer = null;

function runDaemon() {
  if (!acquireLock()) {
    log('Daemon already running or lock failed');
    return false;
  }

  writeDaemonPid();
  let state = readState();
  writeState(state);

  currentLog = daemonLog;
  log('Daemon started, PID ' + process.pid);

  daemonServer = net.createServer(handleIPC);
  daemonServer.listen(IPC_PORT, '127.0.0.1', () => {
    log(`Daemon IPC server listening on localhost:${IPC_PORT}`);
  });

  const monitorInterval = setInterval(monitorServices, MONITOR_INTERVAL);

  process.on('SIGTERM', () => shutdown());
  process.on('SIGINT', () => shutdown());
  process.on('uncaughtException', (e) => {
    log('Uncaught: ' + e.message);
    shutdown();
  });

  return true;
}

async function proxyCommand(command, serviceArgs) {
  if (!isDaemonRunning()) throw new Error('Daemon not running');
  const res = await sendIPCCommand({cmd: command, services: serviceArgs});
  if (res.error) throw new Error(res.error);
  return res;
}

function isPortOpen(port) {
  const p = Number(port);
  if (!Number.isInteger(p) || p < 1 || p > 65535) return false;
  try {
    const output = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
    return output.includes(`:${p}`);
  } catch (e) {
    return false;
  }
}

async function checkHealth(serviceName) {
  const service = SERVICES[serviceName];
  const url = `http://localhost:${service.port}${service.healthEndpoint}`;

  try {
    const response = await fetch(url, { timeout: 5000 });
    return response.ok;
  } catch (e) {
    return false;
  }
}

function getRunningServices() {
  if (!fs.existsSync(PID_FILE)) return {};

  const content = fs.readFileSync(PID_FILE, 'utf8');
  const running = {};

  content.split('\n').forEach(line => {
    const match = line.match(/^(\w+)=(\d+)$/);
    if (match) {
      running[match[1]] = parseInt(match[2]);
    }
  });

  return running;
}

function savePid(serviceName, pid) {
  let content = '';
  if (fs.existsSync(PID_FILE)) {
    content = fs.readFileSync(PID_FILE, 'utf8');
  }
  const lines = content.split('\n').filter(line => !line.startsWith(`${serviceName}=`));
  lines.push(`${serviceName}=${pid}`);
  fs.writeFileSync(PID_FILE, lines.join('\n'));
}

function killProcess(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return;
  try {
    if (os.platform() === 'win32') {
      execFileSync('taskkill', ['/F', '/PID', String(n)], { stdio: 'ignore' });
    } else {
      process.kill(n, 'SIGTERM');
    }
  } catch (e) {
    // Process might already be dead
  }
}

function startService(serviceName) {
  return new Promise((resolve, reject) => {
    const service = SERVICES[serviceName];

    log(`Starting ${serviceName} on port ${service.port}...`);

    // Check if port is already in use
    if (isPortOpen(service.port)) {
      log(`Port ${service.port} is occupied. Checking if service is responding...`);

      checkHealth(serviceName).then(healthy => {
        if (healthy) {
          log(`${serviceName} is already running and healthy`);
          resolve();
        } else {
          log(`ERROR: ${serviceName} port occupied but service not responding`);
          log(`Check logfile: ${service.logfile}`);
          reject(new Error(`Service not responding on port ${service.port}`));
        }
      });
      return;
    }

    // Start the service
    const child = spawn(service.startCmd, {
      shell: true,
      detached: true,
      stdio: ['ignore', 'pipe', 'ignore']
    });

    savePid(serviceName, child.pid);

    // Monitor stdout/stderr
    child.stdout.on('data', (data) => {
      log(`${serviceName}: ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      log(`${serviceName} ERROR: ${data.toString().trim()}`);
    });

    child.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        log(`ERROR: ${serviceName} exited with code ${code}`);
        reject(new Error(`${serviceName} failed to start`));
      }
    });

    // Wait for service to be ready
    let attempts = 0;
    const checkReady = () => {
      checkHealth(serviceName).then(healthy => {
        if (healthy) {
          log(`✓ ${serviceName} started successfully (PID: ${child.pid})`);
          resolve();
        } else {
          attempts++;
          if (attempts < 30) { // 30 seconds timeout
            setTimeout(checkReady, 1000);
          } else {
            log(`ERROR: ${serviceName} failed health check after 30 seconds`);
            child.kill();
            reject(new Error(`${serviceName} health check failed`));
          }
        }
      }).catch(() => {
        attempts++;
        if (attempts < 30) {
          setTimeout(checkReady, 1000);
        } else {
          child.kill();
          reject(new Error(`${serviceName} health check failed`));
        }
      });
    };

    setTimeout(checkReady, 2000); // Initial delay
  });
}

function stopService(serviceName) {
  const running = getRunningServices();
  const pid = running[serviceName];

  if (pid) {
    log(`Stopping ${serviceName} (PID: ${pid})...`);
    killProcess(pid);

    // Remove from PID file
    const content = fs.readFileSync(PID_FILE, 'utf8');
    const lines = content.split('\n').filter(line => !line.startsWith(`${serviceName}=`));
    fs.writeFileSync(PID_FILE, lines.join('\n'));

    log(`✓ ${serviceName} stopped`);
  } else {
    log(`${serviceName} is not running`);
  }
}

function getDependencyOrder(services) {
  const result = [];
  const visited = new Set();

  function visit(serviceName) {
    if (visited.has(serviceName)) return;
    visited.add(serviceName);

    const service = SERVICES[serviceName];
    service.dependencies.forEach(dep => visit(dep));

    result.push(serviceName);
  }

  services.forEach(service => visit(service));

  return result;
}

async function startCommand(servicesToStart) {
  const allServices = Object.keys(SERVICES);
  const targetServices = servicesToStart.length > 0 ? servicesToStart : allServices;
  const order = getDependencyOrder(targetServices);

  log(`Starting services in order: ${order.join(', ')}`);

  for (const serviceName of order) {
    try {
      await startService(serviceName);
    } catch (error) {
      log(`Failed to start ${serviceName}: ${error.message}`);
      return;
    }
  }

  log('All services started successfully!');
  showStatus();
}

function stopCommand(servicesToStop) {
  const allServices = Object.keys(SERVICES);
  const targetServices = servicesToStop.length > 0 ? servicesToStop.reverse() : allServices.reverse(); // Stop in reverse order

  targetServices.forEach(service => stopService(service));
}

function showStatus() {
  const running = getRunningServices();

  log('Service Status:');
  Object.keys(SERVICES).forEach(serviceName => {
    const service = SERVICES[serviceName];
    const pid = running[serviceName];
    const portOpen = isPortOpen(service.port);

    let status = '🟡 Not running';
    if (pid && portOpen) {
      status = '🟢 Running';
    } else if (portOpen) {
      status = '🟠 Port occupied';
    }

    log(`  ${serviceName}: ${status} (Port: ${service.port}, PID: ${pid || 'N/A'})`);
  });
}

// Main CLI logic
const args = process.argv.slice(2);
const command = args[0];
const serviceArgs = args.slice(1);

if (command === 'daemon-start') {
  runDaemon();
} else if (command === 'daemon-stop') {
  if (isDaemonRunning()) {
    proxyCommand('shutdown', []);
  } else {
    log('No daemon running');
  }
} else if (command && isDaemonRunning()) {
  proxyCommand(command, serviceArgs).catch(e => cliLog('Proxy error: ' + e.message));
} else {
  // One-shot fallback
  switch (command) {
    case 'start':
      startCommand(serviceArgs);
      break;
    case 'stop':
      stopCommand(serviceArgs);
      break;
    case 'restart':
      stopCommand(serviceArgs);
      setTimeout(() => startCommand(serviceArgs), 2000);
      break;
    case 'status':
      showStatus();
      break;
    default:
      console.log('Usage: runbook-cli [daemon-start|daemon-stop|start|stop|restart|status] [services...]');
      console.log('Services:', Object.keys(SERVICES).join(', '));
      console.log('Daemon auto-proxies normal commands');
  }
}
