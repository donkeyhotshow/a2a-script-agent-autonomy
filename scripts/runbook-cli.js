#!/usr/bin/env node

import { spawn, execFileSync } from 'child_process';
import net from 'net';
import http from 'http';
import { URL } from 'url';
import fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { reservePort, releasePort } from './scripts/port-manager.js';

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
    startCmd: 'cd ../a2a-ai-hub && make dev', // Adjusted path if needed
    healthEndpoint: '/health',
    dependencies: ['runbook-status'],
    logfile: path.join(__dirname, '..', 'logs', 'ai-integration.log')
  },
  'a2a-server': {
    port: 3000,
    startCmd: 'cd ../a2a-server && npm run dev',
    healthEndpoint: '/health',
    dependencies: ['ai-integration'],
    logfile: path.join(__dirname, '..', 'a2a-server', 'logs', 'a2a-server.log')
  },
  'client-api': {
    port: 3001,
    startCmd: 'cd ../a2a-client && npm run dev',
    healthEndpoint: '/api/a2a/projects',
    dependencies: ['a2a-server'],
    logfile: path.join(__dirname, '..', 'a2a-client', 'logs', 'client-api.log')
  },
  'web-ui': {
    port: 5173,
    startCmd: 'cd ../a2a-client && npm run dev:web',
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

// ... rest same as previous version, abbreviate for brevity

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
      console.log('Usage: node tools/runbook/runbook-cli.js [daemon-start|daemon-stop|start|stop|restart|status] [services...]');
      console.log('Services:', Object.keys(SERVICES).join(', '));
      console.log('Status: curl http://localhost:3005/status');
  }
}

