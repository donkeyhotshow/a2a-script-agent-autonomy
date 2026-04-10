#!/usr/bin/env node

import { spawn, execFileSync, execSync } from 'child_process';
import net from 'net';
import http from 'http';
import { URL } from 'url';
import fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { reservePort, releasePort } from './port-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Configuration - hardcoded as requested
const SERVICES = {
  'runbook-status': {
    port: 3005,
    startCmd: '', // Managed by daemon
    healthEndpoint: '/health',
    dependencies: [],
    logfile: path.join(__dirname, '..', 'logs', 'runbook-status.log'),
    restartPolicy: {enabled: false}
  },

  'ai-integration': {
    port: 11434,
    startCmd: 'python scripts/ensure-providers-config.py && python -m uvicorn proxy.asgi:application --host 0.0.0.0 --port 11434',
    cwd: 'a2a-ai-hub',
    healthEndpoint: '/health',
    dependencies: ['runbook-status'],
    logfile: path.join(__dirname, '..', 'logs', 'ai-integration.log')
  },
  'a2a-server': {
    port: 3000,
    startCmd: 'npm run dev:no-auth',
    cwd: 'a2a-server',
    healthEndpoint: '/health',
    dependencies: ['ai-integration'],
    logfile: path.join(__dirname, '..', 'a2a-server', 'logs', 'server.log')
  },
  'client-api': {
    port: 3001,
    startCmd: 'npx cross-env PORT=3001 WS_PORT=3002 SKIP_AUTH=1 tsx watch src/server/index.ts',
    cwd: path.join('a2a-client', 'packages', 'sdk'),
    healthEndpoint: '/api/a2a/projects',
    dependencies: ['a2a-server'],
    logfile: path.join(__dirname, '..', 'a2a-client', 'logs', 'client-api.log')
  },
  'web-ui': {
    port: 5173,
    startCmd: 'npx vite --port 5173',
    cwd: 'a2a-client',
    healthEndpoint: '/api/a2a/projects',
    dependencies: ['client-api'],
    logfile: path.join(__dirname, '..', 'a2a-client', 'logs', 'web-ui.log')
  }
};

const PID_FILE = path.join(__dirname, '..', '.pids.txt');

// Daemon configs
Object.keys(SERVICES).forEach(key => {
  if (!SERVICES[key].restartPolicy) {
    SERVICES[key].restartPolicy = {enabled: true, maxRestarts: 5, delayMs: 10000};
  }
});
const DAEMON_PID_FILE = path.join(__dirname, '..', 'runbook-daemon.pid');
const LOCK_FILE = path.join(__dirname, '..', 'runbook-daemon.lock');
const STATE_FILE = path.join(__dirname, '..', 'runbook-state.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'runbook-daemon.log');
const IPC_PORT = 9999;
const MONITOR_INTERVAL = 30000; // 30s
let statusServer = null;

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
    return isPortOpen(3005); // Check status port occupied
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
          handleCommand(req.cmd, req.services || []).then(res => {
            socket.write(JSON.stringify(res) + '\n');
          }).catch(e => {
            socket.write(JSON.stringify({error: e.message}) + '\n');
          });
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
        const status = [];
        const oldLog = log;
        const oldCurrentLog = currentLog;
        currentLog = (msg) => status.push(msg);
        showStatus();
        currentLog = oldCurrentLog;
        log = oldLog;
        return {status: 'ok', data: status};
      case 'shutdown':
        process.exit(0);
        return {status: 'shutting down'};
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
    if (serviceName === 'runbook-status') continue;
    const service = SERVICES[serviceName];
    const serviceState = state.services[serviceName] || {restarts: 0, healthy: false};
    if (!serviceState.healthy && service.restartPolicy.enabled && serviceState.restarts < service.restartPolicy.maxRestarts) {
      log(`Restarting ${serviceName} (attempt ${serviceState.restarts + 1})`);
      serviceState.restarts++;
      stopService(serviceName);
      setTimeout(() => {
        startService(serviceName).then(() => serviceState.healthy = true).catch(() => serviceState.healthy = false);
      }, service.restartPolicy.delayMs || 5000);
    }
    state.services[serviceName] = serviceState;
  }
  writeState(state);
  return state;
}

function shutdown() {
  log('Shutting down daemon...');
  if (statusServer) {
    statusServer.close(() => log('Status server closed'));
    releasePort(3005);
  }
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

  // Reserve port 3005
  if (!reservePort(3005, 'runbook-status')) {
    log('ERROR: Failed to reserve port 3005');
    releaseLock();
    return false;
  }
  log('Port 3005 reserved');

  // Status server
  statusServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end();
      return;
    }
    const reqUrl = new URL(req.url, `http://localhost:3005`);
    const state = readState();
    const running = getRunningServices();
    let statusCode = 200;
    let body = {};
    if (reqUrl.pathname === '/health') {
      body = 'OK';
    } else if (reqUrl.pathname === '/status') {
      body = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        daemonPid: process.pid,
        services: Object.keys(SERVICES).map(name => ({
          name,
          port: SERVICES[name].port,
          pid: running[name],
          healthy: !!state.services[name]?.healthy,
          logfile: SERVICES[name].logfile
        })),
        pids: running
      };
    } else {
      statusCode = 404;
      body = 'Not Found';
    }
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body, null, 2));
  });

  statusServer.listen(3005, '127.0.0.1', () => {
    log('✓ Runbook status server on http://localhost:3005');
  }).on('error', (err) => {
    log('Status server error: ' + err.message);
    releasePort(3005);
    releaseLock();
  });

  state.services['runbook-status'] = { healthy: true, restarts: 0 };
  writeState(state);

  // IPC
  daemonServer = net.createServer(handleIPC);
  daemonServer.listen(IPC_PORT, '127.0.0.1', () => {
    log(`IPC server on localhost:${IPC_PORT}`);
  });

  const monitorInt = setInterval(monitorServices, MONITOR_INTERVAL);

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('uncaughtException', (e) => {
    log('Uncaught: ' + e.message);
    shutdown();
  });

  return true;
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const client = net.createConnection(port, '127.0.0.1', () => {
      client.end();
      resolve(true);
    });
    client.on('error', () => resolve(false));
    setTimeout(() => {
      client.end();
      resolve(false);
    }, 1000);
  });
}

async function checkHealth(serviceName) {
  const service = SERVICES[serviceName];
  const url = `http://localhost:${service.port}${service.healthEndpoint}`;
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    setTimeout(() => {
      req.destroy();
      resolve(false);
    }, 5000);
  });
}

function getRunningServices() {
  if (!fs.existsSync(PID_FILE)) return {};
  const pids = fs.readFileSync(PID_FILE, 'utf8').split('\n').filter(line => line.trim());
  const running = {};
  pids.forEach(line => {
    const [name, pid] = line.split(':');
    if (name && pid) {
      running[name] = parseInt(pid);
    }
  });
  return running;
}

function savePid(serviceName, pid) {
  const running = getRunningServices();
  running[serviceName] = pid;
  const lines = Object.entries(running).map(([name, p]) => `${name}:${p}`);
  fs.writeFileSync(PID_FILE, lines.join('\n'));
}

function killProcess(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    setTimeout(() => {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }, 5000);
  } catch {}
}

function escapePowerShellSingleQuote(value) {
  return value.replace(/'/g, "''");
}

function buildPowerShellStartArgs(service) {
  const cwd = path.resolve(__dirname, '..', service.cwd || '.');
  const logfile = path.resolve(service.logfile);
  const command = service.startCmd;
  const psCommand = `
    $ErrorActionPreference = 'Stop';
    $cwd = '${escapePowerShellSingleQuote(cwd)}';
    $log = '${escapePowerShellSingleQuote(logfile)}';
    Set-Location -LiteralPath $cwd;
    $cmdWithRedirect = '${escapePowerShellSingleQuote(command)} >> "$log" 2>&1';
    $args = @('/c', $cmdWithRedirect);
    $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList $args -PassThru;
    Write-Output $proc.Id;
  `;
  return ['powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand]];
}

async function startService(serviceName) {
  const service = SERVICES[serviceName];
  if (!service.startCmd.trim()) {
    log(`${serviceName} has no start command, skipping`);
    return true;
  }
  log(`Starting ${serviceName}...`);
  fs.mkdirSync(path.dirname(service.logfile), { recursive: true });

  if (process.platform === 'win32') {
    const [cmd, args] = buildPowerShellStartArgs(service);
    const child = spawn(cmd, args, {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    let output = '';
    let errorOutput = '';
    child.stdout.on('data', (data) => { output += data.toString(); });
    child.stderr.on('data', (data) => { errorOutput += data.toString(); });

    const exitCode = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', resolve);
    });

    if (exitCode !== 0) {
      log(`✗ ${serviceName} failed to launch PowerShell wrapper: ${errorOutput.trim() || `exit ${exitCode}`}`);
      return false;
    }

    const pid = parseInt(output.trim(), 10);
    if (!Number.isInteger(pid) || pid <= 0) {
      log(`✗ ${serviceName} PowerShell wrapper did not return a PID: ${output.trim()}`);
    }
  } else {
    spawn(service.startCmd, { shell: true, stdio: 'inherit', cwd: path.resolve(__dirname, '..', service.cwd || '.') });
  }

  // Wait for port and health
  let healthy = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await checkHealth(serviceName)) {
      healthy = true;
      break;
    }
  }

  // Capture PID from netstat after service binds
  if (healthy) {
    try {
      const netstat = execSync(`netstat -ano | findstr :${service.port} | findstr LISTENING`, { encoding: 'utf8' });
      const lines = netstat.trim().split('\n');
      if (lines.length > 0) {
        const parts = lines[0].trim().split(/\s+/);
        const listeningPid = parseInt(parts[4]);
        if (listeningPid) savePid(serviceName, listeningPid);
      }
    } catch (e) {
      // Ignore if the process has not yet bound to the port
    }
  }

  if (healthy) {
    log(`✓ ${serviceName} started`);
  } else {
    log(`✗ ${serviceName} failed to start - check logs: ${service.logfile}`);
  }
  return healthy;
}

async function startServiceCli(serviceName) {
  const service = SERVICES[serviceName];
  if (!service.startCmd.trim()) {
    log(`${serviceName} has no start command, skipping`);
    return;
  }
  if (await checkHealth(serviceName)) {
    log(`${serviceName} already running`);
    return;
  }
  const healthy = await startService(serviceName);
  if (!healthy) {
    log(`✗ ${serviceName} failed to start - check logs: ${service.logfile}`);
    process.exit(1);
  }
}

function stopService(serviceName) {
  const running = getRunningServices();
  const pid = running[serviceName];
  if (pid) {
    killProcess(pid);
    delete running[serviceName];
    const lines = Object.entries(running).map(([name, p]) => `${name}:${p}`);
    fs.writeFileSync(PID_FILE, lines.join('\n'));
    log(`${serviceName} stopped`);
  }
}

function getDependencyOrder(services) {
  const order = [];
  const visited = new Set();
  const visiting = new Set();
  function dfs(name) {
    if (visiting.has(name)) throw new Error('Cycle');
    if (visited.has(name)) return;
    visiting.add(name);
    const deps = SERVICES[name].dependencies || [];
    deps.forEach(dfs);
    visiting.delete(name);
    visited.add(name);
    order.push(name);
  }
  services.forEach(dfs);
  return order;
}

async function startCommand(services) {
  const allServices = services.length ? services : Object.keys(SERVICES);
  const order = getDependencyOrder(allServices);
  const failures = [];
  for (const name of order) {
    const success = await startService(name);
    if (!success) failures.push(name);
  }
  if (failures.length > 0) {
    throw new Error(`Services failed to start: ${failures.join(', ')}`);
  }
}

async function startCommandCli(services) {
  const allServices = services.length ? services : Object.keys(SERVICES);
  const order = getDependencyOrder(allServices);
  for (const name of order) {
    await startServiceCli(name);
  }
}

function stopCommand(services) {
  const allServices = services.length ? services : Object.keys(SERVICES);
  const running = getRunningServices();
  allServices.forEach(name => {
    if (running[name]) {
      stopService(name);
    }
  });
}

function showStatus() {
  const running = getRunningServices();
  Object.keys(SERVICES).forEach(name => {
    const pid = running[name];
    const status = pid ? 'running' : 'stopped';
    log(`${name}: ${status} (port ${SERVICES[name].port}, pid ${pid || 'N/A'})`);
  });
}

async function proxyCommand(command, serviceArgs) {
  if (!isDaemonRunning()) throw new Error('Daemon not running');
  const res = await sendIPCCommand({cmd: command, services: serviceArgs});
  if (res.error) throw new Error(res.error);
  return res;
}

// isPortOpen, checkHealth, getRunningServices, savePid, killProcess, startService, stopService, getDependencyOrder, startCommand, stopCommand, showStatus same as previous

// Main CLI same, with updated paths for cd ../a2a-*

const args = process.argv.slice(2);
const command = args[0];
const serviceArgs = args.slice(1);

if (command === 'daemon-start') {
  runDaemon();
} else if (command === 'daemon-stop') {
  if (isDaemonRunning()) {
    sendIPCCommand({cmd: 'shutdown'}).catch(e => log('Shutdown proxy error: ' + e.message));
  } else {
    log('No daemon running');
  }
} else if (command && isDaemonRunning()) {
  proxyCommand(command, serviceArgs).then(() => {}).catch(e => cliLog('Proxy error: ' + e.message));
} else {
  switch (command) {
    case 'start':
      startCommandCli(serviceArgs).catch(e => {
        cliLog('Start failed: ' + e.message);
        process.exit(1);
      });
      break;
    case 'stop':
      stopCommand(serviceArgs);
      break;
    case 'restart':
      stopCommand(serviceArgs);
      setTimeout(() => {
        startCommandCli(serviceArgs).catch(e => {
          cliLog('Restart failed: ' + e.message);
          process.exit(1);
        });
      }, 2000);
      break;
    case 'status':
      showStatus();
      break;
    default:
      console.log('Usage: node tools/runbook/runbook-cli.js [daemon-start|daemon-stop|start|stop|restart|status] [services...]');
      console.log('Services:', Object.keys(SERVICES).join(', '));
      console.log('Status: curl http://localhost:3005/status');
  }
}

